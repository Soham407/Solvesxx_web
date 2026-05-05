"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { StockLevel } from "@/src/types/operations";
import { sendReorderAlertNotification } from "@/src/lib/notifications";
import { buildReorderPlans } from "@/src/lib/inventory/reorderAlertPlanning";

interface ReorderAlert {
  id: string;
  productId: string | null;
  productName: string | null;
  productCode: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  alertType: "low_stock" | "out_of_stock";
  priority: "critical" | "high" | "medium" | "low";
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

interface UseReorderAlertsState {
  alerts: ReorderAlert[];
  unacknowledgedCount: number;
  criticalAlerts: ReorderAlert[];
  isLoading: boolean;
  error: string | null;
}

interface UseReorderAlertsReturn extends UseReorderAlertsState {
  acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; error?: string }>;
  acknowledgeAll: () => Promise<{ success: boolean; error?: string }>;
  createPurchaseOrderFromAlert: (alertIds: string[]) => Promise<{
    success: boolean;
    error?: string;
    warning?: string;
    poId?: string;
    poIds?: string[];
  }>;
  refresh: () => void;
  getAlertsByWarehouse: (warehouseId: string) => ReorderAlert[];
  getCriticalAlerts: () => ReorderAlert[];
}

interface ManagerRow {
  auth_user_id: string | null;
}

interface SupplierProductRow {
  supplier_product_id: string;
  supplier_id: string;
  product_id: string;
  suppliers: {
    supplier_name: string | null;
    supplier_code: string | null;
  } | null;
}

interface SupplierRateRow {
  supplier_product_id: string;
  rate: number | null;
}

/**
 * Hook for managing automated reorder alerts
 * Displays alerts when stock falls below reorder level
 */
export function useReorderAlerts(warehouseId?: string): UseReorderAlertsReturn {
  const [state, setState] = useState<UseReorderAlertsState>({
    alerts: [],
    unacknowledgedCount: 0,
    criticalAlerts: [],
    isLoading: true,
    error: null,
  });
  // Track which alert IDs have already triggered a push notification this session
  const notifiedAlertIds = useRef<Set<string>>(new Set());

  // Fetch reorder alerts from stock_levels view
  const fetchAlerts = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch stock levels that need reorder
      let query = supabase
        .from("stock_levels")
        .select("*")
        .eq("needs_reorder", true);

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      }

      const { data: stockData, error: stockError } = await query;

      if (stockError) throw stockError;

      // Transform stock levels into alerts
      const alerts: ReorderAlert[] = (stockData || []).map((stock: StockLevel) => ({
        id: `${stock.product_id || 'unknown'}-${stock.warehouse_id || 'unknown'}`,
        productId: stock.product_id ?? null,
        productName: stock.product_name ?? null,
        productCode: stock.product_code ?? null,
        warehouseId: stock.warehouse_id ?? null,
        warehouseName: stock.warehouse_name ?? null,
        currentStock: Number(stock.total_quantity) || 0,
        reorderLevel: stock.reorder_level ? Number(stock.reorder_level) : 0,
        suggestedQuantity: calculateSuggestedQuantity(stock),
        alertType: Number(stock.total_quantity) === 0 ? "out_of_stock" : "low_stock",
        priority: Number(stock.total_quantity) === 0 ? "critical" : "high",
        createdAt: new Date().toISOString(),
        acknowledged: false,
      }));

      const criticalAlerts = alerts.filter((a) => a.alertType === "out_of_stock");
      const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

      setState({
        alerts,
        unacknowledgedCount,
        criticalAlerts,
        isLoading: false,
        error: null,
      });

      // Send push notifications for newly detected alerts (not previously notified this session)
      const newAlerts = alerts.filter((a) => !notifiedAlertIds.current.has(a.id));
      if (newAlerts.length > 0) {
        try {
          // Fetch manager/admin employees using the same pattern as usePanicAlert
          const { data: managers } = await supabase
            .from("employees")
            .select("auth_user_id, designations!inner(designation_name)")
            .or(
              "designation_name.eq.Admin,designation_name.eq.Security Supervisor,designation_name.eq.Society Manager,designation_name.eq.Company HOD",
              { referencedTable: "designations" }
            )
            .eq("is_active", true);

          const managerIds = (managers || [])
            .map((m: ManagerRow) => m.auth_user_id)
            .filter((authUserId): authUserId is string => Boolean(authUserId));

          if (managerIds.length > 0) {
            for (const alert of newAlerts) {
              if (alert.productName) {
                await sendReorderAlertNotification(managerIds, alert.productName, alert.alertType);
              }
              notifiedAlertIds.current.add(alert.id);
            }
          } else {
            // Still mark as notified to avoid repeated queries with no recipients
            newAlerts.forEach((a) => notifiedAlertIds.current.add(a.id));
          }
        } catch (notifErr) {
          console.error("Failed to send reorder alert notification:", notifErr);
          // Non-blocking — mark as notified so we don't spam on next fetch
          newAlerts.forEach((a) => notifiedAlertIds.current.add(a.id));
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch reorder alerts";
      console.error("Error fetching reorder alerts:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [warehouseId]);

  // Calculate suggested reorder quantity
  const calculateSuggestedQuantity = (stock: StockLevel): number => {
    const current = Number(stock.total_quantity);
    const reorderLevel = stock.reorder_level ? Number(stock.reorder_level) : 10;
    
    // Suggest 2x reorder level or minimum 10 units
    const suggested = Math.max(reorderLevel * 2 - current, 10);
    return Math.ceil(suggested);
  };

  // Acknowledge a single alert
  const acknowledgeAlert = useCallback(
    async (alertId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // In a real implementation, you would update a reorder_alerts table
        // For now, we'll update the local state
        setState((prev) => ({
          ...prev,
          alerts: prev.alerts.map((a) =>
            a.id === alertId
              ? {
                  ...a,
                  acknowledged: true,
                  acknowledgedAt: new Date().toISOString(),
                }
              : a
          ),
          unacknowledgedCount: Math.max(0, prev.unacknowledgedCount - 1),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to acknowledge alert";
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Acknowledge all alerts
  const acknowledgeAll = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setState((prev) => ({
        ...prev,
        alerts: prev.alerts.map((a) =>
          !a.acknowledged
            ? {
                ...a,
                acknowledged: true,
                acknowledgedAt: new Date().toISOString(),
              }
            : a
        ),
        unacknowledgedCount: 0,
      }));

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to acknowledge alerts";
      return { success: false, error: errorMessage };
    }
  }, []);

  // Create purchase order from alerts
  // NOTE: purchase_orders and purchase_order_items tables not yet created - this is a placeholder
  const createPurchaseOrderFromAlert = useCallback(
    async (alertIds: string[]): Promise<{
      success: boolean;
      error?: string;
      warning?: string;
      poId?: string;
      poIds?: string[];
    }> => {
      try {
        const selectedAlerts = state.alerts.filter((a) => alertIds.includes(a.id));
        
        if (selectedAlerts.length === 0) {
          return { success: false, error: "No alerts selected" };
        }

        const productIds = Array.from(
          new Set(
            selectedAlerts
              .map((alert) => alert.productId)
              .filter((productId): productId is string => Boolean(productId))
          )
        );

        if (productIds.length === 0) {
          return {
            success: false,
            error: "Selected alerts do not have product references.",
          };
        }

        const { data: supplierProducts, error: supplierProductsError } = await supabase
          .from("supplier_products")
          .select(`
            supplier_product_id:id,
            supplier_id,
            product_id,
            suppliers!supplier_id (
              supplier_name,
              supplier_code
            )
          `)
          .in("product_id", productIds);

        if (supplierProductsError) throw supplierProductsError;

        const typedSupplierProducts = (supplierProducts || []) as SupplierProductRow[];
        const { data: supplierRates, error: supplierRatesError } = await supabase
          .from("supplier_rates")
          .select("supplier_product_id, rate")
          .eq("is_active", true)
          .in(
            "supplier_product_id",
            typedSupplierProducts.map((row) => row.supplier_product_id)
          );

        if (supplierRatesError) throw supplierRatesError;

        const typedSupplierRates = (supplierRates || []) as SupplierRateRow[];
        const { groups, unmappedAlerts } = buildReorderPlans({
          alerts: selectedAlerts.map((alert) => ({
            id: alert.id,
            productId: alert.productId,
            productName: alert.productName,
            productCode: alert.productCode,
            warehouseName: alert.warehouseName,
            suggestedQuantity: alert.suggestedQuantity,
          })),
          supplierProducts: typedSupplierProducts.map((row) => ({
            supplier_product_id: row.supplier_product_id,
            supplier_id: row.supplier_id,
            product_id: row.product_id,
            suppliers: row.suppliers,
          })),
          supplierRates: typedSupplierRates.map((rate) => ({
            supplier_product_id: rate.supplier_product_id,
            rate: rate.rate,
            discount_percentage: null,
            gst_percentage: null,
          })),
        });

        if (groups.length === 0) {
          return {
            success: false,
            error:
              "No supplier contract exists for the selected alerts. Open purchase orders and create a manual draft PO.",
          };
        }

        const poIds: string[] = [];

        for (const group of groups) {
          const { data: po, error: poError } = await supabase
            .from("purchase_orders")
            .insert({
              supplier_id: group.supplierId,
              po_date: new Date().toISOString().split("T")[0],
              status: "draft",
              notes: `Auto-created from reorder alerts for ${group.supplierName}`,
            })
            .select("id, po_number")
            .single();

          if (poError) throw poError;

          for (const item of group.items) {
            const { error: itemError } = await supabase
              .from("purchase_order_items")
              .insert({
                purchase_order_id: po.id,
                product_id: item.productId,
                item_description: item.itemDescription,
                ordered_quantity: item.quantity,
                unit_of_measure: "pcs",
                unit_price: item.unitPrice,
                tax_rate: item.taxRate,
                tax_amount: item.taxAmount,
                discount_percent: item.discountPercent,
                discount_amount: item.discountAmount,
                line_total: item.lineTotal,
                unmatched_qty: item.quantity,
                unmatched_amount: item.lineTotal,
                notes: `Auto-created from reorder alert for ${item.warehouseName || "unknown warehouse"}`,
              });

            if (itemError) throw itemError;
          }

          await Promise.all(group.alerts.map((alert) => acknowledgeAlert(alert.id)));
          poIds.push(po.id);
        }

        await fetchAlerts();

        return {
          success: true,
          poId: poIds[0],
          poIds,
          warning:
            unmappedAlerts.length > 0
              ? `${unmappedAlerts.length} alert(s) had no supplier mapping and were left for manual follow-up.`
              : undefined,
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create purchase order";
        console.error("Error creating PO from alerts:", err);
        return { success: false, error: errorMessage };
      }
    },
    [state.alerts, acknowledgeAlert, fetchAlerts]
  );

  // Get alerts filtered by warehouse
  const getAlertsByWarehouse = useCallback(
    (warehouseId: string): ReorderAlert[] => {
      return state.alerts.filter((a) => a.warehouseId === warehouseId);
    },
    [state.alerts]
  );

  // Get only critical (out of stock) alerts
  const getCriticalAlerts = useCallback((): ReorderAlert[] => {
    return state.alerts.filter((a) => a.alertType === "out_of_stock" && !a.acknowledged);
  }, [state.alerts]);

  // Refresh alerts
  const refresh = useCallback(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Initialize on mount
  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription for stock changes
    const channel = supabase
      .channel("stock-levels-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_batches",
        },
        () => {
          // Refresh alerts when stock batches change
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchAlerts]);

  return {
    ...state,
    acknowledgeAlert,
    acknowledgeAll,
    createPurchaseOrderFromAlert,
    refresh,
    getAlertsByWarehouse,
    getCriticalAlerts,
  };
}

export type { ReorderAlert };

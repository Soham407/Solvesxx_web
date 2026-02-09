"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { StockLevel } from "@/src/types/phaseB";

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
  createPurchaseOrderFromAlert: (alertIds: string[]) => Promise<{ success: boolean; error?: string; poId?: string }>;
  refresh: () => void;
  getAlertsByWarehouse: (warehouseId: string) => ReorderAlert[];
  getCriticalAlerts: () => ReorderAlert[];
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
    async (alertIds: string[]): Promise<{ success: boolean; error?: string; poId?: string }> => {
      try {
        const selectedAlerts = state.alerts.filter((a) => alertIds.includes(a.id));
        
        if (selectedAlerts.length === 0) {
          return { success: false, error: "No alerts selected" };
        }

        // TODO: Implement when purchase_orders table is created
        // For now, just acknowledge the alerts
        await Promise.all(alertIds.map((id) => acknowledgeAlert(id)));

        // Return a placeholder response
        return { 
          success: false, 
          error: "Purchase order functionality not yet implemented. Please create orders manually."
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create purchase order";
        console.error("Error creating PO from alerts:", err);
        return { success: false, error: errorMessage };
      }
    },
    [state.alerts, acknowledgeAlert]
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

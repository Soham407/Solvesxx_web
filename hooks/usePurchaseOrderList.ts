"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { POStatus, PurchaseOrder, PO_STATUS_CONFIG } from "./usePurchaseOrders";

/**
 * Hook for fetching and managing a list of Purchase Orders.
 * Extracted from usePurchaseOrders to improve maintainability.
 */
export function usePurchaseOrderList(filters?: { status?: POStatus; supplierId?: string }) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    draftCount: 0,
    sentCount: 0,
    receivedCount: 0,
    overdueCount: 0,
    totalValue: 0,
  });

  const fetchPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers:supplier_id (supplier_name, supplier_code),
          indents:indent_id (indent_number)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.supplier_name,
        supplier_code: po.suppliers?.supplier_code,
        indent_number: po.indents?.indent_number,
      }));

      setPurchaseOrders(formattedData);
      
      // Calculate summary
      const stats = formattedData.reduce((acc, po) => {
        acc.total++;
        if (po.status === "draft") acc.draftCount++;
        if (po.status === "sent_to_vendor") acc.sentCount++;
        if (po.status === "received") acc.receivedCount++;
        acc.totalValue += (po.grand_total || 0);
        
        // Check for overdue (not received and past expected delivery)
        if (po.status !== "received" && po.status !== "cancelled" && po.expected_delivery_date) {
            if (new Date(po.expected_delivery_date) < new Date()) {
                acc.overdueCount++;
            }
        }
        
        return acc;
      }, {
        total: 0,
        draftCount: 0,
        sentCount: 0,
        receivedCount: 0,
        overdueCount: 0,
        totalValue: 0,
      });

      setSummary(stats);

    } catch (err: any) {
      console.error("Error fetching purchase orders:", err);
      setError(err.message || "Failed to fetch purchase orders");
    } finally {
      setIsLoading(false);
    }
  }, [filters?.status, filters?.supplierId]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  return {
    purchaseOrders,
    isLoading,
    error,
    summary,
    refresh: fetchPurchaseOrders,
    PO_STATUS_CONFIG,
  };
}

export default usePurchaseOrderList;

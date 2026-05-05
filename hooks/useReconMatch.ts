"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { 
  ReconciliationStatus, 
  Reconciliation, 
  ReconciliationLine,
  RECONCILIATION_STATUS_CONFIG,
  LINE_STATUS_CONFIG
} from "./useReconciliation";

/**
 * Hook for reconciling documents and viewing the matching results.
 * Extracted from useReconciliation to improve maintainability.
 */
export function useReconMatch(filters?: {
  status?: ReconciliationStatus;
  billId?: string;
  poId?: string;
  grnId?: string;
}) {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReconciliations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("reconciliations")
        .select(`
          *,
          purchase_bills (bill_number, suppliers (supplier_name)),
          purchase_orders (po_number),
          material_receipts (grn_number)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.billId) query = query.eq("purchase_bill_id", filters.billId);
      if (filters?.poId) query = query.eq("purchase_order_id", filters.poId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setReconciliations((data || []).map((row) => {
        const r = row as {
          purchase_bills?: {
            bill_number: string | null;
            suppliers?: { supplier_name: string | null } | null;
          } | null;
          purchase_orders?: { po_number: string | null } | null;
          material_receipts?: { grn_number: string | null } | null;
        };

        return {
          ...(row as Reconciliation),
          bill_number: r.purchase_bills?.bill_number,
          po_number: r.purchase_orders?.po_number,
          grn_number: r.material_receipts?.grn_number,
          supplier_name: r.purchase_bills?.suppliers?.supplier_name,
        };
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reconciliations");
    } finally {
      setIsLoading(false);
    }
  }, [filters?.status, filters?.billId, filters?.poId]);

  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  const executeManualMatch = async (reconId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: rpcError } = await supabase.rpc("execute_reconciliation_match", {
        p_reconciliation_id: reconId,
        p_user_id: user?.id,
      });
      if (rpcError) throw rpcError;
      fetchReconciliations();
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute manual match");
      return null;
    }
  };

  return {
    reconciliations,
    isLoading,
    error,
    executeManualMatch,
    refresh: fetchReconciliations,
    RECONCILIATION_STATUS_CONFIG,
  };
}

export default useReconMatch;

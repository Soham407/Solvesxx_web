"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { 
  Reconciliation, 
  ReconciliationLine, 
  ResolveDiscrepancyInput,
  RECONCILIATION_STATUS_CONFIG,
  LINE_STATUS_CONFIG,
  DISCREPANCY_TYPE_CONFIG,
  RESOLUTION_ACTION_CONFIG
} from "./useReconciliation";
import { mapReconciliationLineRows, type ReconciliationLineJoinRow } from "@/src/lib/reconciliation/reconciliationTransforms";

/**
 * Hook for auditing reconciliation lines and performing resolution actions.
 * Extracted from useReconciliation to improve maintainability.
 */
export function useReconAudit(reconciliationId?: string) {
  const [lines, setLines] = useState<ReconciliationLine[]>([]);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch lines
      const { data: lineData, error: linesError } = await supabase
        .from("reconciliation_lines")
        .select(`
          *,
          products (product_name, product_code)
        `)
        .eq("reconciliation_id", id);

      if (linesError) throw linesError;
      setLines(mapReconciliationLineRows((lineData || []) as ReconciliationLineJoinRow[]));

      // Fetch recon summary
      const { data: recon, error: reconError } = await supabase
        .from("reconciliations")
        .select("*")
        .eq("id", id)
        .single();

      if (reconError) throw reconError;
      setReconciliation(recon as Reconciliation);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reconciliation audit data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (reconciliationId) {
      fetchAuditData(reconciliationId);
    }
  }, [reconciliationId, fetchAuditData]);

  const resolveLine = async (lineId: string, input: ResolveDiscrepancyInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from("reconciliation_lines")
        .update({
          status: "resolved",
          resolution_notes: input.resolution_notes,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          // If adjusted_amount is provided, it would need a backend function to update parent recon
        })
        .eq("id", lineId);

      if (updateError) throw updateError;
      if (reconciliationId) fetchAuditData(reconciliationId);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve line");
      return false;
    }
  };

  const finalizeReconciliation = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from("reconciliations")
        .update({ status: "resolved" })
        .eq("id", id);
        
      if (updateError) throw updateError;
      if (reconciliationId === id) fetchAuditData(id);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to finalize reconciliation");
      return false;
    }
  };

  return {
    reconciliation,
    lines,
    isLoading,
    error,
    resolveLine,
    finalizeReconciliation,
    refresh: () => reconciliationId && fetchAuditData(reconciliationId),
    LINE_STATUS_CONFIG,
    DISCREPANCY_TYPE_CONFIG,
    RESOLUTION_ACTION_CONFIG
  };
}

export default useReconAudit;

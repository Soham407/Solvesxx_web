"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { formatCurrency, toRupees } from "@/src/lib/utils/currency";
import {
  exportRowsToCsv,
  mapComplianceSnapshotRow,
  type AgingBucket,
  type ComplianceSnapshot,
  type ComplianceSnapshotRow,
} from "@/src/lib/compliance/complianceTransforms";

export type {
  AgingBucket,
  ComplianceSnapshot,
} from "@/src/lib/compliance/complianceTransforms";

export function useCompliance() {
  const [snapshots, setSnapshots] = useState<ComplianceSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("compliance_snapshots")
        .select(`
          *,
          financial_periods!period_id (
            period_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSnapshots(((data || []) as ComplianceSnapshotRow[]).map(mapComplianceSnapshotRow));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch compliance snapshots");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMonthlySnapshot = useCallback(async (periodId: string, name: string) => {
    try {
      setIsLoading(true);
      
      // 1. Gather Truth Data
      const { data: saleBills } = await supabase.from("sale_bills").select("total_amount, paid_amount, due_amount");
      const { data: purchaseBills } = await supabase.from("purchase_bills").select("total_amount, paid_amount, due_amount");
      const { data: payments } = await supabase.from("payments").select("amount, payment_type");
      const { data: recons } = await supabase.from("reconciliations").select("id").neq("status", "resolved");

      const totalInvoices = (saleBills || []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalCollections = (payments || []).filter(p => p.payment_type === 'receipt').reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalBills = (purchaseBills || []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalPayouts = (payments || []).filter(p => p.payment_type === 'payout').reduce((sum, p) => sum + (p.amount || 0), 0);
      const unresolvedRecons = (recons || []).length;

      // 2. Persist Snapshot (Locked)
      const { data: snapshot, error: snapshotError } = await supabase
        .from("compliance_snapshots")
        .insert({
          period_id: periodId,
          snapshot_name: name,
          total_invoices_amount: totalInvoices,
          total_collections_amount: totalCollections,
          total_bills_amount: totalBills,
          total_payouts_amount: totalPayouts,
          unresolved_reconciliations_count: unresolvedRecons,
          data_payload: {
            sale_bills_count: saleBills?.length || 0,
            purchase_bills_count: purchaseBills?.length || 0,
            generated_at: new Date().toISOString()
          },
          is_locked: true
        })
        .select()
        .single();

      if (snapshotError) throw snapshotError;

      await fetchSnapshots();
      return snapshot;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create monthly snapshot");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSnapshots]);

  const exportToCSV = exportRowsToCsv;

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return {
    snapshots,
    isLoading,
    error,
    createMonthlySnapshot,
    exportToCSV,
    refresh: fetchSnapshots
  };
}

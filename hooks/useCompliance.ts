// @ts-nocheck
"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { formatCurrency, toRupees } from "@/src/lib/utils/currency";

export interface ComplianceSnapshot {
  id: string;
  period_id: string;
  snapshot_name: string;
  snapshot_date: string;
  total_invoices_amount: number;
  total_collections_amount: number;
  total_bills_amount: number;
  total_payouts_amount: number;
  unresolved_reconciliations_count: number;
  data_payload: any;
  is_locked: boolean;
  created_at: string;
  // Joined
  period_name?: string;
}

export interface AgingBucket {
  label: string;
  buyer_amount: number;
  supplier_amount: number;
  count: number;
}

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

      setSnapshots((data || []).map(s => ({
        ...s,
        period_name: s.financial_periods?.period_name
      })));
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSnapshots]);

  const exportToCSV = (filename: string, data: any[], headers: string[]) => {
    if (!data || !data.length) return;

    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => {
        const val = row[header];
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchCurrentPeriodId = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("financial_periods")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data?.id ?? null;
    } catch (err) {
      console.error("fetchCurrentPeriodId error:", err);
      return null;
    }
  }, []);

  const fetchSaleBillsForExport = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sale_bills")
        .select(`invoice_number, clients!client_id (client_name), total_amount, due_amount, status, bill_date, due_date`);
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("fetchSaleBillsForExport error:", err);
      return [];
    }
  }, []);

  const fetchPurchaseBillsForExport = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_bills")
        .select(`bill_number, suppliers!supplier_id (supplier_name), total_amount, due_amount, status, bill_date, due_date`);
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("fetchPurchaseBillsForExport error:", err);
      return [];
    }
  }, []);

  const fetchOutstandingBillsWithAging = useCallback(async () => {
    try {
      const [{ data: sales }, { data: purchases }] = await Promise.all([
        supabase.from("sale_bills").select(`invoice_number, clients!client_id(client_name), due_amount, due_date`).gt("due_amount", 0),
        supabase.from("purchase_bills").select(`bill_number, suppliers!supplier_id(supplier_name), due_amount, due_date`).gt("due_amount", 0),
      ]);
      return { sales: sales ?? [], purchases: purchases ?? [] };
    } catch (err) {
      console.error("fetchOutstandingBillsWithAging error:", err);
      return { sales: [], purchases: [] };
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return {
    snapshots,
    isLoading,
    error,
    createMonthlySnapshot,
    exportToCSV,
    fetchCurrentPeriodId,
    fetchSaleBillsForExport,
    fetchPurchaseBillsForExport,
    fetchOutstandingBillsWithAging,
    refresh: fetchSnapshots
  };
}

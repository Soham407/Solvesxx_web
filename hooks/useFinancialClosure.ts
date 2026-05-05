"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  selectCurrentFinancialPeriod,
  type FinancialPeriod,
  type FinancialPeriodStatus,
  type FinancialPeriodType,
} from "@/src/lib/financial-closure/financialClosureTransforms";

export type {
  FinancialPeriod,
  FinancialPeriodStatus,
  FinancialPeriodType,
} from "@/src/lib/financial-closure/financialClosureTransforms";

interface UseFinancialClosureState {
  periods: FinancialPeriod[];
  currentPeriod: FinancialPeriod | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function useFinancialClosure() {
  const [state, setState] = useState<UseFinancialClosureState>({
    periods: [],
    currentPeriod: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH FINANCIAL PERIODS
  // ============================================
  const fetchPeriods = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as FinancialPeriod[];
      const current = selectCurrentFinancialPeriod(typedData);

      setState((prev) => ({
        ...prev,
        periods: (data || []) as FinancialPeriod[],
        currentPeriod: current,
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching financial periods:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch financial periods",
      }));
    }
  }, []);

  // ============================================
  // CREATE FINANCIAL PERIOD
  // ============================================
  const createPeriod = useCallback(async (input: Omit<FinancialPeriod, "id" | "closed_at" | "closed_by" | "closing_notes" | "created_at" | "updated_at" | "status">) => {
    try {
      const { data, error } = await supabase
        .from("financial_periods")
        .insert({
          ...input,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPeriods();
      return data as FinancialPeriod;
    } catch (err: unknown) {
      console.error("Error creating financial period:", err);
      setState((prev) => ({ ...prev, error: err instanceof Error ? err.message : "Failed to create financial period" }));
      return null;
    }
  }, [fetchPeriods]);

  // ============================================
  // CLOSE PERIOD Workflow
  // ============================================
  const closePeriod = useCallback(async (periodId: string, notes: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // 1. Mark as 'closing' first (optional step if multi-stage)
      // 2. Mark as 'closed'
      const { data, error } = await supabase
        .from("financial_periods")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: (await supabase.auth.getUser()).data.user?.id,
          closing_notes: notes,
        })
        .eq("id", periodId)
        .select()
        .single();

      if (error) throw error;

      await fetchPeriods();
      return data as FinancialPeriod;
    } catch (err: unknown) {
      console.error("Error closing period:", err);
      setState((prev) => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : "Failed to close financial period" }));
      return null;
    }
  }, [fetchPeriods]);

  // ============================================
  // INITIAL FETCH
  // ============================================
  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  return {
    ...state,
    fetchPeriods,
    createPeriod,
    closePeriod,
    refresh: fetchPeriods,
  };
}

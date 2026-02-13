"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

export type FinancialPeriodType = "monthly" | "quarterly" | "yearly";
export type FinancialPeriodStatus = "open" | "closing" | "closed";

export interface FinancialPeriod {
  id: string;
  period_name: string;
  period_type: FinancialPeriodType;
  start_date: string;
  end_date: string;
  status: FinancialPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
}

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

      // Find current period (the one that is 'open' and contains today's date, or the latest open one)
      const today = new Date().toISOString().split("T")[0];
      const typedData = data as FinancialPeriod[] | null;
      const current = typedData?.find((p: FinancialPeriod) => p.status === 'open' && today >= p.start_date && today <= p.end_date) 
                   || typedData?.find((p: FinancialPeriod) => p.status === 'open') 
                   || null;

      setState((prev) => ({
        ...prev,
        periods: data || [],
        currentPeriod: current,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching financial periods:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
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
    } catch (err: any) {
      console.error("Error creating financial period:", err);
      setState((prev) => ({ ...prev, error: err.message }));
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
    } catch (err: any) {
      console.error("Error closing period:", err);
      setState((prev) => ({ ...prev, isLoading: false, error: err.message }));
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

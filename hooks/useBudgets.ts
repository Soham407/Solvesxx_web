"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type BudgetStatus = "draft" | "active" | "exhausted" | "expired";

export interface Budget {
  id: string;
  budget_code: string;
  name: string;
  department: string | null;
  category: string | null;
  financial_period_id: string;
  allocated_amount: number;
  used_amount: number;
  remaining_amount: number;
  alert_threshold_percent: number;
  alert_notified_at: string | null;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
  
  // Joined
  period_name?: string;
}

interface FinancialPeriodRow {
  period_name: string | null;
}

interface BudgetRow extends Omit<Budget, "period_name"> {
  financial_periods: FinancialPeriodRow | FinancialPeriodRow[] | null;
}

interface UseBudgetsState {
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function useBudgets(filters?: {
  department?: string;
  status?: BudgetStatus;
  periodId?: string;
}) {
  const [state, setState] = useState<UseBudgetsState>({
    budgets: [],
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH BUDGETS
  // ============================================
  const fetchBudgets = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("budgets")
        .select(`
          *,
          financial_periods (
            period_name
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.department) {
        query = query.eq("department", filters.department);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.periodId) {
        query = query.eq("financial_period_id", filters.periodId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const budgetsWithDetails: Budget[] = (data || []).map((b: BudgetRow) => {
        const period = Array.isArray(b.financial_periods)
          ? b.financial_periods[0]
          : b.financial_periods;

        return {
          ...b,
          period_name: period?.period_name || "N/A",
        };
      });

      setState((prev) => ({
        ...prev,
        budgets: budgetsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching budgets:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Error fetching budgets",
      }));
    }
  }, [filters?.department, filters?.status, filters?.periodId]);

  // ============================================
  // CREATE BUDGET
  // ============================================
  const createBudget = useCallback(async (input: Omit<Budget, "id" | "budget_code" | "used_amount" | "remaining_amount" | "created_at" | "updated_at" | "alert_notified_at" | "period_name">) => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();
      return data as Budget;
    } catch (err: unknown) {
      console.error("Error creating budget:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Error creating budget",
      }));
      return null;
    }
  }, [fetchBudgets]);

  // ============================================
  // UPDATE BUDGET (Status or Allocated Amount)
  // ============================================
  const updateBudget = useCallback(async (budgetId: string, updates: Partial<Budget>) => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .update(updates)
        .eq("id", budgetId)
        .select()
        .single();

      if (error) throw error;

      await fetchBudgets();
      return data as Budget;
    } catch (err: unknown) {
      console.error("Error updating budget:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Error updating budget",
      }));
      return null;
    }
  }, [fetchBudgets]);

  // ============================================
  // INITIAL FETCH
  // ============================================
  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return {
    ...state,
    fetchBudgets,
    createBudget,
    updateBudget,
    refresh: fetchBudgets,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
}

interface MDStats {
  activeSocieties: number;
  totalEmployees: number;
  guardStrength: number;
  totalRevenue: number | null;
  clientRetention: number | null;
  policeVerificationCompliancePercent: number | null;
  monthlyTrends: MonthlyTrend[];
}

interface UseMDStatsReturn {
  stats: MDStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMDStats(): UseMDStatsReturn {
  const [stats, setStats] = useState<MDStats>({
    activeSocieties: 0,
    totalEmployees: 0,
    guardStrength: 0,
    totalRevenue: null,
    clientRetention: null,
    policeVerificationCompliancePercent: null,
    monthlyTrends: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;

      const [societiesRes, empRes, guardRes, revenueRes, saleBillsRes, purchaseBillsRes] =
        await Promise.all([
          supabase.from("societies").select("id", { count: "exact" }).eq("is_active", true),
          supabase.from("employees").select("id", { count: "exact" }).eq("is_active", true),
          supabase.from("security_guards").select("id, employee_id"),
          (supabase as any)
            .from("sale_bills")
            .select("paid_amount")
            .eq("payment_status", "paid")
            .gte("created_at", yearStart),
          (supabase as any)
            .from("sale_bills")
            .select("paid_amount, created_at")
            .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
          (supabase as any)
            .from("purchase_bills")
            .select("paid_amount, created_at")
            .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

      if (societiesRes.error) throw societiesRes.error;
      if (empRes.error) throw empRes.error;
      if (guardRes.error) throw guardRes.error;
      if (revenueRes.error) throw revenueRes.error;
      if (saleBillsRes.error) throw saleBillsRes.error;
      if (purchaseBillsRes.error) throw purchaseBillsRes.error;

      const totalRevenue = revenueRes.data
        ? revenueRes.data.reduce((sum: number, row: any) => sum + (row.paid_amount || 0), 0)
        : null;

      const guards = (guardRes.data || []) as Array<{ id: string; employee_id: string | null }>;
      const guardTotal = guards.length;
      const guardEmployeeIds = guards
        .map((guard) => guard.employee_id)
        .filter((employeeId): employeeId is string => Boolean(employeeId));

      let policeVerificationCompliancePercent: number | null = null;
      if (guardTotal > 0) {
        const { count: verifiedCount, error: verificationError } = await (supabase as any)
          .from("employee_documents")
          .select("employee_id", { count: "exact", head: true })
          .eq("document_type", "police_verification")
          .eq("status", "verified")
          .in("employee_id", guardEmployeeIds);

        if (verificationError) throw verificationError;

        policeVerificationCompliancePercent = Math.round(((verifiedCount || 0) / guardTotal) * 100);
      }

      const monthMap: Record<string, MonthlyTrend> = {};
      const getMonthKey = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      };

      (saleBillsRes.data || []).forEach((row: any) => {
        const key = getMonthKey(row.created_at);
        if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0 };
        monthMap[key].revenue += row.paid_amount || 0;
      });

      (purchaseBillsRes.data || []).forEach((row: any) => {
        const key = getMonthKey(row.created_at);
        if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0 };
        monthMap[key].expenses += row.paid_amount || 0;
      });

      const monthlyTrends = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

      setStats({
        activeSocieties: societiesRes.count || 0,
        totalEmployees: empRes.count || 0,
        guardStrength: guardTotal,
        totalRevenue,
        clientRetention: null,
        policeVerificationCompliancePercent,
        monthlyTrends,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch MD stats";
      setError(errorMessage);
      console.error("Error fetching MD stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

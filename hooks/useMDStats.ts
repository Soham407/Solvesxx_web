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
  psaraCompliancePercent: number | null;
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
    psaraCompliancePercent: null,
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

      const [
        societiesRes,
        empRes,
        guardRes,
        revenueRes,
        saleBillsRes,
        purchaseBillsRes,
        guardsWithPsaraRes,
      ] = await Promise.all([
        supabase.from("societies").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("employees").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("security_guards").select("id", { count: "exact" }),
        // YTD revenue = sum of paid amounts on sale_bills in current year
        (supabase as any)
          .from("sale_bills")
          .select("paid_amount")
          .eq("payment_status", "paid")
          .gte("created_at", yearStart),
        // Monthly sale bills (last 6 months)
        (supabase as any)
          .from("sale_bills")
          .select("paid_amount, created_at")
          .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
        // Monthly purchase bills (last 6 months)
        (supabase as any)
          .from("purchase_bills")
          .select("paid_amount, created_at")
          .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
        // Guards with valid PSARA certificates
        (supabase as any)
          .from("employee_documents")
          .select("id", { count: "exact" })
          .eq("document_type", "psara_license")
          .eq("status", "verified")
          .gte("expiry_date", new Date().toISOString()),
      ]);

      // Compute YTD revenue
      const totalRevenue = revenueRes.data
        ? revenueRes.data.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0)
        : null;

      // PSARA compliance %
      const guardTotal = guardRes.count || 0;
      const guardsWithPsara = guardsWithPsaraRes.count || 0;
      const psaraCompliancePercent =
        guardTotal > 0 ? Math.round((guardsWithPsara / guardTotal) * 100) : null;

      // Build monthly trends
      const monthMap: Record<string, MonthlyTrend> = {};
      const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
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

      const monthlyTrends = Object.values(monthMap).sort((a, b) =>
        a.month.localeCompare(b.month),
      );

      setStats({
        activeSocieties: societiesRes.count || 0,
        totalEmployees: empRes.count || 0,
        guardStrength: guardTotal,
        totalRevenue: revenueRes.error ? null : totalRevenue,
        clientRetention: null,
        psaraCompliancePercent,
        monthlyTrends,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch MD stats";
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

// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export type ReportType = "financial" | "attendance" | "inventory" | "services";

export function useAnalyticsData(reportType: ReportType) {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (reportType === "financial") {
        const trendsRes: any = await supabase.from("view_financial_monthly_trends").select("*").order("month", { ascending: true });
        const categoryRes: any = await supabase.from("view_financial_revenue_by_category").select("*");
        const summaryRes: any = await supabase.from("view_financial_kpis").select("*").single();

        if (trendsRes.error) throw trendsRes.error;
        if (categoryRes.error) throw categoryRes.error;
        if (summaryRes.error && summaryRes.error.code !== "PGRST116") throw summaryRes.error;

        setTrends(trendsRes.data || []);
        setData(categoryRes.data || []);
        setSummary(summaryRes.data || null);
      } else if (reportType === "services") {
        const { data: serviceData, error: serviceError } = await supabase
          .from("view_service_performance")
          .select("*");

        if (serviceError) throw serviceError;
        setData(serviceData || []);
      } else if (reportType === "attendance") {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance_logs")
          .select("*")
          .order("check_in_time", { ascending: false })
          .limit(100);

        if (attendanceError) throw attendanceError;
        setData(attendanceData || []);
      } else if (reportType === "inventory") {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("stock_levels")
          .select("*");

        if (inventoryError) throw inventoryError;
        setData(inventoryData || []);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      console.error("Error fetching analytics data:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    summary,
    trends,
    isLoading,
    error,
    refresh: fetchData,
  };
}

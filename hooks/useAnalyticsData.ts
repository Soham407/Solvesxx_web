"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export type ReportType = "financial" | "attendance" | "inventory" | "services";

export function useAnalyticsData(reportType: ReportType) {
  const [data, setData] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (reportType === "financial") {
        const [trendsRes, categoryRes] = await Promise.all([
          (supabase as any).from("view_financial_monthly_trends").select("*").order("month", { ascending: true }),
          (supabase as any).from("view_financial_revenue_by_category").select("*")
        ]);

        if (trendsRes.error) throw trendsRes.error;
        if (categoryRes.error) throw categoryRes.error;

        setTrends(trendsRes.data || []);
        setData(categoryRes.data || []);
      } else if (reportType === "attendance") {
        const { data: deptData, error: deptError } = await (supabase as any)
          .from("view_attendance_by_dept")
          .select("*");
        
        if (deptError) throw deptError;
        setData(deptData || []);
      } else if (reportType === "inventory") {
        const { data: velocityData, error: velocityError } = await (supabase as any)
          .from("view_inventory_velocity")
          .select("*");
        
        if (velocityError) throw velocityError;
        setData(velocityData || []);
      } else if (reportType === "services") {
        const { data: performanceData, error: performanceError } = await (supabase as any)
          .from("view_service_performance")
          .select("*");
        
        if (performanceError) throw performanceError;
        setData(performanceData || []);
      }
    } catch (err: any) {
      console.error(`Error fetching ${reportType} analytics:`, err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, trends, isLoading, error, refetch: fetchData };
}

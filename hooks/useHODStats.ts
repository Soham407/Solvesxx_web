"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface HODStats {
  totalStrength: number;
  attendanceRate: number;
  pendingApprovals: number;
  tasksCompleted: number;
  distribution: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface UseHODStatsReturn {
  stats: HODStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHODStats(department?: string): UseHODStatsReturn {
  const [stats, setStats] = useState<HODStats>({
    totalStrength: 0,
    attendanceRate: 0,
    pendingApprovals: 0,
    tasksCompleted: 0,
    distribution: [
      { name: "Active", value: 0, color: "hsl(var(--primary))" },
      { name: "On Leave", value: 0, color: "hsl(var(--warning))" },
      { name: "Off Duty", value: 0, color: "hsl(var(--muted-foreground))" },
    ],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get employees in department
      let employeeQuery = supabase
        .from("employees")
        .select("id", { count: "exact" })
        .eq("is_active", true);

      if (department) {
        employeeQuery = employeeQuery.eq("department", department);
      }

      const { count: totalStrength, error: empError } = await employeeQuery;

      if (empError) throw empError;

      // Get today's attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("employee_id, check_out_time, status")
        .eq("log_date", today);

      if (attendanceError) throw attendanceError;

      const presentCount = attendanceData?.filter(
        (a) => !a.check_out_time
      ).length || 0;

      const attendanceRate = totalStrength
        ? Math.round((presentCount / totalStrength) * 100)
        : 0;

      // Get pending leave applications for this department
      let leaveQuery = supabase
        .from("leave_applications")
        .select("id", { count: "exact" })
        .eq("status", "pending");

      if (department) {
        // Join with employees to filter by department
        const { data: deptEmployees } = await supabase
          .from("employees")
          .select("id")
          .eq("department", department)
          .eq("is_active", true);

        const deptEmployeeIds = deptEmployees?.map((e) => e.id) || [];
        if (deptEmployeeIds.length > 0) {
          leaveQuery = leaveQuery.in("employee_id", deptEmployeeIds);
        }
      }

      const { count: pendingApprovals, error: leaveError } = await leaveQuery;

      if (leaveError) throw leaveError;

      // Get completed service requests today
      const { data: completedRequests, error: requestError } = await supabase
        .from("service_requests")
        .select("id, completed_at")
        .eq("status", "completed")
        .gte("completed_at", `${today}T00:00:00Z`);

      if (requestError) throw requestError;

      const tasksCompleted = completedRequests?.length || 0;

      // Calculate force distribution
      const total = totalStrength || 0;
      const activeCount = presentCount;

      // Get on leave count
      let leaveQuery2 = supabase
        .from("leave_applications")
        .select("employee_id")
        .eq("status", "approved")
        .lte("from_date", today)
        .gte("to_date", today);

      if (department) {
        const { data: deptEmployees } = await supabase
          .from("employees")
          .select("id")
          .eq("department", department)
          .eq("is_active", true);

        const deptEmployeeIds = deptEmployees?.map((e) => e.id) || [];
        if (deptEmployeeIds.length > 0) {
          leaveQuery2 = leaveQuery2.in("employee_id", deptEmployeeIds);
        }
      }

      const { data: onLeaveData } = await leaveQuery2;
      const onLeaveCount = onLeaveData?.length || 0;
      const offDutyCount = Math.max(0, total - activeCount - onLeaveCount);

      setStats({
        totalStrength: total,
        attendanceRate,
        pendingApprovals: pendingApprovals || 0,
        tasksCompleted,
        distribution: [
          {
            name: "Active",
            value: activeCount,
            color: "hsl(var(--primary))",
          },
          {
            name: "On Leave",
            value: onLeaveCount,
            color: "hsl(var(--warning))",
          },
          {
            name: "Off Duty",
            value: offDutyCount,
            color: "hsl(var(--muted-foreground))",
          },
        ],
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch HOD stats";
      setError(errorMessage);
      console.error("Error fetching HOD stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [department]);

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

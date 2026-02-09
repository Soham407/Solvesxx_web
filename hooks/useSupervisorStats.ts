"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface SupervisorStats {
  guardsOnSite: number;
  checkpointCompliance: number;
  pendingChecklists: number;
  unresolvedAlerts: number;
  shiftAttendance: number;
  totalGuards: number;
}

interface UseSupervisorStatsReturn {
  stats: SupervisorStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSupervisorStats(
  locationId?: string
): UseSupervisorStatsReturn {
  const [stats, setStats] = useState<SupervisorStats>({
    guardsOnSite: 0,
    checkpointCompliance: 0,
    pendingChecklists: 0,
    unresolvedAlerts: 0,
    shiftAttendance: 0,
    totalGuards: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total guards
      let guardQuery = supabase
        .from("security_guards")
        .select("id, employee_id", { count: "exact" });

      if (locationId) {
        guardQuery = guardQuery.eq("assigned_location_id", locationId);
      }

      const { count: totalGuardsCount, error: guardError } = await guardQuery;

      if (guardError) throw guardError;

      // Get today's attendance for on-site guards
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("employee_id, check_out_time")
        .eq("log_date", today)
        .not("check_in_time", "is", null);

      if (attendanceError) throw attendanceError;

      const onSiteCount = attendanceData?.filter((log) => !log.check_out_time).length || 0;

      // Get today's checklist responses for pending checklists
      const { data: checklistResponses, error: checklistError } = await supabase
        .from("checklist_responses")
        .select("is_complete")
        .eq("response_date", today);

      if (checklistError) throw checklistError;

      const pendingChecklistsCount =
        checklistResponses?.filter((r) => !r.is_complete).length || 0;

      // Get unresolved panic alerts
      const { data: panicAlerts, error: panicError } = await supabase
        .from("panic_alerts")
        .select("id")
        .eq("is_resolved", false);

      if (panicError) throw panicError;

      const unresolvedAlertsCount = panicAlerts?.length || 0;

      // Get today's patrol logs for checkpoint compliance
      const { data: patrolLogs, error: patrolError } = await supabase
        .from("guard_patrol_logs")
        .select("checkpoints_verified, total_checkpoints, patrol_start_time")
        .gte("patrol_start_time", `${today}T00:00:00Z`);

      if (patrolError) throw patrolError;

      let checkpointComplianceRate = 0;
      if (patrolLogs && patrolLogs.length > 0) {
        const totalCheckpoints = patrolLogs.reduce(
          (sum, log) => sum + (log.total_checkpoints || 0),
          0
        );
        const verifiedCheckpoints = patrolLogs.reduce(
          (sum, log) => sum + (log.checkpoints_verified || 0),
          0
        );
        checkpointComplianceRate = totalCheckpoints
          ? Math.round((verifiedCheckpoints / totalCheckpoints) * 100)
          : 0;
      }

      // Calculate shift attendance (guards with shifts assigned today)
      const { data: shiftAssignments, error: shiftError } = await supabase
        .from("employee_shift_assignments")
        .select("employee_id")
        .eq("assigned_from", today)
        .eq("is_active", true);

      if (shiftError) throw shiftError;

      const totalAssignedShifts = shiftAssignments?.length || 0;
      const shiftAttendanceRate = totalAssignedShifts
        ? Math.round((onSiteCount / totalAssignedShifts) * 100)
        : 0;

      setStats({
        guardsOnSite: onSiteCount,
        checkpointCompliance: checkpointComplianceRate,
        pendingChecklists: pendingChecklistsCount,
        unresolvedAlerts: unresolvedAlertsCount,
        shiftAttendance: shiftAttendanceRate,
        totalGuards: totalGuardsCount || 0,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch supervisor stats";
      setError(errorMessage);
      console.error("Error fetching supervisor stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
const supabase = supabaseTyped as any;

interface SocietyStats {
  activeGuards: number;
  totalGuards: number;
  checklistCompletion: number;
  visitorsToday: number;
  pendingCheckouts: number;
  activeChecklists: number;
  totalChecklists: number;
}

interface UseSocietyStatsReturn {
  stats: SocietyStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSocietyStats(societyId?: string): UseSocietyStatsReturn {
  const [stats, setStats] = useState<SocietyStats>({
    activeGuards: 0,
    totalGuards: 0,
    checklistCompletion: 0,
    visitorsToday: 0,
    pendingCheckouts: 0,
    activeChecklists: 0,
    totalChecklists: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];

      // Get total and active guards for society
      let guardQuery = supabase
        .from("security_guards")
        .select("id, employee_id", { count: "exact" });

      if (societyId) {
        guardQuery = guardQuery.eq("society_id", societyId);
      }

      const { count: totalGuardsCount, error: guardError } = await guardQuery;

      if (guardError) throw guardError;

      // Get today's attendance (clocked in guards)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select("employee_id, check_out_time")
        .eq("log_date", today)
        .not("check_in_time", "is", null);

      if (attendanceError) throw attendanceError;

      const activeGuardsCount = attendanceData?.filter(
        (log) => !log.check_out_time
      ).length || 0;

      // Get today's checklist responses
      const { data: checklistResponses, error: checklistError } = await supabase
        .from("checklist_responses")
        .select("is_complete")
        .eq("response_date", today);

      if (checklistError) throw checklistError;

      const totalChecklistsCount = checklistResponses?.length || 0;
      const completedChecklistsCount =
        checklistResponses?.filter((r) => r.is_complete).length || 0;
      const checklistCompletionRate = totalChecklistsCount
        ? Math.round((completedChecklistsCount / totalChecklistsCount) * 100)
        : 0;

      // Get today's visitors
      const { data: visitorsData, error: visitorsError } = await supabase
        .from("visitors")
        .select("id, entry_time, exit_time")
        .gte("entry_time", `${today}T00:00:00Z`);

      if (visitorsError) throw visitorsError;

      const visitorsTodayCount = visitorsData?.length || 0;
      const pendingCheckoutsCount =
        visitorsData?.filter((v) => v.entry_time && !v.exit_time).length || 0;

      setStats({
        activeGuards: activeGuardsCount,
        totalGuards: totalGuardsCount || 0,
        checklistCompletion: checklistCompletionRate,
        visitorsToday: visitorsTodayCount,
        pendingCheckouts: pendingCheckoutsCount,
        activeChecklists: completedChecklistsCount,
        totalChecklists: totalChecklistsCount,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch society stats";
      setError(errorMessage);
      console.error("Error fetching society stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [societyId]);

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

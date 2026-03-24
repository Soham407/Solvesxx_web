"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface PatrolLog {
  id: string;
  guardName: string;
  checkpoint: string;
  patrolTime: string;
  status: "completed" | "pending" | "overdue";
  checkpointsVerified: number;
  totalCheckpoints: number;
  anomalies: string | null;
}

export interface CreatePatrolLogPayload {
  guard_id: string;
  /** ISO timestamp for when the patrol started. Defaults to now if omitted. */
  timestamp?: string;
  /** Free-text notes / anomaly description. Maps to the anomalies_found column. */
  notes?: string;
  checkpoints_verified?: number;
  total_checkpoints?: number;
  patrol_end_time?: string;
}

interface UsePatrolLogsReturn {
  logs: PatrolLog[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPatrolLog: (payload: CreatePatrolLogPayload) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export function usePatrolLogs(
  guardId?: string,
  limit: number = 10
): UsePatrolLogsReturn {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];

      let query = supabase
        .from("guard_patrol_logs")
        .select(
          `
          id,
          patrol_start_time,
          checkpoints_verified,
          total_checkpoints,
          anomalies_found,
          guard:guard_id(
            employee:employee_id(
              first_name,
              last_name
            )
          )
        `
        )
        .gte("patrol_start_time", `${today}T00:00:00Z`)
        .order("patrol_start_time", { ascending: false })
        .limit(limit);

      if (guardId) {
        query = query.eq("guard_id", guardId);
      }

      const { data, error: logsError } = await query;

      if (logsError) throw logsError;

      const formattedLogs: PatrolLog[] =
        data?.map((log: any) => {
          const guardName = log.guard?.employee
            ? `${log.guard.employee.first_name || ""} ${
                log.guard.employee.last_name || ""
              }`.trim()
            : "Unknown Guard";

          const patrolTime = new Date(log.patrol_start_time).toLocaleTimeString(
            "en-IN",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          const isComplete =
            log.total_checkpoints > 0 &&
            log.checkpoints_verified >= log.total_checkpoints;
          const isOverdue =
            !isComplete &&
            new Date().getTime() - new Date(log.patrol_start_time).getTime() >
              2 * 60 * 60 * 1000; // 2 hours overdue

          let status: "completed" | "pending" | "overdue" = "pending";
          if (isComplete) status = "completed";
          else if (isOverdue) status = "overdue";

          return {
            id: log.id,
            guardName,
            checkpoint: `Zone ${Math.ceil(Math.random() * 4)}`, // Mock zone for demo
            patrolTime,
            status,
            checkpointsVerified: log.checkpoints_verified || 0,
            totalCheckpoints: log.total_checkpoints || 0,
            anomalies: log.anomalies_found,
          };
        }) || [];

      setLogs(formattedLogs);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch patrol logs";
      setError(errorMessage);
      console.error("Error fetching patrol logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [guardId, limit]);

  // UI-H2 Fix: Insert a new patrol log entry into guard_patrol_logs.
  // The guard_patrol_logs table columns are: guard_id, patrol_start_time,
  // anomalies_found, checkpoints_verified, total_checkpoints, patrol_end_time, photos.
  // NOTE: There is no location_id or notes column in the schema — the `notes`
  // payload field is mapped to anomalies_found.
  const createPatrolLog = useCallback(
    async (payload: CreatePatrolLogPayload): Promise<{ success: boolean; data?: any; error?: string }> => {
      try {
        const { data, error: insertError } = await supabase
          .from("guard_patrol_logs")
          .insert({
            guard_id: payload.guard_id,
            patrol_start_time: payload.timestamp || new Date().toISOString(),
            anomalies_found: payload.notes || null,
            checkpoints_verified: payload.checkpoints_verified ?? 0,
            total_checkpoints: payload.total_checkpoints ?? 0,
            patrol_end_time: payload.patrol_end_time || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Refresh the list so the new entry appears immediately
        await fetchLogs();

        return { success: true, data };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create patrol log";
        console.error("Error creating patrol log:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchLogs]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    refresh: fetchLogs,
    createPatrolLog,
  };
}

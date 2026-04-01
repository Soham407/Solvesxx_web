"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  MaintenanceSchedule,
  MaintenanceScheduleInsert,
  MaintenanceScheduleUpdate,
  DueMaintenanceSchedule,
} from "@/src/types/operations";
import { MAINTENANCE_FREQUENCY_DAYS } from "@/src/lib/constants";

interface UseMaintenanceSchedulesState {
  schedules: MaintenanceSchedule[];
  dueSchedules: DueMaintenanceSchedule[];
  isLoading: boolean;
  error: string | null;
}

interface UseMaintenanceSchedulesReturn extends UseMaintenanceSchedulesState {
  createSchedule: (data: MaintenanceScheduleInsert) => Promise<{ success: boolean; error?: string; data?: MaintenanceSchedule }>;
  updateSchedule: (id: string, data: MaintenanceScheduleUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteSchedule: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAsPerformed: (id: string, performedDate?: string) => Promise<{ success: boolean; error?: string }>;
  getSchedulesByAsset: (assetId: string) => MaintenanceSchedule[];
  getDueSchedules: () => DueMaintenanceSchedule[];
  refresh: () => void;
}

/**
 * Hook for managing maintenance schedules
 * Handles recurring maintenance tasks for assets
 */
export function useMaintenanceSchedules(assetId?: string): UseMaintenanceSchedulesReturn {
  const [state, setState] = useState<UseMaintenanceSchedulesState>({
    schedules: [],
    dueSchedules: [],
    isLoading: true,
    error: null,
  });

  // Fetch all schedules (optionally filtered by asset)
  const fetchSchedules = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("is_active", true);

      if (assetId) {
        query = query.eq("asset_id", assetId);
      }

      const { data, error } = await query.order("next_due_date");

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        schedules: data || [],
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch schedules";
      console.error("Error fetching maintenance schedules:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [assetId]);

  // Fetch due schedules (from the view)
  const fetchDueSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("due_maintenance_schedules")
        .select("*")
        .order("next_due_date");

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        dueSchedules: (data as DueMaintenanceSchedule[]) || [],
      }));
    } catch (err: unknown) {
      console.error("Error fetching due schedules:", err);
    }
  }, []);

  // Create new schedule
  const createSchedule = useCallback(
    async (data: MaintenanceScheduleInsert): Promise<{ success: boolean; error?: string; data?: MaintenanceSchedule }> => {
      try {
        const { data: newSchedule, error } = await supabase
          .from("maintenance_schedules")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        fetchSchedules();
        fetchDueSchedules();

        return { success: true, data: newSchedule };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create schedule";
        console.error("Error creating maintenance schedule:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSchedules, fetchDueSchedules]
  );

  // Update schedule
  const updateSchedule = useCallback(
    async (id: string, data: MaintenanceScheduleUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("maintenance_schedules")
          .update(data)
          .eq("id", id);

        if (error) throw error;

        fetchSchedules();
        fetchDueSchedules();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update schedule";
        console.error("Error updating maintenance schedule:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSchedules, fetchDueSchedules]
  );

  // Soft delete schedule
  const deleteSchedule = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("maintenance_schedules")
          .update({ is_active: false })
          .eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          schedules: prev.schedules.filter((s) => s.id !== id),
          dueSchedules: prev.dueSchedules.filter((s) => s.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete schedule";
        console.error("Error deleting maintenance schedule:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Mark maintenance as performed and calculate next due date
  const markAsPerformed = useCallback(
    async (id: string, performedDate?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: schedule, error: scheduleError } = await supabase
          .from("maintenance_schedules")
          .select("id, frequency, custom_interval_days, last_performed_date")
          .eq("id", id)
          .single();

        if (scheduleError) throw scheduleError;
        if (!schedule) {
          return { success: false, error: "Schedule not found" };
        }

        const { data: completedRequest, error: requestError } = await supabase
          .from("service_requests")
          .select("id, completed_at, status")
          .eq("maintenance_schedule_id", id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestError && requestError.code !== "PGRST116") throw requestError;

        const completedDate =
          performedDate ||
          completedRequest?.completed_at?.split("T")[0] ||
          null;

        if (!completedDate) {
          return {
            success: false,
            error: "Complete the linked service request before marking maintenance as performed",
          };
        }

        if (
          schedule.last_performed_date &&
          completedDate <= schedule.last_performed_date
        ) {
          return {
            success: false,
            error: "This maintenance cycle has already been recorded",
          };
        }

        // Calculate next due date based on frequency
        const intervalDays =
          schedule.custom_interval_days ||
          MAINTENANCE_FREQUENCY_DAYS[schedule.frequency] ||
          30;

        const nextDueDate = new Date(completedDate);
        nextDueDate.setDate(nextDueDate.getDate() + intervalDays);

        const { error } = await supabase
          .from("maintenance_schedules")
          .update({
            last_performed_date: completedDate,
            next_due_date: nextDueDate.toISOString().split("T")[0],
          })
          .eq("id", id);

        if (error) throw error;

        fetchSchedules();
        fetchDueSchedules();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to mark as performed";
        console.error("Error marking maintenance as performed:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSchedules, fetchDueSchedules]
  );

  // Get schedules by asset
  const getSchedulesByAsset = useCallback(
    (assetId: string): MaintenanceSchedule[] => {
      return state.schedules.filter((s) => s.asset_id === assetId);
    },
    [state.schedules]
  );

  // Get due schedules
  const getDueSchedules = useCallback((): DueMaintenanceSchedule[] => {
    return state.dueSchedules;
  }, [state.dueSchedules]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchSchedules();
    fetchDueSchedules();
  }, [fetchSchedules, fetchDueSchedules]);

  // Initialize on mount
  useEffect(() => {
    fetchSchedules();
    fetchDueSchedules();
  }, [fetchSchedules, fetchDueSchedules]);

  return {
    ...state,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    markAsPerformed,
    getSchedulesByAsset,
    getDueSchedules,
    refresh,
  };
}

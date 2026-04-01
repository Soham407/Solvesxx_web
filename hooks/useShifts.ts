"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface Shift {
  id: string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number | null;
  duration_hours?: number | null;
  grace_time_minutes?: number | null;
  is_night_shift: boolean | null;
  is_active: boolean | null;
  description?: string | null;
  created_at: string | null;
}

interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  assigned_from: string;
  assigned_to: string | null;
  is_active: boolean;
  assigned_by: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    employee_code: string;
  };
  shift?: Shift;
}

interface GuardWithAssignment {
  id: string;
  employee_id: string;
  guard_code: string;
  grade: string | null;
  employee: {
    first_name: string;
    last_name: string;
    employee_code: string;
  } | null;
  current_shift?: Shift | null;
  assignment_id?: string | null;
}

interface ShiftsState {
  shifts: Shift[];
  assignments: ShiftAssignment[];
  guards: GuardWithAssignment[];
  isLoading: boolean;
  isCreating: boolean;
  isAssigning: boolean;
  error: string | null;
}

export function useShifts() {
  const [state, setState] = useState<ShiftsState>({
    shifts: [],
    assignments: [],
    guards: [],
    isLoading: true,
    isCreating: false,
    isAssigning: false,
    error: null,
  });

  /**
   * Fetch all shifts
   */
  const fetchShifts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .order("shift_name");

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        shifts: data || [],
        isLoading: false,
      }));
    } catch (err) {
      console.error("Error fetching shifts:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load shifts",
      }));
    }
  }, []);

  /**
   * Fetch all guards with their current shift assignments
   */
  const fetchGuardsWithShifts = useCallback(async () => {
    try {
      // First, get all security guards with employee details
      const { data: guardsData, error: guardsError } = await supabase
        .from("security_guards")
        .select(`
          id,
          employee_id,
          guard_code,
          grade,
          employees (
            first_name,
            last_name,
            employee_code
          )
        `);

      if (guardsError) throw guardsError;

      // Get active shift assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("employee_shift_assignments")
        .select(`
          id,
          employee_id,
          shift_id,
          shifts (*)
        `)
        .eq("is_active", true);

      if (assignmentsError) throw assignmentsError;

      // Map assignments to employees
      const assignmentMap = new Map<string, { shift: Shift; assignmentId: string }>();
      (assignmentsData || []).forEach((a: Record<string, unknown>) => {
        const assignment = a as { employee_id: string; shifts: Shift; id: string };
        if (assignment.shifts) {
          assignmentMap.set(assignment.employee_id, {
            shift: assignment.shifts,
            assignmentId: assignment.id,
          });
        }
      });

      // Combine guards with their shift info
      const guards: GuardWithAssignment[] = (guardsData || []).map((g: Record<string, unknown>) => {
        const guard = g as {
          id: string;
          employee_id: string;
          guard_code: string;
          grade: string | null;
          employees: { first_name: string; last_name: string; employee_code: string } | null;
        };
        const assignmentInfo = assignmentMap.get(guard.employee_id);
        return {
          id: guard.id,
          employee_id: guard.employee_id,
          guard_code: guard.guard_code,
          grade: guard.grade,
          employee: guard.employees,
          current_shift: assignmentInfo?.shift || null,
          assignment_id: assignmentInfo?.assignmentId || null,
        };
      });

      setState((prev) => ({
        ...prev,
        guards,
      }));
    } catch (err) {
      console.error("Error fetching guards:", err);
    }
  }, []);

  /**
   * Create a new shift
   */
  const createShift = useCallback(
    async (shiftData: {
      shift_code: string;
      shift_name: string;
      start_time: string;
      end_time: string;
      is_night_shift?: boolean;
      break_duration_minutes?: number;
      description?: string;
    }): Promise<{ success: boolean; shift?: Shift; error?: string }> => {
      setState((prev) => ({ ...prev, isCreating: true }));

      try {
        const { data, error } = await supabase
          .from("shifts")
          .insert({
            shift_code: shiftData.shift_code,
            shift_name: shiftData.shift_name,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            is_night_shift: shiftData.is_night_shift || false,
            break_duration_minutes: shiftData.break_duration_minutes || null,
            description: shiftData.description || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        await fetchShifts();
        setState((prev) => ({ ...prev, isCreating: false }));
        return { success: true, shift: data };
      } catch (err) {
        console.error("Error creating shift:", err);
        setState((prev) => ({ ...prev, isCreating: false }));
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to create shift",
        };
      }
    },
    [fetchShifts]
  );

  /**
   * Assign a guard to a shift
   */
  const assignGuardToShift = useCallback(
    async (
      employeeId: string,
      shiftId: string,
      locationId?: string | null
    ): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, isAssigning: true }));

      try {
        // First, deactivate any existing active assignment for this employee
        await supabase
          .from("employee_shift_assignments")
          .update({ is_active: false, assigned_to: new Date().toISOString().split("T")[0] })
          .eq("employee_id", employeeId)
          .eq("is_active", true);

        // Create new assignment
        const { error } = await supabase.from("employee_shift_assignments").insert({
          employee_id: employeeId,
          shift_id: shiftId,
          assigned_from: new Date().toISOString().split("T")[0],
          is_active: true,
        });

        if (error) throw error;

        await fetchGuardsWithShifts();
        setState((prev) => ({ ...prev, isAssigning: false }));
        return { success: true };
      } catch (err) {
        console.error("Error assigning guard to shift:", err);
        setState((prev) => ({ ...prev, isAssigning: false }));
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to assign shift",
        };
      }
    },
    [fetchGuardsWithShifts]
  );

  /**
   * Unassign a guard from current shift
   */
  const unassignGuard = useCallback(
    async (assignmentId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("employee_shift_assignments")
          .update({
            is_active: false,
            assigned_to: new Date().toISOString().split("T")[0],
          })
          .eq("id", assignmentId);

        if (error) throw error;

        await fetchGuardsWithShifts();
        return { success: true };
      } catch (err) {
        console.error("Error unassigning guard:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to unassign",
        };
      }
    },
    [fetchGuardsWithShifts]
  );

  /**
   * Get statistics
   */
  const getStats = useCallback(() => {
    const activeShifts = state.shifts.filter((s) => s.is_active === true).length;
    const totalAssigned = state.guards.filter((g) => g.current_shift).length;
    const nightShiftCount = state.guards.filter(
      (g) => g.current_shift?.is_night_shift === true
    ).length;
    const unassignedCount = state.guards.filter((g) => !g.current_shift).length;

    return {
      activeShifts,
      totalAssigned,
      nightShiftCount,
      unassignedCount,
    };
  }, [state.shifts, state.guards]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchShifts();
    fetchGuardsWithShifts();
  }, [fetchShifts, fetchGuardsWithShifts]);

  // Initialize data on mount
  useEffect(() => {
    fetchShifts();
    fetchGuardsWithShifts();
  }, [fetchShifts, fetchGuardsWithShifts]);

  return {
    ...state,
    createShift,
    assignGuardToShift,
    unassignGuard,
    getStats,
    refresh,
  };
}

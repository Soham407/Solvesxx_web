"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import {
  mapLeaveTypeRow,
  toDbLeaveType,
  type CreateLeaveTypeInput,
  type LeaveType,
  type LeaveTypeRow,
} from "@/src/lib/hrms/leaveTypeTransforms";

export type {
  CreateLeaveTypeInput,
  LeaveType,
} from "@/src/lib/hrms/leaveTypeTransforms";

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("leave_types")
        .select("*")
        .order("leave_name");
      if (fetchError) throw fetchError;
      setLeaveTypes(((data || []) as LeaveTypeRow[]).map(mapLeaveTypeRow));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLeaveType = async (input: CreateLeaveTypeInput) => {
    try {
      const { error } = await supabase.from("leave_types").insert({
        ...input,
        leave_type: toDbLeaveType(input.is_paid),
        requires_approval: !input.is_paid,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Leave type created");
      fetchLeaveTypes();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create leave type");
      return false;
    }
  };

  const updateLeaveType = async (id: string, input: Partial<CreateLeaveTypeInput>) => {
    try {
      const { error } = await supabase.from("leave_types").update({
        ...input,
        ...(input.is_paid !== undefined
          ? {
              leave_type: toDbLeaveType(input.is_paid),
              requires_approval: !input.is_paid,
            }
          : {}),
      }).eq("id", id);
      if (error) throw error;
      toast.success("Leave type updated");
      fetchLeaveTypes();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update leave type");
      return false;
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  return { leaveTypes, isLoading, error, createLeaveType, updateLeaveType, refresh: fetchLeaveTypes };
}

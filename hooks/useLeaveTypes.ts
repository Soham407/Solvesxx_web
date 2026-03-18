"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

export interface LeaveType {
  id: string;
  leave_name: string;
  yearly_quota: number;
  is_paid: boolean;
  can_carry_forward: boolean;
  max_carry_forward: number | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateLeaveTypeInput {
  leave_name: string;
  yearly_quota: number;
  is_paid: boolean;
  can_carry_forward: boolean;
  max_carry_forward?: number | null;
}

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
      setLeaveTypes((data || []) as LeaveType[]);
    } catch (err: any) {
      setError(err.message || "Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLeaveType = async (input: CreateLeaveTypeInput) => {
    try {
      const { error } = await supabase.from("leave_types").insert({
        ...input,
        is_active: true,
      });
      if (error) throw error;
      toast.success("Leave type created");
      fetchLeaveTypes();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to create leave type");
      return false;
    }
  };

  const updateLeaveType = async (id: string, input: Partial<CreateLeaveTypeInput>) => {
    try {
      const { error } = await supabase.from("leave_types").update(input).eq("id", id);
      if (error) throw error;
      toast.success("Leave type updated");
      fetchLeaveTypes();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update leave type");
      return false;
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  return { leaveTypes, isLoading, error, createLeaveType, updateLeaveType, refresh: fetchLeaveTypes };
}

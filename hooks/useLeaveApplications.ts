"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { sendLeaveApprovalNotification } from "@/src/lib/notifications";
import {
  buildLeaveBalances,
  buildLeaveStats,
  type CreateLeaveApplicationDTO,
  type LeaveApplication,
  type LeaveApplicationRow,
  type LeaveBalance,
  type LeaveType,
  type LeaveStats,
} from "@/src/lib/leave-applications/leaveTransforms";

export type {
  CreateLeaveApplicationDTO,
  LeaveApplication,
  LeaveBalance,
  LeaveType,
} from "@/src/lib/leave-applications/leaveTransforms";

interface UseLeaveApplicationsState {
  applications: LeaveApplication[];
  leaveTypes: LeaveType[];
  leaveBalance: LeaveBalance[];
  isLoading: boolean;
  error: string | null;
}

export function useLeaveApplications(employeeId?: string) {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    pendingRequests: 0,
    onLeaveToday: 0,
    approvedMonth: 0,
    rejectedMonth: 0,
  });

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('leave_name');

      if (error) throw error;
      const types = data as LeaveType[];
      setLeaveTypes(types);
      return types;
    } catch (err) {
      console.error('Error fetching leave types:', err);
      return [];
    }
  }, []);

  // Fetch leave applications
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('leave_applications')
        .select(`
          *,
          employee:employees!employee_id(first_name, last_name, photo_url, employee_code),
          leave_type:leave_types(leave_name, leave_type, yearly_quota)
        `)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const apps = (data || []) as LeaveApplicationRow[];
      setLeaves(apps);

      const types = await fetchLeaveTypes();

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      setStats(buildLeaveStats(apps, today, currentMonth));
      setLeaveBalance(buildLeaveBalances(types, apps, employeeId));

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leave applications';
      console.error('Error fetching leave applications:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [employeeId, fetchLeaveTypes]);

  // Apply for leave
  const applyForLeave = async (application: CreateLeaveApplicationDTO) => {
    try {
      let empId = employeeId;
      if (!empId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: emp } = await supabase
            .from('employees')
            .select('id')
            .eq('auth_user_id', String(user.id))
            .single();
          if (emp) empId = emp.id;
        }
      }

      if (!empId) throw new Error('Employee ID not found');

      const fromDate = new Date(application.from_date);
      const toDate = new Date(application.to_date);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const { data, error } = await supabase
        .from('leave_applications')
        .insert({
          employee_id: empId,
          leave_type_id: application.leave_type_id,
          from_date: application.from_date,
          to_date: application.to_date,
          number_of_days: numberOfDays,
          reason: application.reason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Leave Application Submitted",
        description: `Your leave request for ${numberOfDays} day(s) has been submitted.`,
      });

      fetchApplications();
      return { success: true, data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit leave application";
      console.error('Error applying for leave:', err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return { success: false, error: message };
    }
  };

  const updateLeaveStatus = async (id: string, status: "approved" | "rejected", reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let approverId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('auth_user_id', String(user.id))
          .single();
        if (emp) approverId = emp.id;
      }

      const updateData: Record<string, unknown> = { 
        status,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (status === "rejected" && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('leave_applications')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Get employee user ID for notification
      type LeaveDataRow = {
        employee_id: string;
        leave_type?: { leave_name?: string | null } | null;
      };

      const { data: leaveData } = await supabase
        .from('leave_applications')
        .select('employee_id, leave_type:leave_types(leave_name)')
        .eq('id', id)
        .single<LeaveDataRow>();

      if (leaveData) {
        const { data: empData } = await supabase
          .from('employees')
          .select('auth_user_id, first_name, last_name, phone')
          .eq('id', leaveData.employee_id)
          .single();

        if (empData?.auth_user_id) {
          const approverName = approverId ? 'your manager' : 'admin';
          await sendLeaveApprovalNotification(
            empData.auth_user_id,
            leaveData?.leave_type?.leave_name || 'leave',
            status,
            approverName
          );
        }

        if (empData?.phone) {
          // Browser-side SMS delivery is intentionally not attempted here.
          // The in-app notification row is the reliable source of truth; any
          // transport fan-out should happen server-side.
          console.info(
            `Leave approval notification recorded for ${empData.phone}; SMS delivery is deferred to server-side transport.`
          );
        }
      }

      toast({
        title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The leave application has been ${status}.`,
      });

      fetchApplications();
    } catch (err: unknown) {
      console.error('Error updating leave status:', err);
      toast({
        title: "Error",
        description: `Failed to ${status} leave`,
        variant: "destructive",
      });
    }
  };

  const approveLeave = (id: string) => updateLeaveStatus(id, 'approved');
  const rejectLeave = (id: string, reason: string) => updateLeaveStatus(id, 'rejected', reason);

  const cancelApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .delete()
        .eq('id', applicationId)
        .eq('status', 'pending');

      if (error) throw error;
      setLeaves(prev => prev.filter(a => a.id !== applicationId));

      toast({
        title: "Application Cancelled",
        description: "Your leave application has been cancelled.",
      });
    } catch (err: unknown) {
      console.error('Error cancelling application:', err);
      toast({
        title: "Error",
        description: "Failed to cancel application",
        variant: "destructive",
      });
    }
  };

  const getStats = () => ({
    pending: stats.pendingRequests,
    approved: stats.approvedMonth,
    rejected: stats.rejectedMonth,
    total: leaves.length
  });

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    // New API
    leaves,
    loading,
    error,
    stats,
    updateLeaveStatus,
    refreshLeaves: fetchApplications,
    
    // Old API Compatibility
    applications: leaves,
    isLoading: loading,
    leaveTypes,
    leaveBalance,
    fetchApplications,
    applyForLeave,
    approveLeave,
    rejectLeave,
    cancelApplication,
    getStats,
  };
}

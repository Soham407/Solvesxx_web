"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface LeaveType {
  id: string;
  leave_type: string;
  leave_name: string;
  yearly_quota: number;
  can_carry_forward: boolean;
  max_carry_forward: number;
  requires_approval: boolean;
  description: string | null;
  is_active: boolean;
}

export interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  number_of_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: {
    first_name: string;
    last_name: string;
    employee_code: string;
  };
  leave_type?: LeaveType;
  approver?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateLeaveApplicationDTO {
  leave_type_id: string;
  from_date: string;
  to_date: string;
  reason: string;
}

interface LeaveBalance {
  leave_type: string;
  leave_name: string;
  yearly_quota: number;
  used: number;
  pending: number;
  available: number;
}

interface UseLeaveApplicationsState {
  applications: LeaveApplication[];
  leaveTypes: LeaveType[];
  leaveBalance: LeaveBalance[];
  isLoading: boolean;
  error: string | null;
}

export function useLeaveApplications(employeeId?: string) {
  const { toast } = useToast();
  const [state, setState] = useState<UseLeaveApplicationsState>({
    applications: [],
    leaveTypes: [],
    leaveBalance: [],
    isLoading: true,
    error: null,
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
      return data as LeaveType[];
    } catch (err) {
      console.error('Error fetching leave types:', err);
      return [];
    }
  }, []);

  // Fetch leave applications
  const fetchApplications = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from('leave_applications')
        .select(`
          *,
          employee:employees!leave_applications_employee_id_fkey(first_name, last_name, employee_code),
          leave_type:leave_types!leave_applications_leave_type_id_fkey(*),
          approver:employees!leave_applications_approved_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const leaveTypes = await fetchLeaveTypes();

      // Calculate leave balance
      const balanceMap: Record<string, LeaveBalance> = {};
      leaveTypes.forEach(lt => {
        balanceMap[lt.id] = {
          leave_type: lt.leave_type,
          leave_name: lt.leave_name,
          yearly_quota: lt.yearly_quota,
          used: 0,
          pending: 0,
          available: lt.yearly_quota,
        };
      });

      // Calculate used and pending from applications
      if (employeeId && data) {
        const currentYear = new Date().getFullYear();
        data.forEach((app: any) => {
          const appYear = new Date(app.from_date).getFullYear();
          if (appYear === currentYear && balanceMap[app.leave_type_id]) {
            if (app.status === 'approved') {
              balanceMap[app.leave_type_id].used += app.number_of_days;
            } else if (app.status === 'pending') {
              balanceMap[app.leave_type_id].pending += app.number_of_days;
            }
          }
        });

        // Calculate available
        Object.values(balanceMap).forEach(balance => {
          balance.available = balance.yearly_quota - balance.used - balance.pending;
        });
      }

      setState({
        applications: data as LeaveApplication[],
        leaveTypes,
        leaveBalance: Object.values(balanceMap),
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching leave applications:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch leave applications',
      }));
    }
  }, [employeeId, fetchLeaveTypes]);

  // Apply for leave
  const applyForLeave = async (application: CreateLeaveApplicationDTO) => {
    try {
      // Get current user's employee ID if not provided
      let empId = employeeId;
      if (!empId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: emp } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (emp) empId = emp.id;
        }
      }

      if (!empId) {
        throw new Error('Employee ID not found');
      }

      // Calculate number of days
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
    } catch (err: any) {
      console.error('Error applying for leave:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to submit leave application",
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  // Approve leave (for managers)
  const approveLeave = async (applicationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get approver's employee ID
      let approverId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (emp) approverId = emp.id;
      }

      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Leave Approved",
        description: "The leave application has been approved.",
      });

      fetchApplications();
    } catch (err: any) {
      console.error('Error approving leave:', err);
      toast({
        title: "Error",
        description: "Failed to approve leave",
        variant: "destructive",
      });
    }
  };

  // Reject leave (for managers)
  const rejectLeave = async (applicationId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let approverId: string | null = null;
      if (user) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (emp) approverId = emp.id;
      }

      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Leave Rejected",
        description: "The leave application has been rejected.",
      });

      fetchApplications();
    } catch (err: any) {
      console.error('Error rejecting leave:', err);
      toast({
        title: "Error",
        description: "Failed to reject leave",
        variant: "destructive",
      });
    }
  };

  // Cancel leave application (by employee)
  const cancelApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .delete()
        .eq('id', applicationId)
        .eq('status', 'pending'); // Can only cancel pending applications

      if (error) throw error;

      setState(prev => ({
        ...prev,
        applications: prev.applications.filter(a => a.id !== applicationId),
      }));

      toast({
        title: "Application Cancelled",
        description: "Your leave application has been cancelled.",
      });
    } catch (err: any) {
      console.error('Error cancelling application:', err);
      toast({
        title: "Error",
        description: "Failed to cancel application. Only pending applications can be cancelled.",
        variant: "destructive",
      });
    }
  };

  // Get statistics
  const getStats = useCallback(() => {
    const pending = state.applications.filter(a => a.status === 'pending').length;
    const approved = state.applications.filter(a => a.status === 'approved').length;
    const rejected = state.applications.filter(a => a.status === 'rejected').length;
    
    return { pending, approved, rejected, total: state.applications.length };
  }, [state.applications]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    ...state,
    fetchApplications,
    applyForLeave,
    approveLeave,
    rejectLeave,
    cancelApplication,
    getStats,
  };
}

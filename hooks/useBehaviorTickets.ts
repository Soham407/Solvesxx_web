"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseTyped as any;

export interface BehaviorTicket {
  id: string;
  ticket_number: string;
  employee_id: string;
  category: string;
  severity: "low" | "medium" | "high";
  reported_by: string | null;
  description: string | null;
  evidence_urls: string[] | null;
  status: "open" | "under_review" | "resolved_warning" | "resolved_action" | "dismissed";
  resolution: string | null;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_code: string;
  };
  reporter?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateTicketDTO {
  employee_id: string;
  category: string;
  severity: string;
  description: string;
  reported_by?: string;
}

export function useBehaviorTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<BehaviorTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    underReview: 0,
    resolved: 0,
    repeatOffenders: 0
  });

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_behavior_tickets')
        .select(`
          *,
          employee:employees!employee_behavior_tickets_employee_id_fkey(first_name, last_name, employee_code),
          reporter:employees!employee_behavior_tickets_reported_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = data as unknown as BehaviorTicket[];
      setTickets(typedData);

      // Calculate stats
      const active = typedData.filter(t => t.status === 'open').length;
      const underReview = typedData.filter(t => t.status === 'under_review').length;
      const resolved = typedData.filter(t => t.status.startsWith('resolved')).length;
      
      // Simple repeat offender logic: counts > 1
      const counts: Record<string, number> = {};
      typedData.forEach(t => { counts[t.employee_id] = (counts[t.employee_id] || 0) + 1; });
      const repeatOffenders = Object.values(counts).filter(c => c > 1).length;

      setStats({ active, underReview, resolved, repeatOffenders });

    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      toast({
        title: "Error",
        description: "Failed to load behavior tickets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createTicket = async (ticket: CreateTicketDTO) => {
    try {
      // Get current user if reported_by is not set
      let reporterId = ticket.reported_by;
      if (!reporterId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Find employee record for this user
          const { data: emp } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (emp) reporterId = emp.id;
        }
      }

      const { error } = await supabase
        .from('employee_behavior_tickets')
        .insert({
          employee_id: ticket.employee_id,
          category: ticket.category as "sleeping_on_duty" | "rudeness" | "absence" | "uniform_issue" | "unauthorized_entry" | "late_arrival" | "mobile_use" | "other",
          severity: ticket.severity,
          description: ticket.description,
          reported_by: reporterId,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Ticket Raised",
        description: "Behavior ticket has been created successfully."
      });
      
      fetchTickets();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to create ticket",
        variant: "destructive"
      });
      return { success: false, error: err.message };
    }
  };

  const updateStatus = async (id: string, status: string, resolution?: string) => {
    try {
      const { error } = await supabase
        .from('employee_behavior_tickets')
        .update({ status, resolution })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Status Updated", description: `Ticket marked as ${status.replace('_', ' ')}` });
      fetchTickets();
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    isLoading,
    stats,
    createTicket,
    updateStatus,
    refresh: fetchTickets
  };
}

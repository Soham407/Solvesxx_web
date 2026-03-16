"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { RTVTicketDisplay, RTVDashboardStats } from "@/src/types/operations";

export interface CreateRTVTicketDTO {
  po_id?: string;
  supplier_id: string;
  product_id: string;
  receipt_id?: string;
  return_reason: string;
  quantity: number;
  unit_of_measurement?: string;
  estimated_value?: number;
  notes?: string;
}

export function useRTVTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<RTVTicketDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<RTVDashboardStats>({
    pendingPickup: 0,
    inTransit: 0,
    creditPendingValue: 0,
    monthlyReturnsCount: 0,
  });

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rtv_tickets')
        .select(`
          *,
          supplier:suppliers(supplier_name),
          product:products(product_name),
          purchase_order:purchase_orders(po_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure data exists before mapping
      const mappedData = (data as any[]) || [];
      setTickets(mappedData);

      // Compute statistics
      let pendingPickup = 0;
      let inTransit = 0;
      let creditPendingValue = 0;
      let monthlyReturnsCount = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      mappedData.forEach(ticket => {
        if (ticket.status === 'pending_dispatch') pendingPickup++;
        if (ticket.status === 'in_transit') inTransit++;
        if (ticket.status !== 'credit_note_issued') {
          creditPendingValue += Number(ticket.estimated_value || 0);
        }
        
        const createdAt = new Date(ticket.created_at);
        if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
          monthlyReturnsCount++;
        }
      });

      setStats({ pendingPickup, inTransit, creditPendingValue, monthlyReturnsCount });
    } catch (err: any) {
      console.error('Error fetching RTV tickets:', err);
      toast({
        title: "Error",
        description: "Failed to load Return to Vendor tickets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createTicket = async (ticket: CreateRTVTicketDTO) => {
    try {
      // Find current user id
      const { data: { user } } = await supabase.auth.getUser();

      const insertData = {
        po_id: ticket.po_id || null,
        supplier_id: ticket.supplier_id,
        product_id: ticket.product_id,
        receipt_id: ticket.receipt_id || null,
        return_reason: ticket.return_reason,
        quantity: ticket.quantity,
        unit_of_measurement: ticket.unit_of_measurement || null,
        estimated_value: ticket.estimated_value || null,
        notes: ticket.notes || null,
        status: 'pending_dispatch',
        raised_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from('rtv_tickets')
        .insert(insertData)
        .select('rtv_number')
        .single();

      if (error) throw error;

      toast({
        title: "Ticket Raised",
        description: `RTV ticket ${data.rtv_number} has been created successfully.`,
      });
      
      fetchTickets();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating RTV ticket:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to create return ticket",
        variant: "destructive"
      });
      return { success: false, error: err.message };
    }
  };

  const updateStatus = async (id: string, status: string, additionalData?: any) => {
    try {
      const updatePayload: any = { status, ...additionalData };
      
      // Handle timestamping for specific statuses
      if (status === 'in_transit') updatePayload.dispatched_at = new Date().toISOString();
      if (status === 'accepted_by_vendor') updatePayload.accepted_at = new Date().toISOString();
      if (status === 'credit_note_issued') updatePayload.credit_issued_at = new Date().toISOString();

      const { error } = await supabase
        .from('rtv_tickets')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: "Status Updated", 
        description: `Return ticket status updated successfully.` 
      });
      fetchTickets();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating RTV ticket status:', err);
      toast({ 
        title: "Error", 
        description: "Failed to update ticket status.", 
        variant: "destructive" 
      });
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchTickets();

    // Set up Realtime subscription
    const subscription = supabase
      .channel('rtv_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rtv_tickets'
        },
        (payload) => {
          console.log('RTV tickets change received!', payload);
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

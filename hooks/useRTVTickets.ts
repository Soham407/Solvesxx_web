"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { RTVTicketDisplay, RTVDashboardStats } from "@/src/types/operations";
import {
  buildRTVDashboardStats,
  mapRTVTicketRow,
  type RTVTicketRow,
} from "@/src/lib/rtv/rtvTransforms";

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

interface UseRTVTicketsOptions {
  statuses?: readonly string[];
  supplierId?: string;
}

export function useRTVTickets(options: UseRTVTicketsOptions = {}) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<RTVTicketDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<RTVDashboardStats>({
    pendingPickup: 0,
    inTransit: 0,
    creditPendingValue: 0,
    monthlyReturnsCount: 0,
  });
  const statusFilterKey = options.statuses?.join(",") ?? "";

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('rtv_tickets')
        .select(`
          *,
          supplier:suppliers(supplier_name),
          product:products(product_name),
          purchase_order:purchase_orders(po_number)
        `);

      if (options.supplierId) {
        query = query.eq('supplier_id', options.supplierId);
      }

      if (statusFilterKey) {
        query = query.in('status', statusFilterKey.split(","));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure data exists before mapping
      const mappedData: RTVTicketDisplay[] = ((data || []) as RTVTicketRow[]).map(mapRTVTicketRow);
      setTickets(mappedData);

      setStats(buildRTVDashboardStats(mappedData));
    } catch (err: unknown) {
      console.error('Error fetching RTV tickets:', err);
      toast({
        title: "Error",
        description: "Failed to load Return to Vendor tickets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [options.supplierId, statusFilterKey, toast]);

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
      } catch (err: unknown) {
      console.error('Error creating RTV ticket:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create return ticket",
        variant: "destructive"
      });
      return { success: false, error: err instanceof Error ? err.message : "Failed to create return ticket" };
    }
  };

  const updateStatus = async (id: string, status: string, additionalData?: Record<string, unknown>) => {
    try {
      const updatePayload: Record<string, unknown> = { status, ...(additionalData || {}) };
      
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
    } catch (err: unknown) {
      console.error('Error updating RTV ticket status:', err);
      toast({ 
        title: "Error", 
        description: "Failed to update ticket status.", 
        variant: "destructive" 
      });
      return { success: false, error: err instanceof Error ? err.message : "Failed to update ticket status" };
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

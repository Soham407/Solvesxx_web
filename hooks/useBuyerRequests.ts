// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type RequestStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'indent_generated'
  | 'indent_forwarded'
  | 'indent_accepted'
  | 'indent_rejected'
  | 'po_issued'
  | 'po_received'
  | 'po_dispatched'
  | 'material_received'
  | 'material_acknowledged'
  | 'bill_generated'
  | 'paid'
  | 'feedback_pending'
  | 'completed';

export interface BuyerRequest {
  id: string;
  request_number: string;
  buyer_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  preferred_delivery_date: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category_name?: string;
  location_name?: string;
}

export interface BuyerRequestItem {
  id: string;
  request_id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  // Joined data
  product_name?: string;
}

export interface CreateBuyerRequestInput {
  title: string;
  description?: string;
  category_id?: string;
  location_id?: string;
  preferred_delivery_date?: string;
  items: {
    product_id: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }[];
}

// = { label: string; className: string; buyerVisibleLabel: string }
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; className: string; buyerLabel: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground", buyerLabel: "Submitted" },
  accepted: { label: "Accepted", className: "bg-info/10 text-info", buyerLabel: "Processing" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical", buyerLabel: "Rejected" },
  indent_generated: { label: "Indent Generated", className: "bg-info/10 text-info", buyerLabel: "Processing" },
  indent_forwarded: { label: "Indent Forwarded", className: "bg-info/10 text-info", buyerLabel: "Processing" },
  indent_accepted: { label: "Indent Accepted", className: "bg-info/10 text-info", buyerLabel: "Processing" },
  indent_rejected: { label: "Indent Rejected", className: "bg-warning/10 text-warning", buyerLabel: "Delayed" },
  po_issued: { label: "PO Issued", className: "bg-success/10 text-success", buyerLabel: "Order Placed" },
  po_received: { label: "PO Received", className: "bg-success/10 text-success", buyerLabel: "Order Placed" },
  po_dispatched: { label: "PO Dispatched", className: "bg-indigo/10 text-indigo", buyerLabel: "Dispatched" },
  material_received: { label: "Material Received", className: "bg-indigo/10 text-indigo", buyerLabel: "Delivered" },
  material_acknowledged: { label: "Material Acknowledged", className: "bg-success/10 text-success", buyerLabel: "Delivered" },
  bill_generated: { label: "Bill Generated", className: "bg-success/10 text-success", buyerLabel: "Delivered" },
  paid: { label: "Paid", className: "bg-success/10 text-success", buyerLabel: "Paid" },
  feedback_pending: { label: "Feedback Pending", className: "bg-warning/10 text-warning", buyerLabel: "Awaiting Feedback" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20", buyerLabel: "Completed" },
};

// ============================================
// HOOK
// ============================================

export function useBuyerRequests() {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          product_categories (category_name),
          company_locations (location_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData: BuyerRequest[] = (data || []).map((req: any) => ({
        ...req,
        category_name: req.product_categories?.category_name,
        location_name: req.company_locations?.location_name,
      }));

      setRequests(formattedData);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRequestItems = useCallback(async (requestId: string): Promise<BuyerRequestItem[]> => {
    try {
      const { data, error } = await supabase
        .from("request_items")
        .select(`
          *,
          products (product_name)
        `)
        .eq("request_id", requestId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name,
      }));
    } catch (err: any) {
      console.error("Error fetching request items:", err);
      return [];
    }
  }, []);

  const createRequest = async (input: CreateBuyerRequestInput) => {
    try {
      setIsLoading(true);

      // 1. Create request record
      const { data: request, error: reqError } = await supabase
        .from("requests")
        .insert({
          title: input.title,
          description: input.description,
          category_id: input.category_id,
          location_id: input.location_id,
          preferred_delivery_date: input.preferred_delivery_date,
          buyer_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create items
      const itemsToInsert = input.items.map(item => ({
        request_id: request.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await fetchRequests();
      return request;
    } catch (err: any) {
      console.error("Error creating request:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: RequestStatus, reason?: string) => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (reason) {
        updates.rejection_reason = reason;
        updates.rejected_at = new Date().toISOString();
        updates.rejected_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from("requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;
      await fetchRequests();
      return true;
    } catch (err: any) {
      console.error("Error updating request status:", err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    refresh: fetchRequests,
    fetchRequestItems,
    createRequest,
    updateRequestStatus
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export type SPOStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ServicePurchaseOrder {
  id: string;
  spo_number: string;
  vendor_id: string;
  service_type: string;
  description: string;
  start_date: string;
  end_date: string | null;
  total_amount: number; // In paise
  status: SPOStatus;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Joined data
  vendor_name?: string;
  vendor_code?: string;
}

export interface SPOItem {
  id: string;
  spo_id: string;
  service_description: string;
  quantity: number;
  unit: string;
  unit_price: number; // In paise
  line_total: number; // In paise
  notes: string | null;
}

interface UseServicePurchaseOrdersState {
  orders: ServicePurchaseOrder[];
  selectedOrder: ServicePurchaseOrder | null;
  items: SPOItem[];
  isLoading: boolean;
  error: string | null;
}

export const SPO_STATUS_CONFIG: Record<SPOStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent_to_vendor: { label: "Sent to Vendor", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-primary/10 text-primary border-primary/20" },
  in_progress: { label: "In Progress", className: "bg-warning/10 text-warning border-warning/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

export function useServicePurchaseOrders() {
  const [state, setState] = useState<UseServicePurchaseOrdersState>({
    orders: [],
    selectedOrder: null,
    items: [],
    isLoading: true,
    error: null,
  });

  // Fetch all SPOs
  const fetchOrders = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("service_purchase_orders")
        .select(`
          *,
          suppliers:vendor_id (
            supplier_name,
            supplier_code
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ordersWithDetails: ServicePurchaseOrder[] = (data || []).map((order: any) => ({
        ...order,
        vendor_name: order.suppliers?.supplier_name || "Unknown",
        vendor_code: order.suppliers?.supplier_code || "N/A",
      }));

      setState((prev) => ({
        ...prev,
        orders: ordersWithDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching SPOs:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch service purchase orders",
      }));
    }
  }, []);

  // Fetch SPO items
  const fetchOrderItems = useCallback(async (spoId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_purchase_order_items")
        .select("*")
        .eq("spo_id", spoId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        items: data || [],
      }));
    } catch (err) {
      console.error("Error fetching SPO items:", err);
    }
  }, []);

  // Create new SPO
  const createOrder = useCallback(async (
    input: Omit<ServicePurchaseOrder, "id" | "spo_number" | "created_at" | "updated_at">
  ): Promise<ServicePurchaseOrder | null> => {
    try {
      // Generate SPO number
      const spoNumber = `SPO-${Date.now()}`;

      const { data, error } = await supabase
        .from("service_purchase_orders")
        .insert({
          ...input,
          spo_number: spoNumber,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchOrders();
      return data as ServicePurchaseOrder;
    } catch (err: any) {
      console.error("Error creating SPO:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "Failed to create service purchase order",
      }));
      return null;
    }
  }, [fetchOrders]);

  // Update SPO status
  const updateStatus = useCallback(async (
    spoId: string,
    newStatus: SPOStatus
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("service_purchase_orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", spoId);

      if (error) throw error;

      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("Error updating SPO status:", err);
      return false;
    }
  }, [fetchOrders]);

  // Add SPO item
  const addItem = useCallback(async (
    spoId: string,
    item: Omit<SPOItem, "id" | "spo_id" | "line_total">
  ): Promise<boolean> => {
    try {
      const lineTotal = item.unit_price * item.quantity;

      const { error } = await supabase
        .from("service_purchase_order_items")
        .insert({
          ...item,
          spo_id: spoId,
          line_total: lineTotal,
        });

      if (error) throw error;

      // Update total amount
      const { data: existingItems } = await supabase
        .from("service_purchase_order_items")
        .select("line_total")
        .eq("spo_id", spoId);

      const totalAmount = (existingItems || []).reduce(
        (sum: number, i: any) => sum + (i.line_total || 0),
        lineTotal
      );

      await supabase
        .from("service_purchase_orders")
        .update({ total_amount: totalAmount })
        .eq("id", spoId);

      await fetchOrderItems(spoId);
      await fetchOrders();
      return true;
    } catch (err) {
      console.error("Error adding SPO item:", err);
      return false;
    }
  }, [fetchOrderItems, fetchOrders]);

  const refresh = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    ...state,
    fetchOrders,
    fetchOrderItems,
    createOrder,
    updateStatus,
    addItem,
    refresh,
  };
}

export default useServicePurchaseOrders;

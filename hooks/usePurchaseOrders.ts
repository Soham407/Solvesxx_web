"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type POStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
  | "partial_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  po_number: string | null;
  indent_id: string | null;
  supplier_id: string | null;
  po_date: string | null;
  expected_delivery_date: string | null;
  status: POStatus | null;
  shipping_address: string | null;
  billing_address: string | null;
  subtotal: number | null; // In paise
  tax_amount: number | null; // In paise
  discount_amount: number | null; // In paise
  shipping_cost: number | null; // In paise
  grand_total: number | null; // In paise
  payment_terms: string | null;
  sent_to_vendor_at: string | null;
  vendor_acknowledged_at: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  supplier_name?: string;
  supplier_code?: string;
  indent_number?: string;
  total_items?: number;
}

export interface POItem {
  id: string;
  purchase_order_id: string;
  indent_item_id: string | null;
  product_id: string | null;
  item_description: string | null;
  specifications: string | null;
  ordered_quantity: number;
  unit_of_measure: string;
  received_quantity: number;
  unit_price: number; // In paise
  tax_rate: number;
  tax_amount: number; // In paise
  discount_percent: number;
  discount_amount: number; // In paise
  line_total: number; // In paise
  unmatched_qty: number | null;
  unmatched_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_code?: string;
}

export interface CreatePOInput {
  indent_id?: string;
  supplier_id: string;
  po_date?: string;
  expected_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  shipping_cost?: number; // In paise
  discount_amount?: number; // In paise
}

export interface CreatePOItemInput {
  purchase_order_id: string;
  indent_item_id?: string;
  product_id?: string;
  item_description?: string;
  specifications?: string;
  ordered_quantity: number;
  unit_of_measure?: string;
  unit_price: number; // In paise
  tax_rate?: number;
  discount_percent?: number;
  notes?: string;
}

interface UsePurchaseOrdersState {
  purchaseOrders: PurchaseOrder[];
  items: POItem[];
  selectedPO: PurchaseOrder | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ["sent_to_vendor", "cancelled"],
  sent_to_vendor: ["acknowledged", "cancelled"],
  acknowledged: ["partial_received", "received"],
  partial_received: ["received"],
  received: [], // Terminal state
  cancelled: [], // Terminal state
};

// Status display configuration
export const PO_STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent_to_vendor: { label: "Sent to Vendor", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-primary/10 text-primary border-primary/20" },
  partial_received: { label: "Partial Received", className: "bg-warning/10 text-warning border-warning/20" },
  received: { label: "Received", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (currentStatus: POStatus, targetStatus: POStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

// Convert paise to rupees for display
export const toRupees = (paise: number): number => paise / 100;

// Convert rupees to paise for storage
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

// Format currency
export const formatCurrency = (paiseAmount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toRupees(paiseAmount));
};

// Calculate line total with tax and discount
const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discountPercent: number = 0
): { lineTotal: number; taxAmount: number; discountAmount: number } => {
  const baseAmount = quantity * unitPrice;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const afterDiscount = baseAmount - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const lineTotal = afterDiscount + taxAmount;
  
  return { lineTotal, taxAmount, discountAmount };
};

// ============================================
// HOOK
// ============================================

export function usePurchaseOrders(filters?: { status?: POStatus; supplierId?: string }) {
  const [state, setState] = useState<UsePurchaseOrdersState>({
    purchaseOrders: [],
    items: [],
    selectedPO: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH PURCHASE ORDERS
  // ============================================
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers!supplier_id (
            supplier_name,
            supplier_code
          ),
          indents!indent_id (
            indent_number
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const posWithDetails: PurchaseOrder[] = (data || []).map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.supplier_name || "Unknown",
        supplier_code: po.suppliers?.supplier_code || "N/A",
        indent_number: po.indents?.indent_number || null,
      }));

      setState((prev) => ({
        ...prev,
        purchaseOrders: posWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch purchase orders";
      console.error("Error fetching purchase orders:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.supplierId]);

  // ============================================
  // FETCH PO ITEMS
  // ============================================
  const fetchPOItems = useCallback(async (poId: string): Promise<POItem[]> => {
    try {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          products!product_id (
            product_name,
            product_code
          )
        `)
        .eq("purchase_order_id", poId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const itemsWithDetails: POItem[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || null,
        product_code: item.products?.product_code || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching PO items:", err);
      return [];
    }
  }, []);

  // ============================================
  // GET PO WITH ITEMS
  // ============================================
  const getPOWithItems = useCallback(async (poId: string): Promise<{ po: PurchaseOrder | null; items: POItem[] }> => {
    try {
      // Fetch PO details
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers!supplier_id (
            supplier_name
          ),
          indents!indent_id (
            indent_number
          )
        `)
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      const po: PurchaseOrder = {
        ...poData,
        supplier_name: poData.suppliers?.supplier_name || "Unknown",
        indent_number: poData.indents?.indent_number ?? undefined,
      };

      // Fetch items
      const items = await fetchPOItems(poId);

      setState((prev) => ({ ...prev, selectedPO: po, items }));
      return { po, items };
    } catch (err: unknown) {
      console.error("Error fetching PO with items:", err);
      return { po: null, items: [] };
    }
  }, [fetchPOItems]);

  // ============================================
  // CREATE PURCHASE ORDER
  // ============================================
  const createPurchaseOrder = useCallback(async (input: CreatePOInput): Promise<PurchaseOrder | null> => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          indent_id: input.indent_id,
          supplier_id: input.supplier_id,
          po_date: input.po_date || new Date().toISOString().split('T')[0],
          expected_delivery_date: input.expected_delivery_date,
          shipping_address: input.shipping_address,
          billing_address: input.billing_address,
          payment_terms: input.payment_terms,
          shipping_cost: input.shipping_cost || 0,
          discount_amount: input.discount_amount || 0,
          notes: input.notes,
          terms_and_conditions: input.terms_and_conditions,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      return data as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create purchase order";
      console.error("Error creating purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // CREATE PO FROM INDENT
  // ============================================
  const createPOFromIndent = useCallback(async (
    indentId: string,
    supplierId: string,
    options?: {
      expected_delivery_date?: string;
      shipping_address?: string;
      billing_address?: string;
      payment_terms?: string;
      notes?: string;
    }
  ): Promise<PurchaseOrder | null> => {
    try {
      // Fetch indent details
      const { data: indent, error: indentError } = await supabase
        .from("indents")
        .select("*")
        .eq("id", indentId)
        .single();

      if (indentError) throw indentError;

      if (indent.status !== "approved") {
        throw new Error("Only approved indents can be converted to PO");
      }

      // Fetch indent items
      const { data: indentItems, error: itemsError } = await supabase
        .from("indent_items")
        .select("*")
        .eq("indent_id", indentId);

      if (itemsError) throw itemsError;

      if (!indentItems || indentItems.length === 0) {
        throw new Error("Indent has no items");
      }

      // Create PO
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          indent_id: indentId,
          supplier_id: supplierId,
          po_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: options?.expected_delivery_date,
          shipping_address: options?.shipping_address,
          billing_address: options?.billing_address,
          payment_terms: options?.payment_terms,
          notes: options?.notes || `Created from indent ${indent.indent_number}`,
          status: "draft",
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create PO items from indent items
      const poItems = indentItems.map((item: any) => ({
        purchase_order_id: po.id,
        indent_item_id: item.id,
        product_id: item.product_id,
        item_description: item.item_description,
        specifications: item.specifications,
        ordered_quantity: item.approved_quantity || item.requested_quantity,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.estimated_unit_price || 0,
        tax_rate: 0,
        tax_amount: 0,
        discount_percent: 0,
        discount_amount: 0,
        line_total: (item.approved_quantity || item.requested_quantity) * (item.estimated_unit_price || 0),
        unmatched_qty: item.approved_quantity || item.requested_quantity,
        unmatched_amount: (item.approved_quantity || item.requested_quantity) * (item.estimated_unit_price || 0),
        notes: item.notes,
      }));

      const { error: poItemsError } = await supabase
        .from("purchase_order_items")
        .insert(poItems);

      if (poItemsError) throw poItemsError;

      // Update indent status to po_created
      const { error: updateIndentError } = await supabase
        .from("indents")
        .update({
          status: "po_created",
          po_created_at: new Date().toISOString(),
          linked_po_id: po.id,
        })
        .eq("id", indentId);

      if (updateIndentError) {
        console.warn("Warning: Failed to update indent status:", updateIndentError);
      }

      await fetchPurchaseOrders();
      return po as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create PO from indent";
      console.error("Error creating PO from indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // UPDATE PURCHASE ORDER
  // ============================================
  const updatePurchaseOrder = useCallback(async (
    poId: string,
    updates: Partial<CreatePOInput>
  ): Promise<PurchaseOrder | null> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (po && po.status !== "draft") {
        throw new Error("Only draft purchase orders can be edited");
      }

      const { data, error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", poId)
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      return data as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update purchase order";
      console.error("Error updating purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // DELETE PURCHASE ORDER
  // ============================================
  const deletePurchaseOrder = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (po && po.status !== "draft") {
        throw new Error("Only draft purchase orders can be deleted");
      }

      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete purchase order";
      console.error("Error deleting purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // ADD PO ITEM
  // ============================================
  const addPOItem = useCallback(async (input: CreatePOItemInput): Promise<POItem | null> => {
    try {
      // Calculate totals
      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        input.ordered_quantity,
        input.unit_price,
        input.tax_rate,
        input.discount_percent
      );

      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert({
          purchase_order_id: input.purchase_order_id,
          indent_item_id: input.indent_item_id,
          product_id: input.product_id,
          item_description: input.item_description,
          specifications: input.specifications,
          ordered_quantity: input.ordered_quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          unit_price: input.unit_price,
          tax_rate: input.tax_rate || 0,
          tax_amount: taxAmount,
          discount_percent: input.discount_percent || 0,
          discount_amount: discountAmount,
          line_total: lineTotal,
          unmatched_qty: input.ordered_quantity,
          unmatched_amount: lineTotal,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPOItems(input.purchase_order_id);
      await fetchPurchaseOrders();
      return data as POItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add PO item";
      console.error("Error adding PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // UPDATE PO ITEM
  // ============================================
  const updatePOItem = useCallback(async (
    itemId: string,
    updates: Partial<CreatePOItemInput>
  ): Promise<POItem | null> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      // Recalculate if quantity or price changed
      const quantity = updates.ordered_quantity ?? item.ordered_quantity;
      const unitPrice = updates.unit_price ?? item.unit_price;
      const taxRate = updates.tax_rate ?? item.tax_rate;
      const discountPercent = updates.discount_percent ?? item.discount_percent;

      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        quantity,
        unitPrice,
        taxRate,
        discountPercent
      );

      const updateData = {
        ...updates,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        line_total: lineTotal,
        unmatched_qty: quantity - (item.received_quantity || 0),
        unmatched_amount: lineTotal,
      };

      const { data, error } = await supabase
        .from("purchase_order_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      await fetchPOItems(item.purchase_order_id);
      await fetchPurchaseOrders();
      return data as POItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update PO item";
      console.error("Error updating PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.items, fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // DELETE PO ITEM
  // ============================================
  const deletePOItem = useCallback(async (itemId: string, poId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await fetchPOItems(poId);
      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete PO item";
      console.error("Error deleting PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // SEND TO VENDOR
  // ============================================
  const sendToVendor = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new Error("Purchase order not found");

      if (!po.status || !canTransition(po.status, "sent_to_vendor")) {
        throw new Error(`Cannot send to vendor from status: ${po.status}`);
      }

      // Validate PO has items
      const items = await fetchPOItems(poId);
      if (items.length === 0) {
        throw new Error("Cannot send PO without items");
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "sent_to_vendor",
          sent_to_vendor_at: new Date().toISOString(),
        })
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send to vendor";
      console.error("Error sending to vendor:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // ACKNOWLEDGE PO (Vendor Acknowledged)
  // ============================================
  const acknowledgePO = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new Error("Purchase order not found");

      if (!po.status || !canTransition(po.status, "acknowledged")) {
        throw new Error(`Cannot acknowledge from status: ${po.status}`);
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "acknowledged",
          vendor_acknowledged_at: new Date().toISOString(),
        })
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to acknowledge PO";
      console.error("Error acknowledging PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // UPDATE PO STATUS
  // ============================================
  const updatePOStatus = useCallback(async (
    poId: string,
    newStatus: POStatus
  ): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new Error("Purchase order not found");

      if (!po.status || !canTransition(po.status, newStatus)) {
        throw new Error(`Cannot transition from ${po.status} to ${newStatus}`);
      }

      const updateData: any = { status: newStatus };

      // Set timestamps based on status
      if (newStatus === "sent_to_vendor") {
        updateData.sent_to_vendor_at = new Date().toISOString();
      } else if (newStatus === "acknowledged") {
        updateData.vendor_acknowledged_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update PO status";
      console.error("Error updating PO status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // CANCEL PO
  // ============================================
  const cancelPO = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) throw new Error("Purchase order not found");

      if (!po.status || !canTransition(po.status, "cancelled")) {
        throw new Error(`Cannot cancel PO from status: ${po.status}`);
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "cancelled" })
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel PO";
      console.error("Error cancelling PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // UPDATE RECEIVED QUANTITY (for partial/full receipt)
  // ============================================
  const updateReceivedQuantity = useCallback(async (
    itemId: string,
    receivedQty: number
  ): Promise<boolean> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      if (receivedQty > item.ordered_quantity) {
        throw new Error("Received quantity cannot exceed ordered quantity");
      }

      const unmatchedQty = item.ordered_quantity - receivedQty;
      const unmatchedAmount = Math.round((unmatchedQty / item.ordered_quantity) * item.line_total);

      const { error } = await supabase
        .from("purchase_order_items")
        .update({
          received_quantity: receivedQty,
          unmatched_qty: unmatchedQty,
          unmatched_amount: unmatchedAmount,
        })
        .eq("id", itemId);

      if (error) throw error;

      // Check if all items are received to update PO status
      const allItems = await fetchPOItems(item.purchase_order_id);
      const totalOrdered = allItems.reduce((sum, i) => sum + i.ordered_quantity, 0);
      const totalReceived = allItems.reduce((sum, i) => sum + (i.received_quantity || 0), 0);

      if (totalReceived >= totalOrdered) {
        await updatePOStatus(item.purchase_order_id, "received");
      } else if (totalReceived > 0) {
        const po = state.purchaseOrders.find((p) => p.id === item.purchase_order_id);
        if (po && po.status === "acknowledged") {
          await updatePOStatus(item.purchase_order_id, "partial_received");
        }
      }

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update received quantity";
      console.error("Error updating received quantity:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.items, state.purchaseOrders, fetchPOItems, updatePOStatus, fetchPurchaseOrders]);

  // ============================================
  // SELECT PO
  // ============================================
  const selectPO = useCallback(async (poId: string | null) => {
    if (!poId) {
      setState((prev) => ({ ...prev, selectedPO: null, items: [] }));
      return;
    }

    const po = state.purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setState((prev) => ({ ...prev, selectedPO: po }));
      await fetchPOItems(poId);
    }
  }, [state.purchaseOrders, fetchPOItems]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getPOById = useCallback(
    (id: string): PurchaseOrder | undefined => {
      return state.purchaseOrders.find((p) => p.id === id);
    },
    [state.purchaseOrders]
  );

  const getDraftPOs = useCallback((): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => p.status === "draft");
  }, [state.purchaseOrders]);

  const getActivePOs = useCallback((): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => 
      p.status && ["sent_to_vendor", "acknowledged", "partial_received"].includes(p.status)
    );
  }, [state.purchaseOrders]);

  const getPOsBySupplier = useCallback((supplierId: string): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => p.supplier_id === supplierId);
  }, [state.purchaseOrders]);

  const refresh = useCallback(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    purchaseOrders: state.purchaseOrders,
    items: state.items,
    selectedPO: state.selectedPO,
    isLoading: state.isLoading,
    error: state.error,

    // PO Operations
    fetchPurchaseOrders,
    createPurchaseOrder,
    createPOFromIndent,
    updatePurchaseOrder,
    deletePurchaseOrder,
    selectPO,
    getPOWithItems,

    // Item Operations
    fetchPOItems,
    addPOItem,
    updatePOItem,
    deletePOItem,
    updateReceivedQuantity,

    // Workflow Operations
    sendToVendor,
    acknowledgePO,
    updatePOStatus,
    cancelPO,

    // Helpers
    getPOById,
    getDraftPOs,
    getActivePOs,
    getPOsBySupplier,
    canTransition,
    formatCurrency,

    // Refresh
    refresh,
  };
}

export default usePurchaseOrders;

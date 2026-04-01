"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import type { RequestStatus } from "./useBuyerRequests";
import { PO_RECEIPT_READY_STATUSES } from "./usePurchaseOrders";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

export type GRNStatus =
  | "draft"
  | "inspecting"
  | "accepted"
  | "partial_accepted"
  | "rejected";

export type QualityStatus = "accepted" | "rejected" | "partial";

export const GRN_STATUSES_WITH_RECEIVED_MATERIAL: readonly GRNStatus[] = [
  "accepted",
  "partial_accepted",
];

export const REQUEST_STATUSES_READY_FOR_MATERIAL_RECEIVED: readonly RequestStatus[] = [
  "po_received",
  "po_dispatched",
];

export interface MaterialReceipt {
  id: string;
  grn_number: string;
  purchase_order_id: string | null;
  supplier_id: string | null;
  received_date: string;
  received_by: string | null;
  warehouse_id: string | null;
  status: GRNStatus;
  quality_checked_by: string | null;
  quality_checked_at: string | null;
  total_received_value: number; // In paise
  delivery_challan_number: string | null;
  vehicle_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  po_number?: string;
  supplier_name?: string;
  supplier_code?: string;
  warehouse_name?: string;
  received_by_name?: string;
  total_items?: number;
}

export interface GRNItem {
  id: string;
  material_receipt_id: string;
  po_item_id: string | null;
  product_id: string | null;
  item_description: string | null;
  ordered_quantity: number | null;
  received_quantity: number;
  accepted_quantity: number | null;
  rejected_quantity: number;
  quality_status: QualityStatus;
  rejection_reason: string | null;
  unit_price: number | null; // In paise
  line_total: number | null; // In paise
  unmatched_qty: number | null;
  unmatched_amount: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_code?: string;
}

export interface CreateGRNInput {
  purchase_order_id: string;
  supplier_id?: string;
  received_date?: string;
  received_by?: string;
  warehouse_id?: string;
  delivery_challan_number?: string;
  vehicle_number?: string;
  notes?: string;
}

export interface CreateGRNItemInput {
  material_receipt_id: string;
  po_item_id?: string;
  product_id?: string;
  item_description?: string;
  ordered_quantity?: number;
  received_quantity: number;
  accepted_quantity?: number;
  rejected_quantity?: number;
  quality_status?: QualityStatus;
  rejection_reason?: string;
  unit_price?: number; // In paise
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface UseGRNState {
  materialReceipts: MaterialReceipt[];
  items: GRNItem[];
  selectedGRN: MaterialReceipt | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<GRNStatus, GRNStatus[]> = {
  draft: ["inspecting", "accepted", "rejected"],
  inspecting: ["accepted", "partial_accepted", "rejected"],
  accepted: [], // Terminal state
  partial_accepted: [], // Terminal state
  rejected: [], // Terminal state
};

// Status display configuration
export const GRN_STATUS_CONFIG: Record<GRNStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  inspecting: { label: "Inspecting", className: "bg-info/10 text-info border-info/20" },
  accepted: { label: "Accepted", className: "bg-success/10 text-success border-success/20" },
  partial_accepted: { label: "Partial Accepted", className: "bg-warning/10 text-warning border-warning/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

export const QUALITY_STATUS_CONFIG: Record<QualityStatus, { label: string; className: string }> = {
  accepted: { label: "Accepted", className: "bg-success/10 text-success border-success/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const canTransition = (currentStatus: GRNStatus, targetStatus: GRNStatus): boolean => {
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

/**
 * Validates if a GRN item can be added to stock.
 * Throws an error if validation fails.
 */
export const validateGRNItemForStock = (item: GRNItem): void => {
  if (item.quality_status === "rejected") {
    throw new Error("Cannot add rejected material to stock");
  }

  if (item.accepted_quantity === null || item.accepted_quantity === undefined || item.accepted_quantity <= 0) {
    throw new Error("No accepted quantity to add to stock");
  }

  if (item.quality_status === "partial" && (item.accepted_quantity || 0) <= 0) {
    throw new Error("Partial item with zero accepted quantity cannot be added to stock");
  }
};

/**
 * Calculates updates for a GRN item based on quality status.
 */
export const calculateGRNItemUpdates = (
  item: { received_quantity: number; unit_price: number | null; accepted_quantity?: number | null; rejected_quantity?: number | null },
  status: QualityStatus,
  providedAcceptedQty?: number,
  providedRejectedQty?: number
) => {
  const updates: any = { quality_status: status };
  const receivedQty = item.received_quantity;
  const unitPrice = item.unit_price || 0;
  
  if (status === "rejected") {
    updates.accepted_quantity = 0;
    updates.rejected_quantity = receivedQty;
    updates.line_total = 0;
  } else if (status === "accepted") {
    updates.accepted_quantity = receivedQty;
    updates.rejected_quantity = 0;
    updates.line_total = unitPrice * receivedQty;
  } else if (status === "partial") {
    const accepted = providedAcceptedQty ?? item.accepted_quantity ?? 0;
    const rejected = providedRejectedQty ?? item.rejected_quantity ?? 0;
    
    if (accepted + rejected > receivedQty) {
      throw new Error(`Total quantity (${accepted + rejected}) exceeds received quantity (${receivedQty})`);
    }
    
    updates.accepted_quantity = accepted;
    updates.rejected_quantity = rejected;
    updates.line_total = unitPrice * accepted;
  }
  
  return updates;
};

// ============================================
// HOOK
// ============================================

export function useGRN(filters?: { status?: GRNStatus; poId?: string; supplierId?: string; searchTerm?: string }) {
  const [state, setState] = useState<UseGRNState>({
    materialReceipts: [],
    items: [],
    selectedGRN: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH GRNS
  // ============================================
  const fetchGRNs = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("material_receipts")
        .select(`
          *,
          purchase_orders!purchase_order_id (
            po_number
          ),
          suppliers!supplier_id (
            supplier_name
          ),
          warehouses!warehouse_id (
            warehouse_name
          ),
          employees!received_by (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.poId) {
        query = query.eq("purchase_order_id", filters.poId);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters?.searchTerm) {
        const term = filters.searchTerm;
        query = query.or(
          `grn_number.ilike.%${term}%,notes.ilike.%${term}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const grnsWithDetails: MaterialReceipt[] = (data || []).map((grn: any) => ({
        ...grn,
        po_number: grn.purchase_orders?.po_number || null,
        supplier_name: grn.suppliers?.supplier_name || "Unknown",
        supplier_code: grn.suppliers?.supplier_code || "N/A",
        warehouse_name: grn.warehouses?.warehouse_name || null,
        received_by_name: grn.employees
          ? [grn.employees.first_name, grn.employees.last_name].filter(Boolean).join(" ").trim()
          : null,
      }));

      setState((prev) => ({
        ...prev,
        materialReceipts: grnsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch GRNs";
      console.error("Error fetching GRNs:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.poId, filters?.supplierId, filters?.searchTerm]);

  // ============================================
  // FETCH GRN ITEMS
  // ============================================
  const fetchGRNItems = useCallback(async (grnId: string): Promise<GRNItem[]> => {
    try {
      const { data, error } = await supabase
        .from("material_receipt_items")
        .select(`
          *,
          products!product_id (
            product_name,
            product_code
          )
        `)
        .eq("material_receipt_id", grnId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const itemsWithDetails: GRNItem[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || null,
        product_code: item.products?.product_code || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching GRN items:", err);
      return [];
    }
  }, []);

  // ============================================
  // CREATE GRN
  // ============================================
  const createGRN = useCallback(async (input: CreateGRNInput): Promise<MaterialReceipt | null> => {
    try {
      // Get PO details to auto-fill supplier if not provided
      let supplierId = input.supplier_id;
      if (!supplierId && input.purchase_order_id) {
        const { data: po } = await supabase
          .from("purchase_orders")
          .select("supplier_id")
          .eq("id", input.purchase_order_id)
          .single();
        
        if (po?.supplier_id) {
          supplierId = po.supplier_id ?? undefined;
        }
      }

      const { data, error } = await supabase
        .from("material_receipts")
        .insert({
          purchase_order_id: input.purchase_order_id,
          supplier_id: supplierId,
          received_date: input.received_date || new Date().toISOString().split('T')[0],
          received_by: input.received_by,
          warehouse_id: input.warehouse_id,
          delivery_challan_number: input.delivery_challan_number,
          vehicle_number: input.vehicle_number,
          notes: input.notes,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchGRNs();
      return data as MaterialReceipt;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create GRN";
      console.error("Error creating GRN:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchGRNs]);

  // ============================================
  // CREATE GRN FROM PO
  // ============================================
  const createGRNFromPO = useCallback(async (
    poId: string,
    options?: {
      received_date?: string;
      received_by?: string;
      warehouse_id?: string;
      delivery_challan_number?: string;
      vehicle_number?: string;
      notes?: string;
    }
  ): Promise<MaterialReceipt | null> => {
    try {
      // Fetch PO details
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      if (!PO_RECEIPT_READY_STATUSES.includes(po.status)) {
        throw new Error("PO must be acknowledged or dispatched before creating GRN");
      }

      // Fetch PO items
      const { data: poItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", poId);

      if (itemsError) throw itemsError;

      if (!poItems || poItems.length === 0) {
        throw new Error("PO has no items");
      }

      // Create GRN
      const { data: grn, error: grnError } = await supabase
        .from("material_receipts")
        .insert({
          purchase_order_id: poId,
          supplier_id: po.supplier_id,
          received_date: options?.received_date || new Date().toISOString().split('T')[0],
          received_by: options?.received_by,
          warehouse_id: options?.warehouse_id,
          delivery_challan_number: options?.delivery_challan_number,
          vehicle_number: options?.vehicle_number,
          notes: options?.notes || `GRN for PO ${po.po_number}`,
          status: "draft",
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Create GRN items from PO items
      const grnItems = poItems.map((item: any) => ({
        material_receipt_id: grn.id,
        po_item_id: item.id,
        product_id: item.product_id,
        item_description: item.item_description,
        ordered_quantity: item.ordered_quantity,
        received_quantity: 0, // To be filled during receipt
        accepted_quantity: 0,
        rejected_quantity: 0,
        quality_status: "accepted" as QualityStatus,
        unit_price: item.unit_price,
        line_total: 0,
        unmatched_qty: item.ordered_quantity,
        unmatched_amount: item.line_total,
        notes: item.notes,
      }));

      const { error: grnItemsError } = await supabase
        .from("material_receipt_items")
        .insert(grnItems);

      if (grnItemsError) throw grnItemsError;

      await fetchGRNs();
      return grn as MaterialReceipt;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create GRN from PO";
      console.error("Error creating GRN from PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchGRNs]);

  // ============================================
  // UPDATE GRN
  // ============================================
  const updateGRN = useCallback(async (
    grnId: string,
    updates: Partial<CreateGRNInput>
  ): Promise<MaterialReceipt | null> => {
    try {
      const grn = state.materialReceipts.find((g) => g.id === grnId);
      if (grn && grn.status !== "draft") {
        throw new Error("Only draft GRNs can be edited");
      }

      const { data, error } = await supabase
        .from("material_receipts")
        .update(updates)
        .eq("id", grnId)
        .select()
        .single();

      if (error) throw error;

      await fetchGRNs();
      return data as MaterialReceipt;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update GRN";
      console.error("Error updating GRN:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.materialReceipts, fetchGRNs]);

  // ============================================
  // DELETE GRN
  // ============================================
  const deleteGRN = useCallback(async (grnId: string): Promise<boolean> => {
    try {
      const grn = state.materialReceipts.find((g) => g.id === grnId);
      if (grn && grn.status !== "draft") {
        throw new Error("Only draft GRNs can be deleted");
      }

      const { error } = await supabase
        .from("material_receipts")
        .delete()
        .eq("id", grnId);

      if (error) throw error;

      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete GRN";
      console.error("Error deleting GRN:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.materialReceipts, fetchGRNs]);

  // ============================================
  // RECORD ITEM RECEIPT
  // ============================================
  const recordItemReceipt = useCallback(async (
    itemId: string,
    receivedQty: number,
    acceptedQty?: number,
    rejectedQty?: number,
    qualityStatus?: QualityStatus,
    rejectionReason?: string,
    batchNumber?: string,
    expiryDate?: string
  ): Promise<boolean> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      // Validate quantities
      if (receivedQty < 0 || (acceptedQty !== undefined && acceptedQty < 0) || (rejectedQty !== undefined && rejectedQty < 0)) {
        throw new Error("Quantities cannot be negative");
      }

      // Use existing values if not provided, but only if they still sum up to the new receivedQty
      // Otherwise default to accepted = receivedQty
      let accepted = acceptedQty;
      let rejected = rejectedQty;

      if (accepted === undefined && rejected === undefined) {
        if (item.accepted_quantity !== null && (item.accepted_quantity + item.rejected_quantity === receivedQty)) {
          accepted = item.accepted_quantity;
          rejected = item.rejected_quantity;
        } else if (item.quality_status === "rejected") {
          accepted = 0;
          rejected = receivedQty;
        } else {
          accepted = receivedQty;
          rejected = 0;
        }
      } else {
        accepted = accepted !== undefined ? accepted : Math.max(0, receivedQty - (rejected || 0));
        rejected = rejected !== undefined ? rejected : Math.max(0, receivedQty - (accepted || 0));
      }
      
      if (accepted + rejected !== receivedQty) {
        throw new Error(`Quantity mismatch: Accepted (${accepted}) + Rejected (${rejected}) must equal Received quantity (${receivedQty})`);
      }

      if (item.ordered_quantity && receivedQty > item.ordered_quantity) {
        // Business rule: We allow over-receipt but log it. 
        // For strict compliance we could block it, but PRD says "Verify if physical count matches PO"
        // Let's add a warning flag or handle it.
      }

      // Calculate line total
      const lineTotal = item.unit_price ? item.unit_price * accepted : 0;
      
      // Determine quality status automatically if not provided
      let status = qualityStatus;
      if (!status) {
        if (rejected === 0 && accepted === receivedQty) {
          status = "accepted";
        } else if (accepted === 0) {
          status = "rejected";
        } else {
          status = "partial";
        }
      }

      // Calculate unmatched for reconciliation
      const orderedQty = item.ordered_quantity || 0;
      const unmatchedQty = orderedQty - accepted;
      const unmatchedAmount = item.unit_price ? item.unit_price * unmatchedQty : 0;

      const { error } = await supabase
        .from("material_receipt_items")
        .update({
          received_quantity: receivedQty,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          quality_status: status,
          rejection_reason: rejectionReason,
          line_total: lineTotal,
          unmatched_qty: unmatchedQty,
          unmatched_amount: unmatchedAmount,
          batch_number: batchNumber,
          expiry_date: expiryDate,
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update GRN total received value
      await recalculateGRNTotals(item.material_receipt_id);
      
      await fetchGRNItems(item.material_receipt_id);
      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record item receipt";
      console.error("Error recording item receipt:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.items, fetchGRNItems, fetchGRNs]);

  // ============================================
  // RECALCULATE GRN TOTALS
  // ============================================
  const recalculateGRNTotals = useCallback(async (grnId: string): Promise<void> => {
    try {
      const { data: items } = await supabase
        .from("material_receipt_items")
        .select("line_total")
        .eq("material_receipt_id", grnId);

      const totalValue = (items || []).reduce((sum: number, item: any) => sum + (item.line_total || 0), 0);

      await supabase
        .from("material_receipts")
        .update({ total_received_value: totalValue })
        .eq("id", grnId);
    } catch (err) {
      console.error("Error recalculating GRN totals:", err);
    }
  }, []);

  // ============================================
  // UPDATE GRN ITEM QUALITY
  // ============================================
  const updateGRNItemQuality = useCallback(async (
    itemId: string,
    status: QualityStatus,
    acceptedQty?: number,
    rejectedQty?: number
  ): Promise<boolean> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      const updates = calculateGRNItemUpdates(item, status, acceptedQty, rejectedQty);

      const { error } = await supabase
        .from("material_receipt_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;

      // Update GRN total received value
      await recalculateGRNTotals(item.material_receipt_id);
      
      await fetchGRNItems(item.material_receipt_id);
      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update item quality";
      console.error("Error updating item quality:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.items, fetchGRNItems, fetchGRNs, recalculateGRNTotals]);

  // ============================================
  // ADD ITEM TO STOCK
  // ============================================
  const addToStock = useCallback(async (
    item: GRNItem,
    warehouseId: string
  ): Promise<boolean> => {
    try {
      validateGRNItemForStock(item);

      const { error } = await supabase
        .from("stock_transactions")
        .insert({
          product_id: item.product_id,
          location_id: warehouseId,
          quantity: item.accepted_quantity,
          transaction_type: "IN",
          reference_type: "GRN_ITEM",
          reference_id: item.id,
          transaction_date: new Date().toISOString(),
          transaction_number: `ST-${Date.now()}`,
          unit_of_measurement: "unit",
          batch_number: item.batch_number,
        });

      if (error) throw error;

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add to stock";
      console.error("Error adding to stock:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // ============================================
  // ADD GRN ITEM
  // ============================================
  const addGRNItem = useCallback(async (input: CreateGRNItemInput): Promise<GRNItem | null> => {
    try {
      const accepted = input.accepted_quantity ?? input.received_quantity;
      const rejected = input.rejected_quantity ?? 0;
      const lineTotal = input.unit_price ? input.unit_price * accepted : 0;

      const { data, error } = await supabase
        .from("material_receipt_items")
        .insert({
          material_receipt_id: input.material_receipt_id,
          po_item_id: input.po_item_id,
          product_id: input.product_id,
          item_description: input.item_description,
          ordered_quantity: input.ordered_quantity,
          received_quantity: input.received_quantity,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          quality_status: input.quality_status || "accepted",
          rejection_reason: input.rejection_reason,
          unit_price: input.unit_price,
          line_total: lineTotal,
          unmatched_qty: input.received_quantity,
          unmatched_amount: lineTotal,
          batch_number: input.batch_number,
          expiry_date: input.expiry_date,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await recalculateGRNTotals(input.material_receipt_id);
      await fetchGRNItems(input.material_receipt_id);
      await fetchGRNs();
      return data as GRNItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add GRN item";
      console.error("Error adding GRN item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [recalculateGRNTotals, fetchGRNItems, fetchGRNs]);

  // ============================================
  // DELETE GRN ITEM
  // ============================================
  const deleteGRNItem = useCallback(async (itemId: string, grnId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("material_receipt_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await recalculateGRNTotals(grnId);
      await fetchGRNItems(grnId);
      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete GRN item";
      console.error("Error deleting GRN item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [recalculateGRNTotals, fetchGRNItems, fetchGRNs]);

  // ============================================
  // START INSPECTION
  // ============================================
  const startInspection = useCallback(async (grnId: string): Promise<boolean> => {
    try {
      const grn = state.materialReceipts.find((g) => g.id === grnId);
      if (!grn) throw new Error("GRN not found");

      if (!canTransition(grn.status, "inspecting")) {
        throw new Error(`Cannot start inspection from status: ${grn.status}`);
      }

      const { error } = await supabase
        .from("material_receipts")
        .update({ status: "inspecting" })
        .eq("id", grnId);

      if (error) throw error;

      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start inspection";
      console.error("Error starting inspection:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.materialReceipts, fetchGRNs]);

  // ============================================
  // UPDATE PO RECEIVED QUANTITIES
  // ============================================
  const updatePOReceivedQuantities = useCallback(async (poId: string): Promise<void> => {
    try {
      // Get all GRN items for this PO
      const { data: grnItems } = await supabase
        .from("material_receipt_items")
        .select(`
          po_item_id,
          accepted_quantity,
          material_receipts!inner (
            purchase_order_id,
            status
          )
        `)
        .eq("material_receipts.purchase_order_id", poId)
        .in("material_receipts.status", ["accepted", "partial_accepted"]);

      if (!grnItems) return;

      // Aggregate received quantities by PO item
      const receivedByItem: Record<string, number> = {};
      for (const item of grnItems) {
        if (item.po_item_id) {
          receivedByItem[item.po_item_id] = (receivedByItem[item.po_item_id] || 0) + (item.accepted_quantity || 0);
        }
      }

      // Update PO items in parallel to avoid N+1 sequential writes
      await Promise.all(
        Object.entries(receivedByItem).map(([poItemId, receivedQty]) =>
          supabase
            .from("purchase_order_items")
            .update({ received_quantity: receivedQty })
            .eq("id", poItemId)
        )
      );

      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error: rpcError } = await supabase.rpc('update_po_receipt_status' as any, {
        p_po_id: poId,
        p_user_id: user?.id,
      });

      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (rpcResult?.success === false) {
        throw new Error(rpcResult?.error || "PO receipt status update failed");
      }
    } catch (err) {
      console.error("Error updating PO received quantities:", err);
    }
  }, []);

  // ============================================
  // COMPLETE QUALITY CHECK
  // ============================================
  const completeQualityCheck = useCallback(async (
    grnId: string,
    checkedBy: string
  ): Promise<boolean> => {
    try {
      const grn = state.materialReceipts.find((g) => g.id === grnId);
      if (!grn) throw new Error("GRN not found");

      // Get items to determine final status
      const items = await fetchGRNItems(grnId);
      
      if (items.length === 0) {
        throw new Error("GRN has no items");
      }

      // Determine final status based on items
      const totalAccepted = items.reduce((sum: number, i: any) => sum + (i.accepted_quantity || 0), 0);
      const totalRejected = items.reduce((sum: number, i: any) => sum + (i.rejected_quantity || 0), 0);
      const totalOrdered = items.reduce((sum: number, i: any) => sum + (i.ordered_quantity || 0), 0);

      let newStatus: GRNStatus;
      if (totalRejected === 0 && totalAccepted >= totalOrdered) {
        newStatus = "accepted";
      } else if (totalAccepted === 0) {
        newStatus = "rejected";
      } else {
        newStatus = "partial_accepted";
      }

      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from("material_receipts")
        .update({
          status: newStatus,
          quality_checked_by: checkedBy,
          quality_checked_at: completedAt,
        })
        .eq("id", grnId);

      if (error) throw error;

      // Update PO received quantities and status if applicable
      if (grn.purchase_order_id) {
        await updatePOReceivedQuantities(grn.purchase_order_id);
      }

      // Advance the linked buyer request once any material has passed GRN quality checks.
      if (
        grn.purchase_order_id &&
        GRN_STATUSES_WITH_RECEIVED_MATERIAL.includes(newStatus)
      ) {
        const { data: po, error: poError } = await supabase
          .from("purchase_orders")
          .select("indent_id")
          .eq("id", grn.purchase_order_id)
          .maybeSingle();

        if (poError) throw poError;

        if (po?.indent_id) {
          const { error: requestError } = await supabase
            .from("requests")
            .update({
              status: "material_received" as RequestStatus,
              updated_at: completedAt,
            })
            .eq("indent_id", po.indent_id)
            .in("status", [...REQUEST_STATUSES_READY_FOR_MATERIAL_RECEIVED]);

          if (requestError) throw requestError;
        }
      }

      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete quality check";
      console.error("Error completing quality check:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.materialReceipts, fetchGRNItems, fetchGRNs, updatePOReceivedQuantities]);

  // ============================================
  // REJECT GRN
  // ============================================
  const rejectGRN = useCallback(async (grnId: string, reason: string): Promise<boolean> => {
    try {
      if (!reason?.trim()) {
        throw new Error("Rejection reason is required");
      }

      const grn = state.materialReceipts.find((g) => g.id === grnId);
      if (!grn) throw new Error("GRN not found");

      if (!canTransition(grn.status, "rejected")) {
        throw new Error(`Cannot reject GRN from status: ${grn.status}`);
      }

      const { error } = await supabase
        .from("material_receipts")
        .update({
          status: "rejected",
          notes: `${grn.notes || ""}\n\nRejection reason: ${reason}`.trim(),
        })
        .eq("id", grnId);

      if (error) throw error;

      // Fetch all items for this GRN to get their received_quantity values
      const { data: items, error: fetchItemsError } = await supabase
        .from("material_receipt_items")
        .select("id, received_quantity")
        .eq("material_receipt_id", grnId);

      if (fetchItemsError) throw fetchItemsError;

      // Update each item: set rejected_quantity = received_quantity, accepted = 0
      if (items && items.length > 0) {
        const updatePromises = items.map((item: any) =>
          supabase
            .from("material_receipt_items")
            .update({
              quality_status: "rejected",
              accepted_quantity: 0,
              rejected_quantity: item.received_quantity,
              rejection_reason: reason,
            })
            .eq("id", item.id)
        );
        await Promise.all(updatePromises);
      }

      await fetchGRNs();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject GRN";
      console.error("Error rejecting GRN:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.materialReceipts, fetchGRNs]);

  // ============================================
  // SELECT GRN
  // ============================================
  const selectGRN = useCallback(async (grnId: string | null) => {
    if (!grnId) {
      setState((prev) => ({ ...prev, selectedGRN: null, items: [] }));
      return;
    }

    const grn = state.materialReceipts.find((g) => g.id === grnId);
    if (grn) {
      setState((prev) => ({ ...prev, selectedGRN: grn }));
      await fetchGRNItems(grnId);
    }
  }, [state.materialReceipts, fetchGRNItems]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getGRNById = useCallback(
    (id: string): MaterialReceipt | undefined => {
      return state.materialReceipts.find((g) => g.id === id);
    },
    [state.materialReceipts]
  );

  const getGRNsByPO = useCallback((poId: string): MaterialReceipt[] => {
    return state.materialReceipts.filter((g) => g.purchase_order_id === poId);
  }, [state.materialReceipts]);

  const getDraftGRNs = useCallback((): MaterialReceipt[] => {
    return state.materialReceipts.filter((g) => g.status === "draft");
  }, [state.materialReceipts]);

  const getPendingInspectionGRNs = useCallback((): MaterialReceipt[] => {
    return state.materialReceipts.filter((g) => g.status === "inspecting");
  }, [state.materialReceipts]);

  const calculateShortage = useCallback((item: GRNItem): number => {
    if (!item.ordered_quantity) return 0;
    return item.ordered_quantity - (item.accepted_quantity || 0);
  }, []);

  const refresh = useCallback(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    materialReceipts: state.materialReceipts,
    items: state.items,
    selectedGRN: state.selectedGRN,
    isLoading: state.isLoading,
    error: state.error,

    // GRN Operations
    fetchGRNs,
    createGRN,
    createGRNFromPO,
    updateGRN,
    deleteGRN,
    selectGRN,

    // Item Operations
    fetchGRNItems,
    addGRNItem,
    deleteGRNItem,
    recordItemReceipt,
    updateGRNItemQuality,
    addToStock,

    // Workflow Operations
    startInspection,
    completeQualityCheck,
    rejectGRN,

    // Helpers
    getGRNById,
    getGRNsByPO,
    getDraftGRNs,
    getPendingInspectionGRNs,
    calculateShortage,
    canTransition,
    formatCurrency,

    // Refresh
    refresh,
  };
}

export default useGRN;

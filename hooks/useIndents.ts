"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

export type IndentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "po_created"
  | "cancelled";

export type IndentPriority = "low" | "normal" | "high" | "urgent";

export interface Indent {
  id: string;
  indent_number: string;
  requester_id: string;
  department: string | null;
  location_id: string | null;
  society_id: string | null;
  title: string | null;
  purpose: string | null;
  required_date: string | null;
  priority: IndentPriority;
  status: IndentStatus;
  total_items: number;
  total_estimated_value: number; // In paise
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approver_notes: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  po_created_at: string | null;
  linked_po_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  requester_name?: string;
  requester_code?: string;
  location_name?: string;
  society_name?: string;
}

export interface IndentItem {
  id: string;
  indent_id: string;
  product_id: string | null;
  item_description: string | null;
  specifications: string | null;
  requested_quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number | null; // In paise
  estimated_total: number | null; // In paise
  approved_quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_code?: string;
}

export interface CreateIndentInput {
  requester_id: string;
  department?: string;
  location_id?: string;
  society_id?: string;
  title?: string;
  purpose?: string;
  required_date?: string;
  priority?: IndentPriority;
  notes?: string;
}

export interface CreateIndentItemInput {
  indent_id: string;
  product_id?: string;
  item_description?: string;
  specifications?: string;
  requested_quantity: number;
  unit_of_measure?: string;
  estimated_unit_price?: number; // In paise
  notes?: string;
}

interface UseIndentsState {
  indents: Indent[];
  items: IndentItem[];
  selectedIndent: Indent | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<IndentStatus, IndentStatus[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "rejected"],
  approved: ["po_created"],
  rejected: [], // Terminal state - can be cloned to create new indent
  po_created: [], // Terminal state
  cancelled: [], // Terminal state
};

// Status display configuration
export const INDENT_STATUS_CONFIG: Record<IndentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  pending_approval: { label: "Pending Approval", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
  po_created: { label: "PO Created", className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

export const INDENT_PRIORITY_CONFIG: Record<IndentPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normal", className: "bg-info/10 text-info border-info/20" },
  high: { label: "High", className: "bg-warning/10 text-warning border-warning/20" },
  urgent: { label: "Urgent", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (currentStatus: IndentStatus, targetStatus: IndentStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

import { toRupees, toPaise, formatCurrency } from "@/src/lib/utils/currency";

// ============================================
// HOOK
// ============================================

export function useIndents(filters?: { status?: IndentStatus; department?: string; searchTerm?: string }) {
  const [state, setState] = useState<UseIndentsState>({
    indents: [],
    items: [],
    selectedIndent: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH INDENTS
  // ============================================
  const fetchIndents = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("indents")
        .select(`
          *,
          employees!requester_id (
            employee_code,
            first_name,
            last_name
          ),
          company_locations!location_id (
            location_name
          ),
          societies!society_id (
            society_name
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.department) {
        query = query.eq("department", filters.department);
      }
      if (filters?.searchTerm) {
        const term = filters.searchTerm;
        query = query.or(
          `indent_number.ilike.%${term}%,title.ilike.%${term}%,purpose.ilike.%${term}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const indentsWithDetails: Indent[] = (data || []).map((indent: any) => ({
        ...indent,
        requester_name: indent.employees
          ? [indent.employees.first_name, indent.employees.last_name].filter(Boolean).join(" ").trim()
          : "Unknown",
        requester_code: indent.employees?.employee_code || "N/A",
        location_name: indent.company_locations?.location_name || null,
        society_name: indent.societies?.society_name || null,
      }));

      setState((prev) => ({
        ...prev,
        indents: indentsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch indents";
      console.error("Error fetching indents:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.department, filters?.searchTerm]);

  // ============================================
  // FETCH INDENT ITEMS
  // ============================================
  const fetchIndentItems = useCallback(async (indentId: string): Promise<IndentItem[]> => {
    try {
      const { data, error } = await supabase
        .from("indent_items")
        .select(`
          *,
          products!product_id (
            product_name,
            product_code
          )
        `)
        .eq("indent_id", indentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const itemsWithDetails: IndentItem[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || null,
        product_code: item.products?.product_code || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching indent items:", err);
      return [];
    }
  }, []);

  // ============================================
  // CREATE INDENT
  // ============================================
  const createIndent = useCallback(async (input: CreateIndentInput): Promise<Indent | null> => {
    try {
      const { data, error } = await supabase
        .from("indents")
        .insert({
          requester_id: input.requester_id,
          department: input.department,
          location_id: input.location_id,
          society_id: input.society_id,
          title: input.title,
          purpose: input.purpose,
          required_date: input.required_date,
          priority: input.priority || "normal",
          status: "draft",
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh indents list
      await fetchIndents();

      return data as Indent;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create indent";
      console.error("Error creating indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchIndents]);

  // ============================================
  // UPDATE INDENT
  // ============================================
  const updateIndent = useCallback(async (
    indentId: string,
    updates: Partial<CreateIndentInput>
  ): Promise<Indent | null> => {
    try {
      // Verify indent is in draft status
      const indent = state.indents.find((i) => i.id === indentId);
      if (indent && indent.status !== "draft") {
        throw new Error("Only draft indents can be edited");
      }

      const { data, error } = await supabase
        .from("indents")
        .update(updates)
        .eq("id", indentId)
        .select()
        .single();

      if (error) throw error;

      await fetchIndents();
      return data as Indent;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update indent";
      console.error("Error updating indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // DELETE INDENT
  // ============================================
  const deleteIndent = useCallback(async (indentId: string): Promise<boolean> => {
    try {
      const indent = state.indents.find((i) => i.id === indentId);
      if (indent && indent.status !== "draft") {
        throw new Error("Only draft indents can be deleted");
      }

      const { error } = await supabase
        .from("indents")
        .delete()
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete indent";
      console.error("Error deleting indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // ADD INDENT ITEM
  // ============================================
  const addIndentItem = useCallback(async (input: CreateIndentItemInput): Promise<IndentItem | null> => {
    try {
      // Validate quantities
      if (input.requested_quantity < 0 || (input.estimated_unit_price !== undefined && input.estimated_unit_price < 0)) {
        throw new Error("Quantity and price cannot be negative");
      }

      // Calculate estimated total
      const estimatedTotal = input.estimated_unit_price
        ? input.estimated_unit_price * input.requested_quantity
        : null;

      const { data, error } = await supabase
        .from("indent_items")
        .insert({
          indent_id: input.indent_id,
          product_id: input.product_id,
          item_description: input.item_description,
          specifications: input.specifications,
          requested_quantity: input.requested_quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          estimated_unit_price: input.estimated_unit_price,
          estimated_total: estimatedTotal,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh items for this indent
      await fetchIndentItems(input.indent_id);
      // Also refresh indents to get updated totals
      await fetchIndents();

      return data as IndentItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add indent item";
      console.error("Error adding indent item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchIndentItems, fetchIndents]);

  // ============================================
  // UPDATE INDENT ITEM
  // ============================================
  const updateIndentItem = useCallback(async (
    itemId: string,
    updates: Partial<CreateIndentItemInput>
  ): Promise<IndentItem | null> => {
    try {
      // Recalculate estimated_total if quantity or price changed
      const updateData: any = { ...updates };
      if (updates.estimated_unit_price !== undefined || updates.requested_quantity !== undefined) {
        const item = state.items.find((i) => i.id === itemId);
        if (item) {
          const unitPrice = updates.estimated_unit_price ?? item.estimated_unit_price ?? 0;
          const qty = updates.requested_quantity ?? item.requested_quantity;
          
          if (qty < 0 || unitPrice < 0) {
            throw new Error("Quantity and price cannot be negative");
          }
          
          updateData.estimated_total = unitPrice * qty;
        }
      }

      const { data, error } = await supabase
        .from("indent_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      // Refresh items
      if (data) {
        await fetchIndentItems(data.indent_id);
        await fetchIndents();
      }

      return data as IndentItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update indent item";
      console.error("Error updating indent item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.items, fetchIndentItems, fetchIndents]);

  // ============================================
  // DELETE INDENT ITEM
  // ============================================
  const deleteIndentItem = useCallback(async (itemId: string, indentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("indent_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await fetchIndentItems(indentId);
      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete indent item";
      console.error("Error deleting indent item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchIndentItems, fetchIndents]);

  // ============================================
  // SUBMIT FOR APPROVAL
  // ============================================
  const submitForApproval = useCallback(async (indentId: string, submittedBy: string): Promise<boolean> => {
    try {
      const indent = state.indents.find((i) => i.id === indentId);
      if (!indent) throw new Error("Indent not found");

      // Validate status transition
      if (!canTransition(indent.status, "pending_approval")) {
        throw new Error(`Cannot submit indent from status: ${indent.status}`);
      }

      // Validate indent has items
      const items = await fetchIndentItems(indentId);
      if (items.length === 0) {
        throw new Error("Cannot submit indent without items");
      }

      const { error } = await supabase
        .from("indents")
        .update({
          status: "pending_approval",
          submitted_at: new Date().toISOString(),
          submitted_by: submittedBy,
        })
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit for approval";
      console.error("Error submitting indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndentItems, fetchIndents]);

  // ============================================
  // APPROVE INDENT
  // ============================================
  const approveIndent = useCallback(async (
    indentId: string,
    approvedBy: string,
    approverNotes?: string,
    approvedQuantities?: Record<string, number> // itemId -> approved quantity
  ): Promise<boolean> => {
    try {
      const indent = state.indents.find((i) => i.id === indentId);
      if (!indent) throw new Error("Indent not found");

      if (!canTransition(indent.status, "approved")) {
        throw new Error(`Cannot approve indent from status: ${indent.status}`);
      }

      // Update approved quantities if provided
      if (approvedQuantities) {
        for (const [itemId, approvedQty] of Object.entries(approvedQuantities)) {
          await supabase
            .from("indent_items")
            .update({ approved_quantity: approvedQty })
            .eq("id", itemId);
        }
      }

      const { error } = await supabase
        .from("indents")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
          approver_notes: approverNotes,
        })
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve indent";
      console.error("Error approving indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // REJECT INDENT
  // ============================================
  const rejectIndent = useCallback(async (
    indentId: string,
    rejectedBy: string,
    rejection_reason: string
  ): Promise<boolean> => {
    try {
      if (!rejection_reason?.trim()) {
        throw new Error("Rejection reason is required");
      }

      const indent = state.indents.find((i) => i.id === indentId);
      if (!indent) throw new Error("Indent not found");

      if (!canTransition(indent.status, "rejected")) {
        throw new Error(`Cannot reject indent from status: ${indent.status}`);
      }

      const { error } = await supabase
        .from("indents")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: rejectedBy,
          rejection_reason: rejection_reason,
        })
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject indent";
      console.error("Error rejecting indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // CANCEL INDENT
  // ============================================
  const cancelIndent = useCallback(async (indentId: string): Promise<boolean> => {
    try {
      const indent = state.indents.find((i) => i.id === indentId);
      if (!indent) throw new Error("Indent not found");

      if (!canTransition(indent.status, "cancelled")) {
        throw new Error(`Cannot cancel indent from status: ${indent.status}`);
      }

      const { error } = await supabase
        .from("indents")
        .update({ status: "cancelled" })
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel indent";
      console.error("Error cancelling indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // MARK PO CREATED
  // ============================================
  const markPOCreated = useCallback(async (
    indentId: string,
    poId: string
  ): Promise<boolean> => {
    try {
      const indent = state.indents.find((i) => i.id === indentId);
      if (!indent) throw new Error("Indent not found");

      if (!canTransition(indent.status, "po_created")) {
        throw new Error(`Cannot mark PO created from status: ${indent.status}`);
      }

      const { error } = await supabase
        .from("indents")
        .update({
          status: "po_created",
          po_created_at: new Date().toISOString(),
          linked_po_id: poId,
        })
        .eq("id", indentId);

      if (error) throw error;

      await fetchIndents();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark PO created";
      console.error("Error marking PO created:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.indents, fetchIndents]);

  // ============================================
  // SELECT INDENT
  // ============================================
  const selectIndent = useCallback(async (indentId: string | null) => {
    if (!indentId) {
      setState((prev) => ({ ...prev, selectedIndent: null, items: [] }));
      return;
    }

    const indent = state.indents.find((i) => i.id === indentId);
    if (indent) {
      setState((prev) => ({ ...prev, selectedIndent: indent }));
      await fetchIndentItems(indentId);
    }
  }, [state.indents, fetchIndentItems]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getIndentById = useCallback(
    (id: string): Indent | undefined => {
      return state.indents.find((i) => i.id === id);
    },
    [state.indents]
  );

  const getApprovedIndents = useCallback((): Indent[] => {
    return state.indents.filter((i) => i.status === "approved");
  }, [state.indents]);

  const getPendingApprovalIndents = useCallback((): Indent[] => {
    return state.indents.filter((i) => i.status === "pending_approval");
  }, [state.indents]);

  const getDraftIndents = useCallback((): Indent[] => {
    return state.indents.filter((i) => i.status === "draft");
  }, [state.indents]);

  const refresh = useCallback(() => {
    fetchIndents();
  }, [fetchIndents]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    indents: state.indents,
    items: state.items,
    selectedIndent: state.selectedIndent,
    isLoading: state.isLoading,
    error: state.error,

    // Indent Operations
    fetchIndents,
    createIndent,
    updateIndent,
    deleteIndent,
    selectIndent,

    // Item Operations
    fetchIndentItems,
    addIndentItem,
    updateIndentItem,
    deleteIndentItem,

    // Workflow Operations
    submitForApproval,
    approveIndent,
    rejectIndent,
    cancelIndent,
    markPOCreated,

    // Helpers
    getIndentById,
    getApprovedIndents,
    getPendingApprovalIndents,
    getDraftIndents,
    canTransition,
    formatCurrency,

    // Refresh
    refresh,
  };
}

export default useIndents;

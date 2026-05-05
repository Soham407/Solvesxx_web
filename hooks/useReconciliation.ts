"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { fetchDocumentItems, fetchUnmatchedItems } from "@/src/lib/reconciliation/reconciliationDocumentReaders";
import {
  type ReconciliationStatus,
  type ReconciliationLineStatus,
  type MatchType,
  type DiscrepancyType,
  type ResolutionAction,
  type Reconciliation,
  type ReconciliationLine,
  type CreateReconciliationInput,
  type CreateReconciliationLineInput,
  type ResolveDiscrepancyInput,
  type MatchResult,
  type ReconciliationJoinRow,
  type ReconciliationLineJoinRow,
  type DocumentItemRow,
  type ReconciliationLineStatusRow,
  type ReconciliationMatchRpcResult,
  type DisputeUpdateRow,
  canTransition,
  calculateVariance,
  isWithinTolerance,
  determineLineStatus,
  mapReconciliationRows,
  mapReconciliationLineRows,
  combineDocumentItemsIntoMatchResults,
  calculateReconciliationStatus,
  buildReconciliationStatistics,
  calculateDocumentAmounts,
  formatCurrency as centralizedFormatCurrency,
} from "@/src/lib/reconciliation/reconciliationTransforms";

export type {
  ReconciliationStatus,
  ReconciliationLineStatus,
  MatchType,
  DiscrepancyType,
  ResolutionAction,
  Reconciliation,
  ReconciliationLine,
  CreateReconciliationInput,
  CreateReconciliationLineInput,
  ResolveDiscrepancyInput,
  MatchResult,
};

interface UseReconciliationState {
  reconciliations: Reconciliation[];
  lines: ReconciliationLine[];
  selectedReconciliation: Reconciliation | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules for reconciliation lifecycle
// Status display configuration
export const RECONCILIATION_STATUS_CONFIG: Record<
  ReconciliationStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  matched: { label: "Matched", className: "bg-success/10 text-success border-success/20" },
  discrepancy: { label: "Discrepancy", className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Resolved", className: "bg-info/10 text-info border-info/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

export const LINE_STATUS_CONFIG: Record<
  ReconciliationLineStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  matched: { label: "Matched", className: "bg-success/10 text-success border-success/20" },
  variance: { label: "Variance", className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Resolved", className: "bg-info/10 text-info border-info/20" },
};

export const DISCREPANCY_TYPE_CONFIG: Record<DiscrepancyType, { label: string; description: string }> = {
  quantity: { label: "Quantity", description: "Mismatch in quantities between documents" },
  price: { label: "Price", description: "Mismatch in unit prices between documents" },
  tax: { label: "Tax", description: "Tax calculation discrepancy" },
  other: { label: "Other", description: "Other type of discrepancy" },
};

export const RESOLUTION_ACTION_CONFIG: Record<ResolutionAction, { label: string; description: string }> = {
  accept: { label: "Accept", description: "Accept the variance as-is" },
  adjust: { label: "Adjust", description: "Adjust the amount to resolve" },
  reject: { label: "Reject", description: "Reject the document" },
  credit_note: { label: "Credit Note", description: "Request credit note from supplier" },
};

export const formatCurrency = (paiseAmount: number): string => {
  return centralizedFormatCurrency(paiseAmount);
};

// ============================================
// HOOK
// ============================================

export function useReconciliation(filters?: {
  status?: ReconciliationStatus;
  billId?: string;
  poId?: string;
  grnId?: string;
}) {
  const [state, setState] = useState<UseReconciliationState>({
    reconciliations: [],
    lines: [],
    selectedReconciliation: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH RECONCILIATIONS
  // ============================================
  const fetchReconciliations = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("reconciliations")
        .select(`
          *,
          purchase_bills!purchase_bill_id (
            bill_number,
            suppliers!supplier_id (
              supplier_name
            )
          ),
          purchase_orders!purchase_order_id (
            po_number
          ),
          material_receipts!material_receipt_id (
            grn_number
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.billId) {
        query = query.eq("purchase_bill_id", filters.billId);
      }
      if (filters?.poId) {
        query = query.eq("purchase_order_id", filters.poId);
      }
      if (filters?.grnId) {
        query = query.eq("material_receipt_id", filters.grnId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const reconciliationsWithDetails = mapReconciliationRows((data || []) as ReconciliationJoinRow[]);

      setState((prev) => ({
        ...prev,
        reconciliations: reconciliationsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch reconciliations";
      console.error("Error fetching reconciliations:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.billId, filters?.poId, filters?.grnId]);

  // ============================================
  // FETCH RECONCILIATION LINES
  // ============================================
  const fetchReconciliationLines = useCallback(
    async (reconciliationId: string): Promise<ReconciliationLine[]> => {
      try {
        const { data, error } = await supabase
          .from("reconciliation_lines")
          .select(`
            *,
            products!product_id (
              product_name,
              product_code
            )
          `)
          .eq("reconciliation_id", reconciliationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const linesWithDetails = mapReconciliationLineRows((data || []) as ReconciliationLineJoinRow[]);

        setState((prev) => ({ ...prev, lines: linesWithDetails }));
        return linesWithDetails;
      } catch (err: unknown) {
        console.error("Error fetching reconciliation lines:", err);
        return [];
      }
    },
    []
  );

  // ============================================
  // GET PO ITEMS
  // ============================================
  const getPOItems = useCallback(async (poId: string) => {
    return fetchDocumentItems("po", poId);
  }, []);

  // ============================================
  // GET GRN ITEMS
  // ============================================
  const getGRNItems = useCallback(async (grnId: string) => {
    return fetchDocumentItems("grn", grnId);
  }, []);

  // ============================================
  // GET BILL ITEMS
  // ============================================
  const getBillItems = useCallback(async (billId: string) => {
    return fetchDocumentItems("bill", billId);
  }, []);

  // ============================================
  // PERFORM THREE-WAY MATCH
  // ============================================
  const performThreeWayMatch = useCallback(
    async (
      poId: string | null,
      grnId: string | null,
      billId: string | null
    ): Promise<MatchResult[]> => {
      try {
        const [poItems, grnItems, billItems] = await Promise.all([
          poId ? getPOItems(poId) : Promise.resolve([]),
          grnId ? getGRNItems(grnId) : Promise.resolve([]),
          billId ? getBillItems(billId) : Promise.resolve([]),
        ]);
        return combineDocumentItemsIntoMatchResults(poItems, grnItems, billItems);
      } catch (err: unknown) {
        console.error("Error performing three-way match:", err);
        throw err;
      }
    },
    [getPOItems, getGRNItems, getBillItems]
  );

  const runReconciliationMatch = useCallback(async (reconciliationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

          const { data, error } = await supabase.rpc("execute_reconciliation_match", {
          p_reconciliation_id: reconciliationId,
          p_user_id: user.id,
        });

        if (error) throw error;

      const rpcResult = data as ReconciliationMatchRpcResult;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || "Reconciliation matching failed");
      }

      return { success: true as const, result: rpcResult };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute reconciliation match";
      console.error("Error executing reconciliation match:", err);
      return { success: false as const, error: errorMessage };
    }
  }, []);

  // ============================================
  // CREATE RECONCILIATION
  // ============================================
  const createReconciliation = useCallback(
    async (input: CreateReconciliationInput): Promise<Reconciliation | null> => {
      try {
        // At least one document must be provided
        if (!input.purchase_bill_id && !input.purchase_order_id && !input.material_receipt_id) {
          throw new Error("At least one document (Bill, PO, or GRN) must be provided");
        }

        // Fetch document amounts
        let billAmount = 0;
        let poAmount = 0;
        let grnAmount = 0;

        if (input.purchase_bill_id) {
          const { data: bill } = await supabase
            .from("purchase_bills")
            .select("total_amount")
            .eq("id", input.purchase_bill_id)
            .single();
          billAmount = bill?.total_amount || 0;
        }

        if (input.purchase_order_id) {
          const { data: po } = await supabase
            .from("purchase_orders")
            .select("grand_total")
            .eq("id", input.purchase_order_id)
            .single();
          poAmount = po?.grand_total || 0;
        }

        if (input.material_receipt_id) {
          const { data: grn } = await supabase
            .from("material_receipts")
            .select("total_received_value")
            .eq("id", input.material_receipt_id)
            .single();
          grnAmount = grn?.total_received_value || 0;
        }

        const { billPoVariance, billGrnVariance, poGrnVariance } = calculateDocumentAmounts(
          billAmount,
          poAmount,
          grnAmount
        );

        const { data, error } = await supabase
          .from("reconciliations")
          .insert({
            purchase_bill_id: input.purchase_bill_id,
            purchase_order_id: input.purchase_order_id,
            material_receipt_id: input.material_receipt_id,
            bill_amount: billAmount,
            po_amount: poAmount,
            grn_amount: grnAmount,
            bill_po_variance: billPoVariance,
            bill_grn_variance: billGrnVariance,
            po_grn_variance: poGrnVariance,
            status: "pending",
            notes: input.notes,
          })
          .select()
          .single();

        if (error) throw error;

        const matchResult = await runReconciliationMatch(data.id);
        if (!matchResult.success) {
          throw new Error(matchResult.error || "Reconciliation matching failed");
        }

        // Re-fetch the reconciliation after RPC to get updated status/amounts
        const { data: updatedRec, error: refetchError } = await supabase
          .from("reconciliations")
          .select("*")
          .eq("id", data.id)
          .single();
        if (refetchError) throw refetchError;

        await fetchReconciliations();
        return (updatedRec || data) as Reconciliation;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create reconciliation";
        console.error("Error creating reconciliation:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [fetchReconciliations, runReconciliationMatch]
  );

  // ============================================
  // UPDATE RESIDUALS ON SOURCE ITEMS
  // ============================================
  const updateResiduals = useCallback(async (matchResults: MatchResult[]) => {
    for (const result of matchResults) {
      // Update PO item residuals
      if (result.po_item_id) {
        const { data: poItem } = await supabase
          .from("purchase_order_items")
          .select("ordered_quantity, unmatched_qty, unit_price")
          .eq("id", result.po_item_id)
          .single();

        if (poItem) {
          const currentUnmatched = poItem.unmatched_qty ?? poItem.ordered_quantity ?? 0;
          const newUnmatched = Math.max(0, currentUnmatched - result.matched_qty);
          const newUnmatchedAmount = Math.round(newUnmatched * (poItem.unit_price || 0));

          await supabase
            .from("purchase_order_items")
            .update({
              unmatched_qty: newUnmatched,
              unmatched_amount: newUnmatchedAmount,
            })
            .eq("id", result.po_item_id);
        }
      }

      // Update GRN item residuals
      if (result.grn_item_id) {
        const { data: grnItem } = await supabase
          .from("material_receipt_items")
          .select("received_quantity, accepted_quantity, unmatched_qty, unit_price")
          .eq("id", result.grn_item_id)
          .single();

        if (grnItem) {
          const baseQty = grnItem.accepted_quantity ?? grnItem.received_quantity ?? 0;
          const currentUnmatched = grnItem.unmatched_qty ?? baseQty;
          const newUnmatched = Math.max(0, currentUnmatched - result.matched_qty);
          const newUnmatchedAmount = Math.round(newUnmatched * (grnItem.unit_price || 0));

          await supabase
            .from("material_receipt_items")
            .update({
              unmatched_qty: newUnmatched,
              unmatched_amount: newUnmatchedAmount,
            })
            .eq("id", result.grn_item_id);
        }
      }

      // Update Bill item residuals
      if (result.bill_item_id) {
        const { data: billItem } = await supabase
          .from("purchase_bill_items")
          .select("billed_quantity, unmatched_qty, unit_price")
          .eq("id", result.bill_item_id)
          .single();

        if (billItem) {
          const currentUnmatched = billItem.unmatched_qty ?? billItem.billed_quantity ?? 0;
          const newUnmatched = Math.max(0, currentUnmatched - result.matched_qty);
          const newUnmatchedAmount = Math.round(newUnmatched * (billItem.unit_price || 0));

          await supabase
            .from("purchase_bill_items")
            .update({
              unmatched_qty: newUnmatched,
              unmatched_amount: newUnmatchedAmount,
            })
            .eq("id", result.bill_item_id);
        }
      }
    }
  }, []);

  // ============================================
  // UPDATE RECONCILIATION STATUS
  // ============================================
  const updateReconciliationStatus = useCallback(async (reconciliationId: string): Promise<void> => {
    try {
      // Get all lines for this reconciliation
      const { data: lines } = await supabase
        .from("reconciliation_lines")
        .select("status")
        .eq("reconciliation_id", reconciliationId);

      if (!lines || lines.length === 0) return;

      // Determine overall status
      const newStatus = calculateReconciliationStatus(lines as ReconciliationLineStatusRow[]);

      await supabase
        .from("reconciliations")
        .update({ status: newStatus })
        .eq("id", reconciliationId);
    } catch (err) {
      console.error("Error updating reconciliation status:", err);
    }
  }, []);

  // ============================================
  // UPDATE RECONCILIATION
  // ============================================
  const updateReconciliation = useCallback(
    async (
      reconciliationId: string,
      updates: Partial<Omit<CreateReconciliationInput, "purchase_bill_id" | "purchase_order_id" | "material_receipt_id">>
    ): Promise<Reconciliation | null> => {
      try {
        const rec = state.reconciliations.find((r) => r.id === reconciliationId);
        if (rec && rec.status === "resolved") {
          throw new Error("Cannot edit resolved reconciliation");
        }

        const { data, error } = await supabase
          .from("reconciliations")
          .update(updates)
          .eq("id", reconciliationId)
          .select()
          .single();

        if (error) throw error;

        await fetchReconciliations();
        return data as Reconciliation;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update reconciliation";
        console.error("Error updating reconciliation:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [state.reconciliations, fetchReconciliations]
  );

  // ============================================
  // DELETE RECONCILIATION
  // ============================================
  const deleteReconciliation = useCallback(
    async (reconciliationId: string): Promise<boolean> => {
      try {
        const rec = state.reconciliations.find((r) => r.id === reconciliationId);
        if (rec && rec.status !== "pending") {
          throw new Error("Only pending reconciliations can be deleted");
        }

        // Lines will be deleted via CASCADE
        const { error } = await supabase
          .from("reconciliations")
          .delete()
          .eq("id", reconciliationId);

        if (error) throw error;

        await fetchReconciliations();
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete reconciliation";
        console.error("Error deleting reconciliation:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [state.reconciliations, fetchReconciliations]
  );

  // ============================================
  // ADD RECONCILIATION LINE
  // ============================================
  const addReconciliationLine = useCallback(
    async (input: CreateReconciliationLineInput): Promise<ReconciliationLine | null> => {
      try {
        // Calculate variances
        const unitPriceVariance = calculateVariance(
          input.bill_unit_price || 0,
          input.po_unit_price || 0
        );

        const qtyVariance =
          (input.qty_billed || 0) - (input.qty_received || input.qty_ordered || 0);

        // Determine status
        const hasPO = !!input.po_item_id;
        const hasGRN = !!input.grn_item_id;
        const hasBill = !!input.bill_item_id;
        const status = determineLineStatus(qtyVariance, unitPriceVariance, hasPO, hasGRN, hasBill);

        const { data, error } = await supabase
          .from("reconciliation_lines")
          .insert({
            reconciliation_id: input.reconciliation_id,
            po_item_id: input.po_item_id,
            grn_item_id: input.grn_item_id,
            bill_item_id: input.bill_item_id,
            product_id: input.product_id,
            matched_qty: input.matched_qty,
            matched_amount: input.matched_amount,
            po_unit_price: input.po_unit_price,
            grn_unit_price: input.grn_unit_price,
            bill_unit_price: input.bill_unit_price,
            unit_price_variance: unitPriceVariance,
            qty_ordered: input.qty_ordered,
            qty_received: input.qty_received,
            qty_billed: input.qty_billed,
            qty_variance: qtyVariance,
            match_type: input.match_type,
            status,
          })
          .select()
          .single();

        if (error) throw error;

        // Update reconciliation status
        await updateReconciliationStatus(input.reconciliation_id);
        await fetchReconciliationLines(input.reconciliation_id);
        await fetchReconciliations();

        return data as ReconciliationLine;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add reconciliation line";
        console.error("Error adding reconciliation line:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [fetchReconciliationLines, fetchReconciliations, updateReconciliationStatus]
  );

  // ============================================
  // UPDATE RECONCILIATION LINE
  // ============================================
  const updateReconciliationLine = useCallback(
    async (
      lineId: string,
      updates: Partial<CreateReconciliationLineInput>
    ): Promise<ReconciliationLine | null> => {
      try {
        const currentLine = state.lines.find((l) => l.id === lineId);
        if (!currentLine) throw new Error("Line not found");

        // Recalculate variances if prices changed
        const poPrice = updates.po_unit_price ?? currentLine.po_unit_price ?? 0;
        const billPrice = updates.bill_unit_price ?? currentLine.bill_unit_price ?? 0;
        const qtyOrdered = updates.qty_ordered ?? currentLine.qty_ordered ?? 0;
        const qtyReceived = updates.qty_received ?? currentLine.qty_received ?? 0;
        const qtyBilled = updates.qty_billed ?? currentLine.qty_billed ?? 0;

        const unitPriceVariance = calculateVariance(billPrice, poPrice);
        const qtyVariance = qtyBilled - (qtyReceived || qtyOrdered);

        const { data, error } = await supabase
          .from("reconciliation_lines")
          .update({
            ...updates,
            unit_price_variance: unitPriceVariance,
            qty_variance: qtyVariance,
          })
          .eq("id", lineId)
          .select()
          .single();

        if (error) throw error;

        // Update reconciliation status
        await updateReconciliationStatus(currentLine.reconciliation_id);
        await fetchReconciliationLines(currentLine.reconciliation_id);
        await fetchReconciliations();

        return data as ReconciliationLine;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update reconciliation line";
        console.error("Error updating reconciliation line:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [state.lines, fetchReconciliationLines, fetchReconciliations, updateReconciliationStatus]
  );

  // ============================================
  // DELETE RECONCILIATION LINE
  // ============================================
  const deleteReconciliationLine = useCallback(
    async (lineId: string, reconciliationId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("reconciliation_lines")
          .delete()
          .eq("id", lineId);

        if (error) throw error;

        // Update reconciliation status
        await updateReconciliationStatus(reconciliationId);
        await fetchReconciliationLines(reconciliationId);
        await fetchReconciliations();

        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete reconciliation line";
        console.error("Error deleting reconciliation line:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [fetchReconciliationLines, fetchReconciliations, updateReconciliationStatus]
  );

  // ============================================
  // RESOLVE LINE DISCREPANCY
  // ============================================
  const resolveLineDiscrepancy = useCallback(
    async (lineId: string, resolutionNotes: string): Promise<boolean> => {
      try {
        const currentLine = state.lines.find((l) => l.id === lineId);
        if (!currentLine) throw new Error("Line not found");

        if (currentLine.status !== "variance") {
          throw new Error("Only lines with variance can be resolved");
        }

        const { error } = await supabase
          .from("reconciliation_lines")
          .update({
            status: "resolved",
            resolution_notes: resolutionNotes,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", lineId);

        if (error) throw error;

        // Update reconciliation status
        await updateReconciliationStatus(currentLine.reconciliation_id);
        await fetchReconciliationLines(currentLine.reconciliation_id);
        await fetchReconciliations();

        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to resolve line discrepancy";
        console.error("Error resolving line discrepancy:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [state.lines, fetchReconciliationLines, fetchReconciliations, updateReconciliationStatus]
  );

  // ============================================
  // RESOLVE RECONCILIATION DISCREPANCY
  // ============================================
  const resolveDiscrepancy = useCallback(
    async (reconciliationId: string, input: ResolveDiscrepancyInput): Promise<boolean> => {
      try {
        const rec = state.reconciliations.find((r) => r.id === reconciliationId);
        if (!rec) throw new Error("Reconciliation not found");

        if (rec.status !== "discrepancy") {
          throw new Error("Only reconciliations with discrepancy status can be resolved");
        }

        const { error } = await supabase
          .from("reconciliations")
          .update({
            status: "resolved",
            resolution_action: input.resolution_action,
            resolution_notes: input.resolution_notes,
            adjusted_amount: input.adjusted_amount,
            adjustment_reason: input.adjustment_reason,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", reconciliationId);

        if (error) throw error;

        // Mark all variance lines as resolved
        await supabase
          .from("reconciliation_lines")
          .update({
            status: "resolved",
            resolution_notes: input.resolution_notes,
            resolved_at: new Date().toISOString(),
          })
          .eq("reconciliation_id", reconciliationId)
          .eq("status", "variance");

        await fetchReconciliations();
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to resolve discrepancy";
        console.error("Error resolving discrepancy:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [state.reconciliations, fetchReconciliations]
  );

  const autoSyncReconciliations = useCallback(async () => {
    const targets = state.reconciliations.filter(
      (reconciliation) => reconciliation.status === "pending" || reconciliation.status === "discrepancy"
    );

    let processed = 0;
    let failed = 0;

    for (const reconciliation of targets) {
      const result = await runReconciliationMatch(reconciliation.id);
      if (result.success) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    await fetchReconciliations();

    if (state.selectedReconciliation) {
      await fetchReconciliationLines(state.selectedReconciliation.id);
    }

    return {
      processed,
      failed,
      total: targets.length,
    };
  }, [
    fetchReconciliationLines,
    fetchReconciliations,
    runReconciliationMatch,
    state.reconciliations,
    state.selectedReconciliation,
  ]);

  // ============================================
  // DISPUTE RECONCILIATION
  // ============================================
  const disputeReconciliation = useCallback(
    async (reconciliationId: string, reason?: string): Promise<boolean> => {
      try {
        const rec = state.reconciliations.find((r) => r.id === reconciliationId);
        if (!rec) throw new Error("Reconciliation not found");

        if (!canTransition(rec.status, "disputed")) {
          throw new Error(`Cannot dispute reconciliation in ${rec.status} status`);
        }

        const updates: DisputeUpdateRow = { status: "disputed" };
        if (reason) {
          updates.discrepancy_notes = rec.discrepancy_notes
            ? `${rec.discrepancy_notes}\n\nDispute: ${reason}`
            : `Dispute: ${reason}`;
        }

        const { error } = await supabase
          .from("reconciliations")
          .update(updates)
          .eq("id", reconciliationId);

        if (error) throw error;

        await fetchReconciliations();
        return true;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to dispute reconciliation";
        console.error("Error disputing reconciliation:", err);
        setState((prev) => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [state.reconciliations, fetchReconciliations]
  );

  // ============================================
  // GET RECONCILIATIONS BY STATUS
  // ============================================
  const getReconciliationsByStatus = useCallback(
    (status: ReconciliationStatus): Reconciliation[] => {
      return state.reconciliations.filter((r) => r.status === status);
    },
    [state.reconciliations]
  );

  // ============================================
  // GET PENDING RECONCILIATIONS
  // ============================================
  const getPendingReconciliations = useCallback((): Reconciliation[] => {
    return state.reconciliations.filter(
      (r) => r.status === "pending" || r.status === "discrepancy"
    );
  }, [state.reconciliations]);

  // ============================================
  // GET UNMATCHED ITEMS
  // ============================================
  const getUnmatchedItems = useCallback(async (type: "po" | "grn" | "bill"): Promise<DocumentItemRow[]> => {
    try {
      return await fetchUnmatchedItems(type);
    } catch (err: unknown) {
      console.error(`Error getting unmatched ${type} items:`, err);
      return [];
    }
  }, []);

  // ============================================
  // GET RECONCILIATION STATISTICS
  // ============================================
  const getReconciliationStatistics = useCallback(() => {
    return buildReconciliationStatistics(state.reconciliations);
  }, [state.reconciliations]);

  // ============================================
  // SELECT RECONCILIATION
  // ============================================
  const selectReconciliation = useCallback(
    (reconciliation: Reconciliation | null) => {
      setState((prev) => ({ ...prev, selectedReconciliation: reconciliation }));
      if (reconciliation) {
        fetchReconciliationLines(reconciliation.id);
      }
    },
    [fetchReconciliationLines]
  );

  // ============================================
  // CLEAR ERROR
  // ============================================
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // INITIAL FETCH
  // ============================================
  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    reconciliations: state.reconciliations,
    lines: state.lines,
    selectedReconciliation: state.selectedReconciliation,
    isLoading: state.isLoading,
    error: state.error,

    // Fetch functions
    fetchReconciliations,
    fetchReconciliationLines,

    // Document item fetchers
    getPOItems,
    getGRNItems,
    getBillItems,

    // Three-way matching
    performThreeWayMatch,

    // CRUD - Reconciliations
    createReconciliation,
    updateReconciliation,
    deleteReconciliation,

    // CRUD - Lines
    addReconciliationLine,
    updateReconciliationLine,
    deleteReconciliationLine,

    // Workflow
    resolveLineDiscrepancy,
    resolveDiscrepancy,
    disputeReconciliation,
    runReconciliationMatch,
    autoSyncReconciliations,
    updateReconciliationStatus,

    // Queries
    getReconciliationsByStatus,
    getPendingReconciliations,
    getUnmatchedItems,
    getReconciliationStatistics,

    // Utilities
    selectReconciliation,
    clearError,
    calculateVariance,
    isWithinTolerance,
  };
}

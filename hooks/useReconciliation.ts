"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

export type ReconciliationStatus = "pending" | "matched" | "discrepancy" | "resolved" | "disputed";
export type ReconciliationLineStatus = "pending" | "matched" | "variance" | "resolved";
export type MatchType = "PO_GRN" | "GRN_BILL" | "PO_BILL" | "THREE_WAY";
export type DiscrepancyType = "quantity" | "price" | "tax" | "other";
export type ResolutionAction = "accept" | "adjust" | "reject" | "credit_note";

export interface Reconciliation {
  id: string;
  reconciliation_number: string;
  purchase_bill_id: string | null;
  purchase_order_id: string | null;
  material_receipt_id: string | null;
  bill_amount: number; // In paise
  po_amount: number; // In paise
  grn_amount: number; // In paise
  bill_po_variance: number; // In paise
  bill_grn_variance: number; // In paise
  po_grn_variance: number; // In paise
  status: ReconciliationStatus;
  discrepancy_type: DiscrepancyType | null;
  discrepancy_notes: string | null;
  resolution_action: ResolutionAction | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  adjusted_amount: number | null; // In paise
  adjustment_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  bill_number?: string;
  po_number?: string;
  grn_number?: string;
  supplier_name?: string;
  total_lines?: number;
  matched_lines?: number;
  variance_lines?: number;
}

export interface ReconciliationLine {
  id: string;
  reconciliation_id: string;
  po_item_id: string | null;
  grn_item_id: string | null;
  bill_item_id: string | null;
  product_id: string | null;
  matched_qty: number;
  matched_amount: number; // In paise
  po_unit_price: number | null; // In paise
  grn_unit_price: number | null; // In paise
  bill_unit_price: number | null; // In paise
  unit_price_variance: number; // In paise
  qty_ordered: number | null;
  qty_received: number | null;
  qty_billed: number | null;
  qty_variance: number;
  match_type: MatchType;
  status: ReconciliationLineStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_code?: string;
}

export interface CreateReconciliationInput {
  purchase_bill_id?: string;
  purchase_order_id?: string;
  material_receipt_id?: string;
  notes?: string;
}

export interface CreateReconciliationLineInput {
  reconciliation_id: string;
  po_item_id?: string;
  grn_item_id?: string;
  bill_item_id?: string;
  product_id?: string;
  matched_qty: number;
  matched_amount: number; // In paise
  po_unit_price?: number; // In paise
  grn_unit_price?: number; // In paise
  bill_unit_price?: number; // In paise
  qty_ordered?: number;
  qty_received?: number;
  qty_billed?: number;
  match_type: MatchType;
}

export interface ResolveDiscrepancyInput {
  resolution_action: ResolutionAction;
  resolution_notes?: string;
  adjusted_amount?: number; // In paise
  adjustment_reason?: string;
}

export interface MatchResult {
  product_id: string;
  product_name?: string;
  product_code?: string;
  po_item_id?: string;
  grn_item_id?: string;
  bill_item_id?: string;
  qty_ordered: number;
  qty_received: number;
  qty_billed: number;
  qty_variance: number;
  po_unit_price: number; // In paise
  grn_unit_price: number; // In paise
  bill_unit_price: number; // In paise
  unit_price_variance: number; // In paise
  matched_qty: number;
  matched_amount: number; // In paise
  match_type: MatchType;
  status: ReconciliationLineStatus;
  has_qty_variance: boolean;
  has_price_variance: boolean;
}

interface UseReconciliationState {
  reconciliations: Reconciliation[];
  lines: ReconciliationLine[];
  selectedReconciliation: Reconciliation | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules for reconciliation lifecycle
const STATUS_TRANSITIONS: Record<ReconciliationStatus, ReconciliationStatus[]> = {
  pending: ["matched", "discrepancy"],
  matched: ["disputed"],
  discrepancy: ["resolved", "disputed"],
  resolved: ["disputed"],
  disputed: ["pending", "discrepancy"],
};

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

// Tolerance for variance (in paise) - amounts within this are considered matched
// NOTE: This is used for UI display purposes only. The authoritative tolerance
// check is performed in the database by the execute_reconciliation_match RPC function.
const VARIANCE_TOLERANCE = 100; // 1 INR

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (
  currentStatus: ReconciliationStatus,
  targetStatus: ReconciliationStatus
): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

import { toRupees, toPaise, formatCurrency as centralizedFormatCurrency } from "@/src/lib/utils/currency";

// Proxy to centralized utility with fraction digits
export const formatCurrency = (paiseAmount: number): string => {
  return centralizedFormatCurrency(paiseAmount, 2);
};

// Calculate variance between two amounts
export const calculateVariance = (amount1: number, amount2: number): number => {
  return amount1 - amount2;
};

// Check if variance is within tolerance
// NOTE: Used for UI display only. The authoritative check is in the database
// (execute_reconciliation_match RPC function).
export const isWithinTolerance = (variance: number): boolean => {
  return Math.abs(variance) <= VARIANCE_TOLERANCE;
};

// Determine line status based on variances
const determineLineStatus = (
  qtyVariance: number,
  priceVariance: number,
  hasPO: boolean,
  hasGRN: boolean,
  hasBill: boolean
): ReconciliationLineStatus => {
  // Missing documents = pending
  if (!hasPO || !hasGRN || !hasBill) return "pending";
  
  // Check if within tolerance
  if (Math.abs(qtyVariance) < 0.01 && isWithinTolerance(priceVariance)) {
    return "matched";
  }
  
  return "variance";
};

// Determine match type based on available documents
const determineMatchType = (
  hasPO: boolean,
  hasGRN: boolean,
  hasBill: boolean
): MatchType => {
  if (hasPO && hasGRN && hasBill) return "THREE_WAY";
  if (hasPO && hasGRN) return "PO_GRN";
  if (hasGRN && hasBill) return "GRN_BILL";
  return "PO_BILL";
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
      const reconciliationsWithDetails: Reconciliation[] = (data || []).map((rec: any) => ({
        ...rec,
        bill_number: rec.purchase_bills?.bill_number || null,
        po_number: rec.purchase_orders?.po_number || null,
        grn_number: rec.material_receipts?.grn_number || null,
        supplier_name: rec.purchase_bills?.suppliers?.supplier_name || "Unknown",
      }));

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

        const linesWithDetails: ReconciliationLine[] = (data || []).map((line: any) => ({
          ...line,
          product_name: line.products?.product_name || null,
          product_code: line.products?.product_code || null,
        }));

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
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        products!product_id (
          product_name,
          product_code
        )
      `)
      .eq("purchase_order_id", poId);

    if (error) throw error;
    return data || [];
  }, []);

  // ============================================
  // GET GRN ITEMS
  // ============================================
  const getGRNItems = useCallback(async (grnId: string) => {
    const { data, error } = await supabase
      .from("material_receipt_items")
      .select(`
        *,
        products!product_id (
          product_name,
          product_code
        )
      `)
      .eq("material_receipt_id", grnId);

    if (error) throw error;
    return data || [];
  }, []);

  // ============================================
  // GET BILL ITEMS
  // ============================================
  const getBillItems = useCallback(async (billId: string) => {
    const { data, error } = await supabase
      .from("purchase_bill_items")
      .select(`
        *,
        products!product_id (
          product_name,
          product_code
        )
      `)
      .eq("purchase_bill_id", billId);

    if (error) throw error;
    return data || [];
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

        // Build a map of all unique products from all documents
        const productMap = new Map<string, MatchResult>();

        // Process PO items
        for (const poItem of poItems) {
          const productId = poItem.product_id;
          if (!productId) continue;

          const existing = productMap.get(productId) || {
            product_id: productId,
            product_name: poItem.products?.product_name ?? undefined,
            product_code: poItem.products?.product_code ?? undefined,
            po_item_id: undefined,
            grn_item_id: undefined,
            bill_item_id: undefined,
            qty_ordered: 0,
            qty_received: 0,
            qty_billed: 0,
            qty_variance: 0,
            po_unit_price: 0,
            grn_unit_price: 0,
            bill_unit_price: 0,
            unit_price_variance: 0,
            matched_qty: 0,
            matched_amount: 0,
            match_type: "PO_GRN" as MatchType,
            status: "pending" as ReconciliationLineStatus,
            has_qty_variance: false,
            has_price_variance: false,
          };

          existing.po_item_id = poItem.id;
          existing.qty_ordered = poItem.ordered_quantity || 0;
          existing.po_unit_price = poItem.unit_price || 0;

          productMap.set(productId, existing);
        }

        // Process GRN items
        for (const grnItem of grnItems) {
          const productId = grnItem.product_id;
          if (!productId) continue;

          const existing = productMap.get(productId) || {
            product_id: productId,
            product_name: grnItem.products?.product_name ?? undefined,
            product_code: grnItem.products?.product_code ?? undefined,
            po_item_id: undefined,
            grn_item_id: undefined,
            bill_item_id: undefined,
            qty_ordered: 0,
            qty_received: 0,
            qty_billed: 0,
            qty_variance: 0,
            po_unit_price: 0,
            grn_unit_price: 0,
            bill_unit_price: 0,
            unit_price_variance: 0,
            matched_qty: 0,
            matched_amount: 0,
            match_type: "GRN_BILL" as MatchType,
            status: "pending" as ReconciliationLineStatus,
            has_qty_variance: false,
            has_price_variance: false,
          };

          existing.grn_item_id = grnItem.id;
          existing.qty_received = grnItem.accepted_quantity || grnItem.received_quantity || 0;
          existing.grn_unit_price = grnItem.unit_price || 0;

          productMap.set(productId, existing);
        }

        // Process Bill items
        for (const billItem of billItems) {
          const productId = billItem.product_id;
          if (!productId) continue;

          const existing = productMap.get(productId) || {
            product_id: productId,
            product_name: billItem.products?.product_name ?? undefined,
            product_code: billItem.products?.product_code ?? undefined,
            po_item_id: undefined,
            grn_item_id: undefined,
            bill_item_id: undefined,
            qty_ordered: 0,
            qty_received: 0,
            qty_billed: 0,
            qty_variance: 0,
            po_unit_price: 0,
            grn_unit_price: 0,
            bill_unit_price: 0,
            unit_price_variance: 0,
            matched_qty: 0,
            matched_amount: 0,
            match_type: "PO_BILL" as MatchType,
            status: "pending" as ReconciliationLineStatus,
            has_qty_variance: false,
            has_price_variance: false,
          };

          existing.bill_item_id = billItem.id;
          existing.qty_billed = billItem.billed_quantity || 0;
          existing.bill_unit_price = billItem.unit_price || 0;

          productMap.set(productId, existing);
        }

        // Calculate variances and determine status for each product
        const results: MatchResult[] = [];
        for (const [, result] of productMap) {
          const hasPO = !!result.po_item_id;
          const hasGRN = !!result.grn_item_id;
          const hasBill = !!result.bill_item_id;

          // Calculate matched quantity (minimum of available quantities)
          const availableQtys = [
            hasPO ? result.qty_ordered : Infinity,
            hasGRN ? result.qty_received : Infinity,
            hasBill ? result.qty_billed : Infinity,
          ].filter((q) => q !== Infinity);

          result.matched_qty = availableQtys.length > 0 ? Math.min(...availableQtys) : 0;

          // Calculate quantity variance (billed - received, or billed - ordered)
          if (hasBill && hasGRN) {
            result.qty_variance = result.qty_billed - result.qty_received;
          } else if (hasBill && hasPO) {
            result.qty_variance = result.qty_billed - result.qty_ordered;
          } else if (hasGRN && hasPO) {
            result.qty_variance = result.qty_received - result.qty_ordered;
          }

          // Calculate price variance (bill price - PO price)
          if (hasBill && hasPO) {
            result.unit_price_variance = result.bill_unit_price - result.po_unit_price;
          } else if (hasBill && hasGRN) {
            result.unit_price_variance = result.bill_unit_price - result.grn_unit_price;
          }

          // Calculate matched amount (using PO price as baseline)
          const basePrice = result.po_unit_price || result.grn_unit_price || result.bill_unit_price;
          result.matched_amount = Math.round(result.matched_qty * basePrice);

          // Determine match type
          result.match_type = determineMatchType(hasPO, hasGRN, hasBill);

          // Set variance flags
          result.has_qty_variance = Math.abs(result.qty_variance) >= 0.01;
          result.has_price_variance = !isWithinTolerance(result.unit_price_variance);

          // Determine status
          result.status = determineLineStatus(
            result.qty_variance,
            result.unit_price_variance,
            hasPO,
            hasGRN,
            hasBill
          );

          results.push(result);
        }

        return results;
      } catch (err: unknown) {
        console.error("Error performing three-way match:", err);
        throw err;
      }
    },
    [getPOItems, getGRNItems, getBillItems]
  );

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

        // Calculate variances
        const billPoVariance = calculateVariance(billAmount, poAmount);
        const billGrnVariance = calculateVariance(billAmount, grnAmount);
        const poGrnVariance = calculateVariance(poAmount, grnAmount);

        // Determine initial status based on variances
        const hasVariance =
          !isWithinTolerance(billPoVariance) ||
          !isWithinTolerance(billGrnVariance) ||
          !isWithinTolerance(poGrnVariance);

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

        // Execute matching, line creation, and residual updates via database RPC
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: result, error: rpcError } = await supabase.rpc('execute_reconciliation_match' as any, {
          p_reconciliation_id: data.id,
          p_user_id: user.id,
        });
        if (rpcError) throw rpcError;
        const rpcResult = result as any;
        if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Reconciliation matching failed');

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
    [fetchReconciliations]
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
      const allMatched = lines.every((l: any) => l.status === "matched");
      const allResolved = lines.every((l: any) => l.status === "matched" || l.status === "resolved");
      const hasVariance = lines.some((l: any) => l.status === "variance");

      let newStatus: ReconciliationStatus;
      if (allMatched) {
        newStatus = "matched";
      } else if (allResolved) {
        newStatus = "resolved";
      } else if (hasVariance) {
        newStatus = "discrepancy";
      } else {
        newStatus = "pending";
      }

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

        const updates: any = { status: "disputed" };
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
  const getUnmatchedItems = useCallback(
    async (
      type: "po" | "grn" | "bill"
    ): Promise<any[]> => {
      try {
        let tableName: string;
        let unmatchedQtyColumn: string;

        switch (type) {
          case "po":
            tableName = "purchase_order_items";
            unmatchedQtyColumn = "unmatched_qty";
            break;
          case "grn":
            tableName = "material_receipt_items";
            unmatchedQtyColumn = "unmatched_qty";
            break;
          case "bill":
            tableName = "purchase_bill_items";
            unmatchedQtyColumn = "unmatched_qty";
            break;
        }

        const { data, error } = await supabase
          .from(tableName as "purchase_order_items" | "material_receipt_items" | "purchase_bill_items")
          .select("*")
          .gt(unmatchedQtyColumn, 0);

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error(`Error getting unmatched ${type} items:`, err);
        return [];
      }
    },
    []
  );

  // ============================================
  // GET RECONCILIATION STATISTICS
  // ============================================
  const getReconciliationStatistics = useCallback(() => {
    const recs = state.reconciliations;

    return {
      totalReconciliations: recs.length,
      pendingReconciliations: recs.filter((r) => r.status === "pending").length,
      matchedReconciliations: recs.filter((r) => r.status === "matched").length,
      discrepancyReconciliations: recs.filter((r) => r.status === "discrepancy").length,
      resolvedReconciliations: recs.filter((r) => r.status === "resolved").length,
      disputedReconciliations: recs.filter((r) => r.status === "disputed").length,
      totalBillAmount: recs.reduce((sum, r) => sum + (r.bill_amount || 0), 0),
      totalPOAmount: recs.reduce((sum, r) => sum + (r.po_amount || 0), 0),
      totalGRNAmount: recs.reduce((sum, r) => sum + (r.grn_amount || 0), 0),
      totalVariance: recs.reduce(
        (sum, r) => sum + Math.abs(r.bill_po_variance || 0),
        0
      ),
      avgVariancePercent:
        recs.length > 0
          ? recs.reduce((sum, r) => {
              const baseAmount = r.po_amount || r.grn_amount || 1;
              return sum + (Math.abs(r.bill_po_variance || 0) / baseAmount) * 100;
            }, 0) / recs.length
          : 0,
    };
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

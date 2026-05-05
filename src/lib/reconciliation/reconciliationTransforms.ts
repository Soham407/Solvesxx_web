import { formatCurrency as centralizedFormatCurrency, toPaise, toRupees } from "@/src/lib/utils/currency";

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
  bill_amount: number;
  po_amount: number;
  grn_amount: number;
  bill_po_variance: number;
  bill_grn_variance: number;
  po_grn_variance: number;
  status: ReconciliationStatus;
  discrepancy_type: DiscrepancyType | null;
  discrepancy_notes: string | null;
  resolution_action: ResolutionAction | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  adjusted_amount: number | null;
  adjustment_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
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
  matched_amount: number;
  po_unit_price: number | null;
  grn_unit_price: number | null;
  bill_unit_price: number | null;
  unit_price_variance: number;
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
  matched_amount: number;
  po_unit_price?: number;
  grn_unit_price?: number;
  bill_unit_price?: number;
  qty_ordered?: number;
  qty_received?: number;
  qty_billed?: number;
  match_type: MatchType;
}

export interface ResolveDiscrepancyInput {
  resolution_action: ResolutionAction;
  resolution_notes?: string;
  adjusted_amount?: number;
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
  po_unit_price: number;
  grn_unit_price: number;
  bill_unit_price: number;
  unit_price_variance: number;
  matched_qty: number;
  matched_amount: number;
  match_type: MatchType;
  status: ReconciliationLineStatus;
  has_qty_variance: boolean;
  has_price_variance: boolean;
}

export type ReconciliationJoinRow = Reconciliation & {
  purchase_bills?: {
    bill_number?: string | null;
    suppliers?: { supplier_name?: string | null } | null;
  } | null;
  purchase_orders?: { po_number?: string | null } | null;
  material_receipts?: { grn_number?: string | null } | null;
};

export type ReconciliationLineJoinRow = ReconciliationLine & {
  products?: { product_name?: string | null; product_code?: string | null } | null;
};

export type DocumentItemRow = {
  id: string;
  product_id: string | null;
  ordered_quantity?: number | null;
  received_quantity?: number | null;
  accepted_quantity?: number | null;
  billed_quantity?: number | null;
  unit_price?: number | null;
  products?: { product_name?: string | null; product_code?: string | null } | null;
};

export type ReconciliationLineStatusRow = {
  status: ReconciliationLineStatus;
};

export type ReconciliationMatchRpcResult = {
  success?: boolean;
  error?: string;
} | null;

export type DisputeUpdateRow = {
  status: ReconciliationStatus;
  discrepancy_notes?: string | null;
};

export interface ReconciliationStatistics {
  totalReconciliations: number;
  pendingReconciliations: number;
  matchedReconciliations: number;
  discrepancyReconciliations: number;
  resolvedReconciliations: number;
  disputedReconciliations: number;
  totalBillAmount: number;
  totalPOAmount: number;
  totalGRNAmount: number;
  totalVariance: number;
  avgVariancePercent: number;
}

const STATUS_TRANSITIONS: Record<ReconciliationStatus, ReconciliationStatus[]> = {
  pending: ["matched", "discrepancy"],
  matched: ["disputed"],
  discrepancy: ["resolved", "disputed"],
  resolved: ["disputed"],
  disputed: ["pending", "discrepancy"],
};

const VARIANCE_TOLERANCE = 100;

export const canTransition = (currentStatus: ReconciliationStatus, targetStatus: ReconciliationStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

export const formatCurrency = (paiseAmount: number): string => {
  return centralizedFormatCurrency(paiseAmount, 2);
};

export const calculateVariance = (amount1: number, amount2: number): number => {
  return amount1 - amount2;
};

export const isWithinTolerance = (variance: number): boolean => {
  return Math.abs(variance) <= VARIANCE_TOLERANCE;
};

export const determineLineStatus = (
  qtyVariance: number,
  priceVariance: number,
  hasPO: boolean,
  hasGRN: boolean,
  hasBill: boolean,
): ReconciliationLineStatus => {
  if (!hasPO || !hasGRN || !hasBill) return "pending";
  if (Math.abs(qtyVariance) < 0.01 && isWithinTolerance(priceVariance)) {
    return "matched";
  }
  return "variance";
};

export const determineMatchType = (hasPO: boolean, hasGRN: boolean, hasBill: boolean): MatchType => {
  if (hasPO && hasGRN && hasBill) return "THREE_WAY";
  if (hasPO && hasGRN) return "PO_GRN";
  if (hasGRN && hasBill) return "GRN_BILL";
  return "PO_BILL";
};

export const mapReconciliationRows = (rows: ReconciliationJoinRow[]): Reconciliation[] => {
  return rows.map((rec) => ({
    ...rec,
    bill_number: rec.purchase_bills?.bill_number || null,
    po_number: rec.purchase_orders?.po_number || null,
    grn_number: rec.material_receipts?.grn_number || null,
    supplier_name: rec.purchase_bills?.suppliers?.supplier_name || "Unknown",
  }));
};

export const mapReconciliationLineRows = (rows: ReconciliationLineJoinRow[]): ReconciliationLine[] => {
  return rows.map((line) => ({
    ...line,
    product_name: line.products?.product_name || null,
    product_code: line.products?.product_code || null,
  }));
};

export const combineDocumentItemsIntoMatchResults = (
  poItems: DocumentItemRow[],
  grnItems: DocumentItemRow[],
  billItems: DocumentItemRow[],
): MatchResult[] => {
  const productMap = new Map<string, MatchResult>();

  const seedResult = (item: DocumentItemRow, initialMatchType: MatchType): MatchResult | null => {
    const productId = item.product_id;
    if (!productId) return null;

    return (
      productMap.get(productId) || {
        product_id: productId,
        product_name: item.products?.product_name ?? undefined,
        product_code: item.products?.product_code ?? undefined,
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
        match_type: initialMatchType,
        status: "pending",
        has_qty_variance: false,
        has_price_variance: false,
      }
    );
  };

  for (const poItem of poItems) {
    const existing = seedResult(poItem, "PO_GRN");
    if (!existing) continue;
    existing.po_item_id = poItem.id;
    existing.qty_ordered = poItem.ordered_quantity || 0;
    existing.po_unit_price = poItem.unit_price || 0;
    productMap.set(existing.product_id, existing);
  }

  for (const grnItem of grnItems) {
    const existing = seedResult(grnItem, "GRN_BILL");
    if (!existing) continue;
    existing.grn_item_id = grnItem.id;
    existing.qty_received = grnItem.accepted_quantity || grnItem.received_quantity || 0;
    existing.grn_unit_price = grnItem.unit_price || 0;
    productMap.set(existing.product_id, existing);
  }

  for (const billItem of billItems) {
    const existing = seedResult(billItem, "PO_BILL");
    if (!existing) continue;
    existing.bill_item_id = billItem.id;
    existing.qty_billed = billItem.billed_quantity || 0;
    existing.bill_unit_price = billItem.unit_price || 0;
    productMap.set(existing.product_id, existing);
  }

  const results: MatchResult[] = [];
  for (const [, result] of productMap) {
    const hasPO = !!result.po_item_id;
    const hasGRN = !!result.grn_item_id;
    const hasBill = !!result.bill_item_id;

    const availableQtys = [
      hasPO ? result.qty_ordered : Infinity,
      hasGRN ? result.qty_received : Infinity,
      hasBill ? result.qty_billed : Infinity,
    ].filter((q) => q !== Infinity);

    result.matched_qty = availableQtys.length > 0 ? Math.min(...availableQtys) : 0;

    if (hasBill && hasGRN) {
      result.qty_variance = result.qty_billed - result.qty_received;
    } else if (hasBill && hasPO) {
      result.qty_variance = result.qty_billed - result.qty_ordered;
    } else if (hasGRN && hasPO) {
      result.qty_variance = result.qty_received - result.qty_ordered;
    }

    if (hasBill && hasPO) {
      result.unit_price_variance = result.bill_unit_price - result.po_unit_price;
    } else if (hasBill && hasGRN) {
      result.unit_price_variance = result.bill_unit_price - result.grn_unit_price;
    }

    const basePrice = result.po_unit_price || result.grn_unit_price || result.bill_unit_price;
    result.matched_amount = Math.round(result.matched_qty * basePrice);
    result.match_type = determineMatchType(hasPO, hasGRN, hasBill);
    result.has_qty_variance = Math.abs(result.qty_variance) >= 0.01;
    result.has_price_variance = !isWithinTolerance(result.unit_price_variance);
    result.status = determineLineStatus(result.qty_variance, result.unit_price_variance, hasPO, hasGRN, hasBill);

    results.push(result);
  }

  return results;
};

export const calculateReconciliationStatus = (lines: ReconciliationLineStatusRow[]): ReconciliationStatus => {
  if (lines.length === 0) return "pending";

  const allMatched = lines.every((line) => line.status === "matched");
  const allResolved = lines.every((line) => line.status === "matched" || line.status === "resolved");
  const hasVariance = lines.some((line) => line.status === "variance");

  if (allMatched) return "matched";
  if (allResolved) return "resolved";
  if (hasVariance) return "discrepancy";
  return "pending";
};

export const buildReconciliationStatistics = (recs: Reconciliation[]): ReconciliationStatistics => {
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
    totalVariance: recs.reduce((sum, r) => sum + Math.abs(r.bill_po_variance || 0), 0),
    avgVariancePercent:
      recs.length > 0
        ? recs.reduce((sum, r) => {
            const baseAmount = r.po_amount || r.grn_amount || 1;
            return sum + (Math.abs(r.bill_po_variance || 0) / baseAmount) * 100;
          }, 0) / recs.length
        : 0,
  };
};

export const calculateDocumentAmounts = (billAmount: number, poAmount: number, grnAmount: number) => ({
  billPoVariance: calculateVariance(billAmount, poAmount),
  billGrnVariance: calculateVariance(billAmount, grnAmount),
  poGrnVariance: calculateVariance(poAmount, grnAmount),
});

export const toCents = toPaise;
export const fromCents = toRupees;

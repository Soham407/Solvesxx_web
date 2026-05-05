import type { RequestStatus } from "@/hooks/useBuyerRequests";

export type GRNStatus = "draft" | "inspecting" | "accepted" | "partial_accepted" | "rejected";
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
  total_received_value: number;
  delivery_challan_number: string | null;
  vehicle_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
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
  unit_price: number | null;
  line_total: number | null;
  unmatched_qty: number | null;
  unmatched_amount: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  unit_price?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface GRNRow extends MaterialReceipt {
  purchase_orders?: {
    po_number: string | null;
  } | null;
  suppliers?: {
    supplier_name: string | null;
    supplier_code: string | null;
  } | null;
  warehouses?: {
    warehouse_name: string | null;
  } | null;
  employees?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface GRNItemRow extends GRNItem {
  products?: {
    product_name: string | null;
    product_code: string | null;
  } | null;
}

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

const STATUS_TRANSITIONS: Record<GRNStatus, GRNStatus[]> = {
  draft: ["inspecting", "accepted", "rejected"],
  inspecting: ["accepted", "partial_accepted", "rejected"],
  accepted: [],
  partial_accepted: [],
  rejected: [],
};

export function canTransition(currentStatus: GRNStatus, targetStatus: GRNStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function toRupees(paise: number): number {
  return paise / 100;
}

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatCurrency(paiseAmount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toRupees(paiseAmount));
}

export function validateGRNItemForStock(item: GRNItem): void {
  if (item.quality_status === "rejected") {
    throw new Error("Cannot add rejected material to stock");
  }

  if (item.accepted_quantity === null || item.accepted_quantity === undefined || item.accepted_quantity <= 0) {
    throw new Error("No accepted quantity to add to stock");
  }

  if (item.quality_status === "partial" && (item.accepted_quantity || 0) <= 0) {
    throw new Error("Partial item with zero accepted quantity cannot be added to stock");
  }
}

export function calculateGRNItemUpdates(
  item: { received_quantity: number; unit_price: number | null; accepted_quantity?: number | null; rejected_quantity?: number | null },
  status: QualityStatus,
  providedAcceptedQty?: number,
  providedRejectedQty?: number,
) {
  const updates: Record<string, unknown> = { quality_status: status };
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
}

export function mapGRNs(rows: GRNRow[]): MaterialReceipt[] {
  return rows.map((row) => ({
    ...(row as MaterialReceipt),
    po_number: row.purchase_orders?.po_number || null,
    supplier_name: row.suppliers?.supplier_name || "Unknown",
    supplier_code: row.suppliers?.supplier_code || "N/A",
    warehouse_name: row.warehouses?.warehouse_name || null,
    received_by_name: row.employees
      ? [row.employees.first_name, row.employees.last_name].filter(Boolean).join(" ").trim()
      : null,
  }));
}

export function normalizeGRNRows(rows: unknown): GRNRow[] {
  return Array.isArray(rows) ? (rows as GRNRow[]) : [];
}

export function normalizeGRNItemRows(rows: unknown): GRNItemRow[] {
  return Array.isArray(rows) ? (rows as GRNItemRow[]) : [];
}

export function mapGRNItems(rows: GRNItemRow[]): GRNItem[] {
  return rows.map((row) => ({
    ...(row as GRNItem),
    product_name: row.products?.product_name || null,
    product_code: row.products?.product_code || null,
  }));
}

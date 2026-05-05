import type { RequestStatus } from "@/hooks/useBuyerRequests";
import type { SupplierExtended } from "@/src/types/supply-chain";
import type { SPOStatus } from "@/hooks/useServicePurchaseOrders";

export interface SupplierIndent {
  id: string;
  indent_id?: string | null;
  request_number: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_at: string;
  service_type?: string | null;
  service_grade?: string | null;
  headcount?: number | null;
  shift?: string | null;
  start_date?: string | null;
  duration_months?: number | null;
  site_location_id?: string | null;
  site_location_name?: string | null;
  is_service_request?: boolean;
  request_items: Record<string, unknown>[];
}

export interface SupplierPO {
  id: string;
  po_number: string;
  po_date: string;
  status: "draft" | "sent_to_vendor" | "acknowledged" | "dispatched" | "partial_received" | "received" | "cancelled";
  grand_total: number;
  expected_delivery_date: string;
  vendor_acknowledged_at: string | null;
  dispatched_at: string | null;
  vehicle_details: string | null;
  dispatch_notes: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  supplier_id: string;
  items: Record<string, unknown>[];
}

export interface SupplierBill {
  id: string;
  bill_number: string;
  supplier_invoice_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  payment_status: string;
  last_payment_date?: string | null;
  purchase_order_id: string | null;
  service_purchase_order_id: string | null;
  document_url?: string | null;
}

export interface SupplierServiceOrder {
  id: string;
  spo_number: string;
  vendor_id: string;
  request_id: string | null;
  service_type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  total_amount: number;
  status: SPOStatus;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
  site_location_id?: string | null;
  site_location_name?: string | null;
}

export interface SupplierServiceAcknowledgment {
  id: string;
  spo_id: string;
  status: string;
  acknowledged_by: string | null;
  headcount_expected: number | null;
  headcount_received: number | null;
  grade_verified: boolean | null;
  notes: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface SupplierExtendedRow extends SupplierExtended {}

interface SupplierRequestRow extends SupplierIndent {
  site_location?: {
    location_name?: string | null;
  } | null;
}

interface SupplierServiceAcknowledgmentRow extends SupplierServiceAcknowledgment {
  service_purchase_orders?: {
    vendor_id?: string | null;
  } | null;
}

interface SupplierServiceOrderRow extends SupplierServiceOrder {
  request?: {
    site_location_id?: string | null;
    site_location?: {
      location_name?: string | null;
    } | null;
  } | null;
}

interface SupplierPurchaseOrderRow {
  purchase_order_items?: Record<string, unknown>[] | null;
  [key: string]: unknown;
}

export function mapSupplierIndents(rows: SupplierRequestRow[]): SupplierIndent[] {
  return rows
    .filter((request) => request.is_service_request || !!request.indent_id)
    .map((request) => ({
      ...request,
      site_location_name: request.site_location?.location_name ?? null,
    }));
}

export function mapSupplierPurchaseOrders(rows: SupplierPurchaseOrderRow[]): SupplierPO[] {
  return rows.map((purchaseOrder) => ({
    id: String(purchaseOrder.id ?? ""),
    po_number: String(purchaseOrder.po_number ?? ""),
    po_date: String(purchaseOrder.po_date ?? ""),
    status: (purchaseOrder.status as SupplierPO["status"]) ?? "draft",
    grand_total: Number(purchaseOrder.grand_total ?? 0),
    expected_delivery_date: String(purchaseOrder.expected_delivery_date ?? ""),
    vendor_acknowledged_at: (purchaseOrder.vendor_acknowledged_at as string | null) ?? null,
    dispatched_at: (purchaseOrder.dispatched_at as string | null) ?? null,
    vehicle_details: (purchaseOrder.vehicle_details as string | null) ?? null,
    dispatch_notes: (purchaseOrder.dispatch_notes as string | null) ?? null,
    subtotal: Number(purchaseOrder.subtotal ?? 0),
    tax_amount: Number(purchaseOrder.tax_amount ?? 0),
    discount_amount: Number(purchaseOrder.discount_amount ?? 0),
    supplier_id: String(purchaseOrder.supplier_id ?? ""),
    items: purchaseOrder.purchase_order_items ?? [],
  }));
}

export function mapSupplierBills(rows: SupplierBill[]): SupplierBill[] {
  return rows.map((bill) => ({
    ...bill,
    paid_amount: Number(bill.paid_amount ?? 0),
    due_amount: Number(bill.due_amount ?? 0),
    last_payment_date: bill.last_payment_date ?? null,
  }));
}

export function mapSupplierServiceOrders(rows: SupplierServiceOrderRow[]): SupplierServiceOrder[] {
  return rows.map((serviceOrder) => ({
    ...serviceOrder,
    site_location_id: serviceOrder.request?.site_location_id ?? null,
    site_location_name: serviceOrder.request?.site_location?.location_name ?? null,
  }));
}

export function mapSupplierServiceAcknowledgments(rows: SupplierServiceAcknowledgmentRow[]): SupplierServiceAcknowledgment[] {
  return rows.map(({ service_purchase_orders: _servicePurchaseOrders, ...acknowledgment }) => acknowledgment);
}

export function normalizeSupplierRequestRows(rows: unknown): SupplierRequestRow[] {
  return Array.isArray(rows) ? (rows as SupplierRequestRow[]) : [];
}

export function normalizeSupplierPurchaseOrderRows(rows: unknown): SupplierPurchaseOrderRow[] {
  return Array.isArray(rows) ? (rows as SupplierPurchaseOrderRow[]) : [];
}

export function normalizeSupplierBillRows(rows: unknown): SupplierBill[] {
  return Array.isArray(rows) ? (rows as SupplierBill[]) : [];
}

export function normalizeSupplierServiceOrderRows(rows: unknown): SupplierServiceOrderRow[] {
  return Array.isArray(rows) ? (rows as SupplierServiceOrderRow[]) : [];
}

export function normalizeSupplierServiceAcknowledgmentRows(rows: unknown): SupplierServiceAcknowledgmentRow[] {
  return Array.isArray(rows) ? (rows as SupplierServiceAcknowledgmentRow[]) : [];
}

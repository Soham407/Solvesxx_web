export type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "indent_generated"
  | "indent_forwarded"
  | "indent_accepted"
  | "indent_rejected"
  | "po_issued"
  | "po_received"
  | "po_dispatched"
  | "material_received"
  | "material_acknowledged"
  | "bill_generated"
  | "paid"
  | "feedback_pending"
  | "completed"
  | "cancelled";

export interface BuyerRequest {
  id: string;
  request_number: string;
  buyer_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  site_location_id?: string | null;
  preferred_delivery_date: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  service_type?: string | null;
  service_grade?: string | null;
  headcount?: number | null;
  shift?: string | null;
  start_date?: string | null;
  duration_months?: number | null;
  indent_id?: string | null;
  supplier_id?: string | null;
  is_service_request?: boolean;
  priority?: string | null;
  category_name?: string;
  location_name?: string;
  site_location_name?: string;
}

export interface BuyerRequestItem {
  id: string;
  request_id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  product_name?: string;
}

export interface CreateBuyerRequestInput {
  title: string;
  description?: string;
  category_id?: string;
  location_id?: string;
  preferred_delivery_date?: string;
  service_type?: string;
  service_grade?: string;
  headcount?: number;
  shift?: string;
  start_date?: string;
  duration_months?: number;
  site_location_id?: string;
  is_service_request?: boolean;
  items: {
    product_id: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }[];
}

export interface UpdateBuyerRequestInput {
  status?: RequestStatus;
  rejection_reason?: string | null;
  updated_at?: string;
}

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
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20", buyerLabel: "Cancelled" },
};

export const FORWARDABLE_INDENT_STATUSES = new Set(["approved", "po_created"]);

export type BuyerRequestRow = {
  id: string;
  request_number: string;
  buyer_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  location_id: string | null;
  site_location_id: string | null;
  preferred_delivery_date: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  product_categories?: { category_name?: string | null } | null;
  company_locations?: { location_name?: string | null } | null;
  site_location?: { location_name?: string | null } | null;
};

export type BuyerRequestItemRow = {
  id: string;
  request_id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  products?: { product_name?: string | null } | null;
};

export type BuyerRequestJoinRow = BuyerRequestRow & {
  buyer_id?: string | null;
  indent_id?: string | null;
  supplier_id?: string | null;
  product_categories?: { category_name?: string | null } | null;
  company_locations?: { location_name?: string | null } | null;
  site_location?: { location_name?: string | null } | null;
};

export type BuyerRequestItemJoinRow = BuyerRequestItemRow & {
  products?: { product_name?: string | null } | null;
};

export type BuyerRequestUpdateRow = {
  status?: RequestStatus;
  rejection_reason?: string | null;
  updated_at?: string;
  rejected_at?: string;
  rejected_by?: string | null;
  indent_id?: string | null;
  supplier_id?: string | null;
};

export function mapBuyerRequestRow(row: BuyerRequestJoinRow): BuyerRequest {
  return {
    ...row,
    category_name: row.product_categories?.category_name,
    location_name: row.company_locations?.location_name,
    site_location_name: row.site_location?.location_name,
  };
}

export function mapBuyerRequestRows(rows: BuyerRequestJoinRow[]): BuyerRequest[] {
  return rows.map(mapBuyerRequestRow);
}

export function mapBuyerRequestItemRow(row: BuyerRequestItemJoinRow): BuyerRequestItem {
  return {
    ...row,
    product_name: row.products?.product_name,
  };
}

export function mapBuyerRequestItemRows(rows: BuyerRequestItemJoinRow[]): BuyerRequestItem[] {
  return rows.map(mapBuyerRequestItemRow);
}

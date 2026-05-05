export type IndentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "po_created" | "cancelled";
export type IndentPriority = "low" | "normal" | "high" | "urgent";

export interface Indent {
  id: string;
  indent_number: string;
  requester_id: string;
  service_request_id?: string | null;
  supplier_id?: string | null;
  department: string | null;
  location_id: string | null;
  society_id: string | null;
  title: string | null;
  purpose: string | null;
  required_date: string | null;
  priority: IndentPriority;
  status: IndentStatus;
  total_items: number;
  total_estimated_value: number;
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
  estimated_unit_price: number | null;
  estimated_total: number | null;
  approved_quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  override_approved_by: string | null;
  override_reason: string | null;
  override_approved_at: string | null;
  product_name?: string;
  product_code?: string;
}

export interface CreateIndentInput {
  requester_id: string;
  service_request_id?: string;
  supplier_id?: string;
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
  estimated_unit_price?: number;
  notes?: string;
}

type IndentRow = {
  id: string;
  indent_number: string | null;
  requester_id: string;
  department: string | null;
  location_id: string | null;
  society_id: string | null;
  title: string | null;
  purpose: string | null;
  required_date: string | null;
  priority: string | null;
  status: IndentStatus;
  total_items: number | null;
  total_estimated_value: number | null;
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
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  employees?: {
    employee_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  company_locations?: { location_name?: string | null } | null;
  societies?: { society_name?: string | null } | null;
};

type IndentItemRow = {
  id: string;
  indent_id: string;
  product_id: string | null;
  item_description: string | null;
  specifications: string | null;
  requested_quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number | null;
  estimated_total: number | null;
  approved_quantity: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  products?: { product_name?: string | null; product_code?: string | null } | null;
};

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

const STATUS_TRANSITIONS: Record<IndentStatus, IndentStatus[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "rejected"],
  approved: ["po_created"],
  rejected: [],
  po_created: [],
  cancelled: [],
};

export function canTransition(currentStatus: IndentStatus, targetStatus: IndentStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function mapIndents(rows: IndentRow[]): Indent[] {
  return rows.map((indent) => ({
    id: indent.id,
    indent_number: indent.indent_number || "",
    requester_id: indent.requester_id,
    department: indent.department,
    location_id: indent.location_id,
    society_id: indent.society_id,
    title: indent.title,
    purpose: indent.purpose,
    required_date: indent.required_date,
    priority: (indent.priority as IndentPriority) || "normal",
    status: indent.status,
    total_items: indent.total_items || 0,
    total_estimated_value: indent.total_estimated_value || 0,
    submitted_at: indent.submitted_at,
    submitted_by: indent.submitted_by,
    approved_at: indent.approved_at,
    approved_by: indent.approved_by,
    approver_notes: indent.approver_notes,
    rejected_at: indent.rejected_at,
    rejected_by: indent.rejected_by,
    rejection_reason: indent.rejection_reason,
    po_created_at: indent.po_created_at,
    linked_po_id: indent.linked_po_id,
    notes: indent.notes,
    created_at: indent.created_at || new Date().toISOString(),
    updated_at: indent.updated_at || new Date().toISOString(),
    created_by: indent.created_by,
    updated_by: indent.updated_by,
    requester_name: indent.employees
      ? [indent.employees.first_name, indent.employees.last_name].filter(Boolean).join(" ").trim()
      : "Unknown",
    requester_code: indent.employees?.employee_code || "N/A",
    location_name: indent.company_locations?.location_name || null,
    society_name: indent.societies?.society_name || null,
  }));
}

export function mapIndentItems(rows: IndentItemRow[]): IndentItem[] {
  return rows.map((item) => ({
    id: item.id,
    indent_id: item.indent_id,
    product_id: item.product_id,
    item_description: item.item_description,
    specifications: item.specifications,
    requested_quantity: item.requested_quantity,
    unit_of_measure: item.unit_of_measure,
    estimated_unit_price: item.estimated_unit_price,
    estimated_total: item.estimated_total,
    approved_quantity: item.approved_quantity,
    notes: item.notes,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    override_approved_by: null,
    override_reason: null,
    override_approved_at: null,
    product_name: item.products?.product_name || null,
    product_code: item.products?.product_code || null,
  }));
}

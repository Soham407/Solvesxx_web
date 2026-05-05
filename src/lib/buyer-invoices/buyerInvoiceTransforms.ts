export type InvoiceStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "disputed"
  | "cancelled"
  | "submitted"
  | "approved";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface BuyerInvoice {
  id: string;
  sale_bill_id?: string;
  invoice_number: string;
  client_id: string | null;
  contract_id: string | null;
  request_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  last_payment_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  client_name?: string;
  client_code?: string;
  contract_number?: string;
  feedback_submitted?: boolean | null;
  supplier_name?: string | null;
  total_items?: number;
}

export interface InvoiceItem {
  id: string;
  sale_bill_id: string;
  service_id: string | null;
  product_id: string | null;
  item_description: string | null;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  service_name?: string;
  product_name?: string;
}

export interface CreateInvoiceInput {
  client_id: string;
  contract_id?: string;
  invoice_date?: string;
  due_date?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  notes?: string;
}

export interface CreateInvoiceItemInput {
  sale_bill_id: string;
  service_id?: string;
  product_id?: string;
  item_description?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
}

export interface PaymentInput {
  amount: number;
  payment_date?: string;
  payment_reference?: string;
  payment_method?: string;
  notes?: string;
}

type SaleBillRow = {
  id: string;
  request_id: string | null;
  invoice_number: string | null;
  client_id: string;
  contract_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  payment_status: string;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
  last_payment_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  societies?: { society_name?: string | null; society_code?: string | null } | null;
  contracts?: { contract_number?: string | null } | null;
  requests?: { buyer_id?: string | null; request_number?: string | null; title?: string | null } | null;
};

type SaleBillItemRow = {
  id: string;
  sale_bill_id: string;
  service_id: string | null;
  product_id: string | null;
  item_description: string | null;
  quantity: number | null;
  unit_of_measure: string | null;
  unit_price: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  line_total: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  products?: { product_name?: string | null } | null;
  services?: { service_name?: string | null } | null;
};

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Sent", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-critical/10 text-critical border-critical/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-critical text-critical-foreground" },
};

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "disputed"],
  sent: ["acknowledged", "disputed"],
  acknowledged: ["disputed"],
  cancelled: [],
  submitted: ["approved", "disputed"],
  approved: ["disputed"],
  disputed: ["draft", "sent"],
};

export function canTransition(currentStatus: InvoiceStatus, targetStatus: InvoiceStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discountAmount: number = 0,
): { taxAmount: number; lineTotal: number } {
  const subtotal = quantity * unitPrice;
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const lineTotal = subtotal + taxAmount - discountAmount;
  return { taxAmount, lineTotal };
}

export function normalizeInvoiceStatus(status: string | null | undefined): InvoiceStatus {
  if (
    status === "draft" ||
    status === "sent" ||
    status === "acknowledged" ||
    status === "disputed" ||
    status === "cancelled" ||
    status === "submitted" ||
    status === "approved"
  ) {
    return status;
  }
  return "draft";
}

export function normalizePaymentStatus(status: string | null | undefined): PaymentStatus {
  if (status === "unpaid" || status === "partial" || status === "paid" || status === "overdue") {
    return status;
  }
  return "unpaid";
}

export function mapInvoices(rows: SaleBillRow[], feedbackRequestIds: Set<string>, role: string | null, userId: string | null): BuyerInvoice[] {
  const scopedBills = rows.filter((bill) => role !== "buyer" || bill.requests?.buyer_id === userId);
  return scopedBills.map((bill) => ({
    id: bill.id,
    sale_bill_id: bill.id,
    invoice_number: bill.invoice_number || `INV-${String(bill.id).slice(0, 8).toUpperCase()}`,
    client_id: bill.client_id,
    contract_id: bill.contract_id,
    request_id: bill.request_id,
    invoice_date: bill.invoice_date,
    due_date: bill.due_date,
    status: normalizeInvoiceStatus(bill.status),
    payment_status: normalizePaymentStatus(bill.payment_status),
    subtotal: bill.subtotal || 0,
    tax_amount: bill.tax_amount || 0,
    discount_amount: bill.discount_amount || 0,
    total_amount: bill.total_amount || 0,
    paid_amount: bill.paid_amount || 0,
    due_amount: bill.due_amount || 0,
    last_payment_date: bill.last_payment_date,
    billing_period_start: bill.billing_period_start,
    billing_period_end: bill.billing_period_end,
    notes: bill.notes,
    created_at: bill.created_at || new Date().toISOString(),
    updated_at: bill.updated_at || new Date().toISOString(),
    created_by: bill.created_by,
    updated_by: bill.updated_by,
    client_name: bill.societies?.society_name || bill.requests?.title || "Unknown",
    client_code: bill.societies?.society_code || bill.requests?.request_number || "N/A",
    contract_number: bill.contracts?.contract_number || null,
    supplier_name: null,
    feedback_submitted: bill.request_id ? feedbackRequestIds.has(bill.request_id) : null,
    total_items: null,
  }));
}

export function mapInvoiceItems(rows: SaleBillItemRow[]): InvoiceItem[] {
  return rows.map((item) => ({
    id: item.id,
    sale_bill_id: item.sale_bill_id,
    service_id: item.service_id,
    product_id: item.product_id,
    item_description: item.item_description,
    quantity: item.quantity || 0,
    unit_of_measure: item.unit_of_measure || "pcs",
    unit_price: item.unit_price || 0,
    tax_rate: item.tax_rate || 0,
    tax_amount: item.tax_amount || 0,
    discount_amount: item.discount_amount || 0,
    line_total: item.line_total || 0,
    notes: item.notes,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    service_name: item.services?.service_name || undefined,
    product_name: item.products?.product_name || undefined,
  }));
}

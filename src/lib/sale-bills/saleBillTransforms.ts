export type InvoiceStatus = "draft" | "sent" | "acknowledged" | "disputed" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface SaleBill {
  id: string;
  invoice_number: string;
  client_id: string | null;
  contract_id: string | null;
  request_id?: string | null;
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
  paid_at?: string | null;
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
  request_number?: string;
}

export interface SaleBillItem {
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

export interface CreateSaleBillInput {
  client_id: string;
  contract_id?: string;
  request_id?: string;
  invoice_date?: string;
  due_date?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  notes?: string;
  items: Array<{
    service_id?: string;
    product_id?: string;
    item_description?: string;
    quantity: number;
    unit_of_measure?: string;
    unit_price: number;
    tax_rate?: number;
    notes?: string;
  }>;
}

export interface InvoiceStatusConfigEntry {
  label: string;
  className: string;
}

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, InvoiceStatusConfigEntry> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Sent", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, InvoiceStatusConfigEntry> = {
  unpaid: { label: "Unpaid", className: "bg-critical/10 text-critical border-critical/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-critical text-critical-foreground" },
};

export type SaleBillRow = SaleBill & {
  societies?: {
    society_name: string | null;
    society_code: string | null;
  } | null;
  contracts?: {
    contract_number: string | null;
  } | null;
  requests?: {
    request_number: string | null;
  } | null;
};

export function mapSaleBillRow(row: SaleBillRow): SaleBill {
  return {
    ...row,
    client_name: row.societies?.society_name || "Unknown",
    client_code: row.societies?.society_code || "N/A",
    contract_number: row.contracts?.contract_number || null,
    request_number: row.requests?.request_number || null,
  };
}

export function mapSaleBillRows(rows: SaleBillRow[]): SaleBill[] {
  return rows.map(mapSaleBillRow);
}

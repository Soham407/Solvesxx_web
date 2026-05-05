import { formatCurrency as centralizedFormatCurrency, toPaise, toRupees } from "@/src/lib/utils/currency";

export type BillStatus = "draft" | "submitted" | "approved" | "disputed";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface SupplierBill {
  id: string;
  bill_number: string;
  supplier_invoice_number: string | null;
  purchase_order_id: string | null;
  service_purchase_order_id?: string | null;
  material_receipt_id: string | null;
  supplier_id: string | null;
  document_url?: string | null;
  bill_date: string;
  due_date: string | null;
  status: BillStatus;
  payment_status: PaymentStatus;
  match_status?: string | null;
  is_reconciled?: boolean | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  last_payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  supplier_name?: string;
  supplier_code?: string;
  po_number?: string;
  grn_number?: string;
  total_items?: number;
}

export interface BillItem {
  id: string;
  purchase_bill_id: string;
  po_item_id: string | null;
  grn_item_id: string | null;
  product_id: string | null;
  item_description: string | null;
  billed_quantity: number;
  unit_of_measure: string;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  line_total: number;
  unmatched_qty: number | null;
  unmatched_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_code?: string;
}

export interface CreateBillInput {
  supplier_invoice_number?: string;
  purchase_order_id?: string;
  service_purchase_order_id?: string;
  material_receipt_id?: string;
  supplier_id: string;
  bill_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  notes?: string;
}

export interface CreateBillItemInput {
  purchase_bill_id: string;
  po_item_id?: string;
  grn_item_id?: string;
  product_id?: string;
  item_description?: string;
  billed_quantity: number;
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
  notes?: string;
}

export interface BillItemRow extends BillItem {
  products?: {
    product_name?: string | null;
    product_code?: string | null;
  } | null;
}

export interface SupplierBillRow extends SupplierBill {
  suppliers?: {
    supplier_name?: string | null;
    supplier_code?: string | null;
  } | null;
  purchase_orders?: {
    po_number?: string | null;
  } | null;
  material_receipts?: {
    grn_number?: string | null;
  } | null;
}

export interface GrnItemRow {
  id: string;
  po_item_id: string | null;
  product_id: string | null;
  item_description: string | null;
  accepted_quantity: number | null;
  received_quantity: number;
  unit_price: number | null;
  line_total: number | null;
  notes: string | null;
}

const STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  draft: ["submitted", "disputed"],
  submitted: ["approved", "disputed"],
  approved: ["disputed"],
  disputed: ["draft", "submitted"],
};

export const BILL_STATUS_CONFIG: Record<BillStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-critical/10 text-critical border-critical/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
};

export function canTransition(currentStatus: BillStatus, targetStatus: BillStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function toBillStatus(status: string | null | undefined): BillStatus {
  if (status === "draft" || status === "submitted" || status === "approved" || status === "disputed") {
    return status;
  }
  return "draft";
}

export function toPaymentStatus(status: string | null | undefined): PaymentStatus {
  if (status === "unpaid" || status === "partial" || status === "paid") {
    return status;
  }
  return "unpaid";
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

export function mapSupplierBills(rows: SupplierBillRow[]): SupplierBill[] {
  return rows.map((bill) => ({
    ...bill,
    status: toBillStatus(bill.status),
    payment_status: toPaymentStatus(bill.payment_status),
    supplier_name: bill.suppliers?.supplier_name || "Unknown",
    supplier_code: bill.suppliers?.supplier_code || "N/A",
    po_number: bill.purchase_orders?.po_number || null,
    grn_number: bill.material_receipts?.grn_number || null,
  }));
}

export function mapBillItems(rows: BillItemRow[]): BillItem[] {
  return rows.map((item) => ({
    ...item,
    product_name: item.products?.product_name || null,
    product_code: item.products?.product_code || null,
  }));
}

export function calculateBillTotals(items: Array<{ unit_price: number; billed_quantity: number; tax_amount?: number | null; discount_amount?: number | null }>) {
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  for (const item of items) {
    subtotal += item.unit_price * item.billed_quantity;
    totalTax += item.tax_amount || 0;
    totalDiscount += item.discount_amount || 0;
  }

  return {
    subtotal,
    totalTax,
    totalDiscount,
    totalAmount: subtotal + totalTax - totalDiscount,
  };
}

export function formatBillCurrency(amount: number): string {
  return centralizedFormatCurrency(toPaise(toRupees(amount)));
}

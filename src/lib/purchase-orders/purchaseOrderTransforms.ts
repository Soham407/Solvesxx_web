import { supabase } from "@/src/lib/supabaseClient";
import { toPaise } from "@/src/lib/utils/currency";

export type POStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
  | "dispatched"
  | "partial_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  po_number: string | null;
  indent_id: string | null;
  supplier_id: string | null;
  po_date: string | null;
  expected_delivery_date: string | null;
  status: POStatus | null;
  shipping_address: string | null;
  billing_address: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  shipping_cost: number | null;
  grand_total: number | null;
  payment_terms: string | null;
  sent_to_vendor_at: string | null;
  vendor_acknowledged_at: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  supplier_name?: string;
  supplier_code?: string;
  indent_number?: string;
  total_items?: number;
}

export interface POItem {
  id: string;
  purchase_order_id: string;
  indent_item_id: string | null;
  product_id: string | null;
  item_description: string | null;
  specifications: string | null;
  ordered_quantity: number;
  unit_of_measure: string;
  received_quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_percent: number;
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

export interface SupplierRateLookupResult {
  rate: number;
  discountPercentage: number;
  gstPercentage: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  supplierProductId: string;
  found: boolean;
}

export interface SupplierRatesForProducts {
  [productId: string]: SupplierRateLookupResult | null;
}

interface SupplierRateRow {
  supplier_product_id: string;
  rate: number | null;
  discount_percentage: number | null;
  gst_percentage: number | null;
  effective_from: string;
  effective_to: string | null;
}

function normalizeSupplierRateRows(rows: unknown): SupplierRateRow[] {
  return Array.isArray(rows) ? (rows as SupplierRateRow[]) : [];
}

interface PurchaseOrderRow {
  id: string;
  po_number: string | null;
  indent_id: string | null;
  supplier_id: string | null;
  po_date: string | null;
  expected_delivery_date: string | null;
  status: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  shipping_cost: number | null;
  grand_total: number | null;
  payment_terms: string | null;
  sent_to_vendor_at: string | null;
  vendor_acknowledged_at: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  suppliers?: {
    supplier_name?: string | null;
    supplier_code?: string | null;
  } | null;
  indents?: {
    indent_number?: string | null;
  } | null;
}

interface PurchaseOrderItemRow extends POItem {
  products?: {
    product_name: string | null;
    product_code: string | null;
  } | null;
}

interface IndentItemRow {
  id: string;
  product_id: string | null;
  approved_quantity: number | null;
  requested_quantity: number;
  estimated_unit_price: number | null;
  item_description: string | null;
  specifications: string | null;
  unit_of_measure: string | null;
  notes: string | null;
}

const STATUS_VALUES: POStatus[] = [
  "draft",
  "sent_to_vendor",
  "acknowledged",
  "dispatched",
  "partial_received",
  "received",
  "cancelled",
];

export const PO_RECEIPT_READY_STATUSES: readonly POStatus[] = [
  "acknowledged",
  "dispatched",
  "partial_received",
];

export function toPOStatus(status: string | null | undefined): POStatus | null {
  return STATUS_VALUES.includes(status as POStatus) ? (status as POStatus) : null;
}

export function canTransition(currentStatus: POStatus, targetStatus: POStatus): boolean {
  const STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
    draft: ["sent_to_vendor", "cancelled"],
    sent_to_vendor: ["acknowledged", "cancelled"],
    acknowledged: ["dispatched", "partial_received", "received"],
    dispatched: ["partial_received", "received"],
    partial_received: ["received"],
    received: [],
    cancelled: [],
  };

  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discountPercent: number = 0,
): { lineTotal: number; taxAmount: number; discountAmount: number } {
  const baseAmount = quantity * unitPrice;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const afterDiscount = baseAmount - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const lineTotal = afterDiscount + taxAmount;

  return { lineTotal, taxAmount, discountAmount };
}

export function mapPurchaseOrders(rows: PurchaseOrderRow[]): PurchaseOrder[] {
  return rows.map((po) => ({
    ...po,
    status: toPOStatus(po.status),
    supplier_name: po.suppliers?.supplier_name || "Unknown",
    supplier_code: po.suppliers?.supplier_code || "N/A",
    indent_number: po.indents?.indent_number || null,
  }));
}

export function mapPurchaseOrderItems(rows: PurchaseOrderItemRow[]): POItem[] {
  return rows.map((item) => ({
    ...item,
    product_name: item.products?.product_name || null,
    product_code: item.products?.product_code || null,
  }));
}

export function normalizePurchaseOrderRows(rows: unknown): PurchaseOrderRow[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderRow[]) : [];
}

export function normalizePurchaseOrderItemRows(rows: unknown): PurchaseOrderItemRow[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderItemRow[]) : [];
}

export async function getSupplierRateForProduct(
  supplierId: string,
  productId: string,
  asOfDate?: string,
): Promise<SupplierRateLookupResult | null> {
  try {
    const effectiveDate = asOfDate || new Date().toISOString().split("T")[0];

    const { data: supplierProduct, error: spError } = await supabase
      .from("supplier_products")
      .select("id")
      .eq("supplier_id", supplierId)
      .eq("product_id", productId)
      .maybeSingle();

    if (spError || !supplierProduct) {
      return null;
    }

    const { data: rateData, error: rateError } = await supabase
      .from("supplier_rates")
      .select("*")
      .eq("supplier_product_id", supplierProduct.id)
      .eq("is_active", true)
      .lte("effective_from", effectiveDate)
      .or(`effective_to.is.null,effective_to.gte.${effectiveDate}`)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateError || !rateData) {
      return null;
    }

    const rate = normalizeSupplierRateRows([rateData])[0];
    if (!rate) {
      return null;
    }
    return {
      rate: rate.rate || 0,
      discountPercentage: rate.discount_percentage || 0,
      gstPercentage: rate.gst_percentage || 0,
      effectiveFrom: rate.effective_from,
      effectiveTo: rate.effective_to,
      supplierProductId: supplierProduct.id,
      found: true,
    };
  } catch (err) {
    console.error("Error in getSupplierRateForProduct:", err);
    return null;
  }
}

export async function getSupplierRatesForProducts(
  supplierId: string,
  productIds: string[],
  asOfDate?: string,
): Promise<SupplierRatesForProducts> {
  const results: SupplierRatesForProducts = {};
  productIds.forEach((id) => {
    results[id] = null;
  });

  if (productIds.length === 0) return results;

  try {
    const effectiveDate = asOfDate || new Date().toISOString().split("T")[0];

    const { data: supplierProducts, error: spError } = await supabase
      .from("supplier_products")
      .select("id, product_id")
      .eq("supplier_id", supplierId)
      .in("product_id", productIds);

    if (spError || !supplierProducts || supplierProducts.length === 0) {
      return results;
    }

    const spIds = supplierProducts.map((sp: { id: string }) => sp.id);
    const spIdToProductId: Record<string, string> = {};
    supplierProducts.forEach((sp: { id: string; product_id: string | null }) => {
      if (sp.product_id) {
        spIdToProductId[sp.id] = sp.product_id;
      }
    });

    const { data: rates, error: ratesError } = await supabase
      .from("supplier_rates")
      .select("*")
      .in("supplier_product_id", spIds)
      .eq("is_active", true)
      .lte("effective_from", effectiveDate)
      .or(`effective_to.is.null,effective_to.gte.${effectiveDate}`)
      .order("effective_from", { ascending: false });

    if (ratesError || !rates) {
      return results;
    }

    const processedSpIds = new Set<string>();
    normalizeSupplierRateRows(rates).forEach((rate) => {
      if (processedSpIds.has(rate.supplier_product_id)) return;

      const productId = spIdToProductId[rate.supplier_product_id];
      if (productId) {
        results[productId] = {
          rate: rate.rate || 0,
          discountPercentage: rate.discount_percentage || 0,
          gstPercentage: rate.gst_percentage || 0,
          effectiveFrom: rate.effective_from,
          effectiveTo: rate.effective_to,
          supplierProductId: rate.supplier_product_id,
          found: true,
        };
        processedSpIds.add(rate.supplier_product_id);
      }
    });

    return results;
  } catch (err) {
    console.error("Error in getSupplierRatesForProducts:", err);
    return results;
  }
}

export async function fetchPurchaseOrderRows(filters?: { status?: POStatus; supplierId?: string }): Promise<PurchaseOrder[]> {
  let query = supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers!supplier_id (
        supplier_name,
        supplier_code
      ),
      indents!indent_id (
        indent_number
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.supplierId) {
    query = query.eq("supplier_id", filters.supplierId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapPurchaseOrders(normalizePurchaseOrderRows(data));
}

export async function fetchPurchaseOrderItemRows(poId: string): Promise<POItem[]> {
  const { data, error } = await supabase
    .from("purchase_order_items")
    .select(`
      *,
      products!product_id (
        product_name,
        product_code
      )
    `)
    .eq("purchase_order_id", poId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return mapPurchaseOrderItems(normalizePurchaseOrderItemRows(data));
}

export function createPOItemRows(input: {
  purchaseOrderId: string;
  items: Array<{
    indent_item_id?: string;
    product_id?: string | null;
    item_description?: string | null;
    specifications?: string | null;
    ordered_quantity: number;
    unit_of_measure?: string | null;
    unit_price: number;
    tax_rate?: number;
    discount_percent?: number;
    notes?: string | null;
    received_quantity?: number;
  }>;
}) {
  return input.items.map((item) => {
    const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
      item.ordered_quantity,
      item.unit_price,
      item.tax_rate,
      item.discount_percent,
    );

    return {
      purchase_order_id: input.purchaseOrderId,
      indent_item_id: item.indent_item_id,
      product_id: item.product_id,
      item_description: item.item_description,
      specifications: item.specifications,
      ordered_quantity: item.ordered_quantity,
      unit_of_measure: item.unit_of_measure || "pcs",
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
      tax_amount: taxAmount,
      discount_percent: item.discount_percent || 0,
      discount_amount: discountAmount,
      line_total: lineTotal,
      unmatched_qty: item.ordered_quantity,
      unmatched_amount: lineTotal,
      notes: item.notes,
    };
  });
}

export function toPaiseFromRate(rate: number): number {
  return toPaise(rate);
}

"use client";

import { toPaise } from "@/src/lib/utils/currency";

export interface ReorderAlertForPlanning {
  id: string;
  productId: string | null;
  productName: string | null;
  productCode: string | null;
  warehouseName: string | null;
  suggestedQuantity: number;
}

export interface SupplierProductMatch {
  supplier_product_id: string;
  supplier_id: string;
  product_id: string | null;
  suppliers?: {
    supplier_name: string | null;
    supplier_code: string | null;
  } | null;
}

export interface SupplierRateMatch {
  supplier_product_id: string;
  rate: number | null;
  discount_percentage: number | null;
  gst_percentage: number | null;
}

export interface PlannedReorderItem {
  alertId: string;
  productId: string | null;
  itemDescription: string;
  warehouseName: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  taxAmount: number;
  discountAmount: number;
  supplierProductId: string;
}

export interface PlannedReorderGroup {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  alerts: ReorderAlertForPlanning[];
  items: PlannedReorderItem[];
}

export interface BuildReorderPlansInput {
  alerts: ReorderAlertForPlanning[];
  supplierProducts: SupplierProductMatch[];
  supplierRates: SupplierRateMatch[];
}

export interface BuildReorderPlansResult {
  groups: PlannedReorderGroup[];
  unmappedAlerts: ReorderAlertForPlanning[];
}

function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  taxRate = 0,
  discountPercent = 0,
): { lineTotal: number; taxAmount: number; discountAmount: number } {
  const baseAmount = quantity * unitPrice;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const afterDiscount = baseAmount - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const lineTotal = afterDiscount + taxAmount;

  return { lineTotal, taxAmount, discountAmount };
}

export function buildReorderPlans({
  alerts,
  supplierProducts,
  supplierRates,
}: BuildReorderPlansInput): BuildReorderPlansResult {
  const rateBySupplierProductId = new Map<string, SupplierRateMatch>();
  supplierRates.forEach((rate) => {
    if (!rateBySupplierProductId.has(rate.supplier_product_id)) {
      rateBySupplierProductId.set(rate.supplier_product_id, rate);
    }
  });

  const supplierGroups = new Map<string, PlannedReorderGroup>();
  const unmappedAlerts: ReorderAlertForPlanning[] = [];

  alerts.forEach((alert) => {
    const candidates = supplierProducts.filter((row) => row.product_id === alert.productId);
    const bestMatch =
      candidates.find((row) => rateBySupplierProductId.has(row.supplier_product_id)) ||
      candidates[0];

    if (!bestMatch) {
      unmappedAlerts.push(alert);
      return;
    }

    const supplierId = bestMatch.supplier_id;
    if (!supplierGroups.has(supplierId)) {
      supplierGroups.set(supplierId, {
        supplierId,
        supplierName: bestMatch.suppliers?.supplier_name || "Unknown Supplier",
        supplierCode: bestMatch.suppliers?.supplier_code || "N/A",
        alerts: [],
        items: [],
      });
    }

    const group = supplierGroups.get(supplierId)!;
    group.alerts.push(alert);

    const rateInfo = rateBySupplierProductId.get(bestMatch.supplier_product_id);
    const unitPrice = rateInfo?.rate ? toPaise(rateInfo.rate) : 0;
    const taxRate = rateInfo?.gst_percentage || 0;
    const discountPercent = rateInfo?.discount_percentage || 0;
    const quantity = Math.max(1, alert.suggestedQuantity || 0);
    const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
      quantity,
      unitPrice,
      taxRate,
      discountPercent,
    );

    group.items.push({
      alertId: alert.id,
      productId: alert.productId,
      itemDescription: alert.productName || alert.productCode || "Reorder item",
      warehouseName: alert.warehouseName,
      quantity,
      unitPrice,
      taxRate,
      discountPercent,
      lineTotal,
      taxAmount,
      discountAmount,
      supplierProductId: bestMatch.supplier_product_id,
    });
  });

  return {
    groups: Array.from(supplierGroups.values()),
    unmappedAlerts,
  };
}

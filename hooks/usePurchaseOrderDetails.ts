"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { 
  POStatus, 
  PurchaseOrder, 
  POItem, 
  CreatePOInput, 
  CreatePOItemInput,
  SupplierRateLookupResult,
  SupplierRatesForProducts,
  PO_STATUS_CONFIG 
} from "./usePurchaseOrders";
import {
  mapPurchaseOrderItems,
  mapPurchaseOrders,
} from "@/src/lib/purchase-orders/purchaseOrderTransforms";
import { toPaise } from "@/src/lib/utils/currency";

type PoTransitionRpcResult = {
  success?: boolean;
  error?: string;
};

type PurchaseOrderRowInput = Parameters<typeof mapPurchaseOrders>[0][number];
type PurchaseOrderItemRowInput = Parameters<typeof mapPurchaseOrderItems>[0][number];

// Helper function from original hook
const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discountPercent: number = 0
): { lineTotal: number; taxAmount: number; discountAmount: number } => {
  const baseAmount = quantity * unitPrice;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const afterDiscount = baseAmount - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const lineTotal = afterDiscount + taxAmount;
  
  return { lineTotal, taxAmount, discountAmount };
};

function normalizePurchaseOrderRow(row: unknown): PurchaseOrderRowInput {
  return row as PurchaseOrderRowInput;
}

function normalizePurchaseOrderItemRows(rows: unknown): PurchaseOrderItemRowInput[] {
  return Array.isArray(rows) ? (rows as PurchaseOrderItemRowInput[]) : [];
}

/**
 * Hook for managing a single Purchase Order's details, items, and lifecycle.
 * Extracted from usePurchaseOrders to improve maintainability.
 */
export function usePurchaseOrderDetails(poId?: string) {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPODetails = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch PO info
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers:supplier_id (supplier_name, supplier_code),
          indents:indent_id (indent_number)
        `)
        .eq("id", id)
        .single();

      if (poError) throw poError;
      
      setPurchaseOrder(mapPurchaseOrders([normalizePurchaseOrderRow(po)])[0] ?? null);

      // Fetch Items
      const { data: poItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          products:product_id (product_name, product_code)
        `)
        .eq("purchase_order_id", id);

      if (itemsError) throw itemsError;

      setItems(mapPurchaseOrderItems(normalizePurchaseOrderItemRows(poItems)));

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch PO details";
      console.error("Error fetching PO details:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (poId) {
      fetchPODetails(poId);
    }
  }, [poId, fetchPODetails]);

  // Supplier Rate Lookups
  const getSupplierRateForProduct = useCallback(async (
    supplierId: string,
    productId: string
  ): Promise<SupplierRateLookupResult | null> => {
    try {
      const { data: supplierProduct } = await supabase
        .from("supplier_products")
        .select("id")
        .eq("supplier_id", supplierId)
        .eq("product_id", productId)
        .maybeSingle();

      if (!supplierProduct) return null;

      const { data: rateData } = await supabase
        .from("supplier_rates")
        .select("*")
        .eq("supplier_product_id", supplierProduct.id)
        .eq("is_active", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rateData) return null;
      
      const rate = rateData as {
        rate: number | null;
        effective_from: string;
        effective_to?: string | null;
        supplier_product_id: string;
      };
      return {
        rate: rate.rate || 0,
        discountPercentage: 0,
        gstPercentage: 0,
        effectiveFrom: rate.effective_from,
        effectiveTo: rate.effective_to,
        supplierProductId: supplierProduct.id,
        found: true,
      };
    } catch (err) {
      return null;
    }
  }, []);

  // CRUD Operations
  const createPurchaseOrder = async (input: CreatePOInput): Promise<PurchaseOrder | null> => {
    setIsLoading(true);
    try {
      const { data, error: createError } = await supabase
        .from("purchase_orders")
        .insert(input)
        .select()
        .single();

      if (createError) throw createError;
      return data as PurchaseOrder;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<CreatePOInput>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", id);
      if (updateError) throw updateError;
      if (poId === id) fetchPODetails(id);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update purchase order");
      return false;
    }
  };

  const addPOItem = async (input: CreatePOItemInput): Promise<boolean> => {
    try {
      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        input.ordered_quantity,
        input.unit_price,
        input.tax_rate,
        input.discount_percent
      );

      const { error: insertError } = await supabase
        .from("purchase_order_items")
        .insert({
          ...input,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          line_total: lineTotal,
          unmatched_qty: input.ordered_quantity,
          unmatched_amount: lineTotal,
        });

      if (insertError) throw insertError;
      if (poId) fetchPODetails(poId);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add PO item");
      return false;
    }
  };

  const updateStatus = async (id: string, newStatus: POStatus): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status', {
        p_po_id: id,
        p_new_status: newStatus,
        p_user_id: user?.id,
      });

      if (rpcError) throw rpcError;
      const rpcResult = result as PoTransitionRpcResult | null;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      if (poId === id) fetchPODetails(id);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      return false;
    }
  };

  return {
    purchaseOrder,
    items,
    isLoading,
    error,
    createPurchaseOrder,
    updatePurchaseOrder,
    addPOItem,
    updateStatus,
    getSupplierRateForProduct,
    refresh: () => poId && fetchPODetails(poId),
  };
}

export default usePurchaseOrderDetails;

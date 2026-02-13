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
import { toPaise } from "@/src/lib/utils/currency";

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
      
      const formattedPO = {
        ...po,
        supplier_name: po.suppliers?.supplier_name,
        supplier_code: po.suppliers?.supplier_code,
        indent_number: po.indents?.indent_number,
      };

      setPurchaseOrder(formattedPO as unknown as PurchaseOrder);

      // Fetch Items
      const { data: poItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          products:product_id (product_name, product_code)
        `)
        .eq("purchase_order_id", id);

      if (itemsError) throw itemsError;

      setItems((poItems || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name,
        product_code: item.products?.product_code,
      })));

    } catch (err: any) {
      console.error("Error fetching PO details:", err);
      setError(err.message || "Failed to fetch PO details");
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
      
      const rate = rateData as any;
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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateStatus = async (id: string, newStatus: POStatus): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status' as any, {
        p_po_id: id,
        p_new_status: newStatus,
        p_user_id: user?.id,
      });

      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      if (poId === id) fetchPODetails(id);
      return true;
    } catch (err: any) {
      setError(err.message);
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

export type POStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
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
  subtotal: number | null; // In paise
  tax_amount: number | null; // In paise
  discount_amount: number | null; // In paise
  shipping_cost: number | null; // In paise
  grand_total: number | null; // In paise
  payment_terms: string | null;
  sent_to_vendor_at: string | null;
  vendor_acknowledged_at: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
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
  unit_price: number; // In paise
  tax_rate: number;
  tax_amount: number; // In paise
  discount_percent: number;
  discount_amount: number; // In paise
  line_total: number; // In paise
  unmatched_qty: number | null;
  unmatched_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_code?: string;
}

export interface CreatePOInput {
  indent_id?: string;
  supplier_id: string;
  po_date?: string;
  expected_delivery_date?: string;
  shipping_address?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  shipping_cost?: number; // In paise
  discount_amount?: number; // In paise
}

export interface CreatePOItemInput {
  purchase_order_id: string;
  indent_item_id?: string;
  product_id?: string;
  item_description?: string;
  specifications?: string;
  ordered_quantity: number;
  unit_of_measure?: string;
  unit_price: number; // In paise
  tax_rate?: number;
  discount_percent?: number;
  notes?: string;
}

interface UsePurchaseOrdersState {
  purchaseOrders: PurchaseOrder[];
  items: POItem[];
  selectedPO: PurchaseOrder | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ["sent_to_vendor", "cancelled"],
  sent_to_vendor: ["acknowledged", "cancelled"],
  acknowledged: ["partial_received", "received"],
  partial_received: ["received"],
  received: [], // Terminal state
  cancelled: [], // Terminal state
};

// Status display configuration
export const PO_STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent_to_vendor: { label: "Sent to Vendor", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-primary/10 text-primary border-primary/20" },
  partial_received: { label: "Partial Received", className: "bg-warning/10 text-warning border-warning/20" },
  received: { label: "Received", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (currentStatus: POStatus, targetStatus: POStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

import { toRupees, toPaise, formatCurrency } from "@/src/lib/utils/currency";

// ============================================
// SUPPLIER RATE LOOKUP INTERFACES
// ============================================

export interface SupplierRateLookupResult {
  rate: number; // In the same unit as stored (Rupees, not paise)
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

// Calculate line total with tax and discount
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

// ============================================
// HOOK
// ============================================

export function usePurchaseOrders(filters?: { status?: POStatus; supplierId?: string }) {
  const [state, setState] = useState<UsePurchaseOrdersState>({
    purchaseOrders: [],
    items: [],
    selectedPO: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // SUPPLIER RATE LOOKUP FUNCTIONS
  // ============================================

  /**
   * Get current supplier rate for a specific product
   * Looks up from supplier_rates table via supplier_products
   * Returns rate in Rupees (not paise)
   */
  const getSupplierRateForProduct = useCallback(async (
    supplierId: string,
    productId: string,
    asOfDate?: string
  ): Promise<SupplierRateLookupResult | null> => {
    try {
      const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

      // First, find the supplier_product link
      const { data: supplierProduct, error: spError } = await supabase
        .from("supplier_products")
        .select("id")
        .eq("supplier_id", supplierId)
        .eq("product_id", productId)
        .maybeSingle();

      if (spError) {
        console.error("Error finding supplier product:", spError);
        return null;
      }

      if (!supplierProduct) {
        // No supplier-product link exists
        return null;
      }

      // Now get the current active rate for this supplier-product
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

      if (rateError) {
        console.error("Error fetching supplier rate:", rateError);
        return null;
      }

      if (!rateData) {
        return null;
      }

      // Cast to any to handle columns that may not exist yet (pending migration)
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
      console.error("Error in getSupplierRateForProduct:", err);
      return null;
    }
  }, []);

  /**
   * Get supplier rates for multiple products at once (batch lookup)
   * Useful when creating PO from indent with multiple items
   */
  const getSupplierRatesForProducts = useCallback(async (
    supplierId: string,
    productIds: string[],
    asOfDate?: string
  ): Promise<SupplierRatesForProducts> => {
    const results: SupplierRatesForProducts = {};
    
    // Initialize all as null
    productIds.forEach(id => { results[id] = null; });

    if (productIds.length === 0) return results;

    try {
      const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

      // Get all supplier_products for this supplier and these products
      const { data: supplierProducts, error: spError } = await supabase
        .from("supplier_products")
        .select("id, product_id")
        .eq("supplier_id", supplierId)
        .in("product_id", productIds);

      if (spError || !supplierProducts || supplierProducts.length === 0) {
        return results;
      }

      const spIds = supplierProducts.map((sp: any) => sp.id);
      const spIdToProductId: Record<string, string> = {};
      supplierProducts.forEach((sp: any) => {
        if (sp.product_id) {
          spIdToProductId[sp.id] = sp.product_id;
        }
      });

      // Get all current rates for these supplier_products
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

      // Map rates back to product IDs (taking the most recent for each)
      const processedSpIds = new Set<string>();
      
      rates.forEach((rate: any) => {
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
  }, []);

  // ============================================
  // FETCH PURCHASE ORDERS
  // ============================================
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

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

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const posWithDetails: PurchaseOrder[] = (data || []).map((po: any) => ({
        ...po,
        supplier_name: po.suppliers?.supplier_name || "Unknown",
        supplier_code: po.suppliers?.supplier_code || "N/A",
        indent_number: po.indents?.indent_number || null,
      }));

      setState((prev) => ({
        ...prev,
        purchaseOrders: posWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch purchase orders";
      console.error("Error fetching purchase orders:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.supplierId]);

  // ============================================
  // FETCH PO ITEMS
  // ============================================
  const fetchPOItems = useCallback(async (poId: string): Promise<POItem[]> => {
    try {
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

      const itemsWithDetails: POItem[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || null,
        product_code: item.products?.product_code || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching PO items:", err);
      return [];
    }
  }, []);

  // ============================================
  // GET PO WITH ITEMS
  // ============================================
  const getPOWithItems = useCallback(async (poId: string): Promise<{ po: PurchaseOrder | null; items: POItem[] }> => {
    try {
      // Fetch PO details
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          suppliers!supplier_id (
            supplier_name
          ),
          indents!indent_id (
            indent_number
          )
        `)
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      const po: PurchaseOrder = {
        ...poData,
        supplier_name: poData.suppliers?.supplier_name || "Unknown",
        indent_number: poData.indents?.indent_number ?? undefined,
      };

      // Fetch items
      const items = await fetchPOItems(poId);

      setState((prev) => ({ ...prev, selectedPO: po, items }));
      return { po, items };
    } catch (err: unknown) {
      console.error("Error fetching PO with items:", err);
      return { po: null, items: [] };
    }
  }, [fetchPOItems]);

  // ============================================
  // CREATE PURCHASE ORDER
  // ============================================
  const createPurchaseOrder = useCallback(async (input: CreatePOInput): Promise<PurchaseOrder | null> => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          indent_id: input.indent_id,
          supplier_id: input.supplier_id,
          po_date: input.po_date || new Date().toISOString().split('T')[0],
          expected_delivery_date: input.expected_delivery_date,
          shipping_address: input.shipping_address,
          billing_address: input.billing_address,
          payment_terms: input.payment_terms,
          shipping_cost: input.shipping_cost || 0,
          discount_amount: input.discount_amount || 0,
          notes: input.notes,
          terms_and_conditions: input.terms_and_conditions,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      return data as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create purchase order";
      console.error("Error creating purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // CREATE PO FROM INDENT
  // ============================================
  const createPOFromIndent = useCallback(async (
    indentId: string,
    supplierId: string,
    options?: {
      expected_delivery_date?: string;
      shipping_address?: string;
      billing_address?: string;
      payment_terms?: string;
      notes?: string;
      useSupplierRates?: boolean; // If true, auto-populate rates from supplier_rates
    }
  ): Promise<PurchaseOrder | null> => {
    try {
      // Fetch indent details
      const { data: indent, error: indentError } = await supabase
        .from("indents")
        .select("*")
        .eq("id", indentId)
        .single();

      if (indentError) throw indentError;

      if (indent.status !== "approved") {
        throw new Error("Only approved indents can be converted to PO");
      }

      // Fetch indent items
      const { data: indentItems, error: itemsError } = await supabase
        .from("indent_items")
        .select("*")
        .eq("indent_id", indentId);

      if (itemsError) throw itemsError;

      if (!indentItems || indentItems.length === 0) {
        throw new Error("Indent has no items");
      }

      // Fetch supplier rates for all products if useSupplierRates is enabled (default: true)
      let supplierRates: SupplierRatesForProducts = {};
      const shouldUseSupplierRates = options?.useSupplierRates !== false;
      
      if (shouldUseSupplierRates) {
        const productIds = indentItems
          .map((item: any) => item.product_id)
          .filter((id: string | null) => id !== null);
        
        if (productIds.length > 0) {
          supplierRates = await getSupplierRatesForProducts(supplierId, productIds);
        }
      }

      // Create PO
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          indent_id: indentId,
          supplier_id: supplierId,
          po_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: options?.expected_delivery_date,
          shipping_address: options?.shipping_address,
          billing_address: options?.billing_address,
          payment_terms: options?.payment_terms,
          notes: options?.notes || `Created from indent ${indent.indent_number}`,
          status: "draft",
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create PO items from indent items with supplier rates
      const poItems = indentItems.map((item: any) => {
        const quantity = item.approved_quantity || item.requested_quantity;
        
        // Try to get supplier rate, fall back to indent estimated price
        const rateInfo = item.product_id ? supplierRates[item.product_id] : null;
        
        // If supplier rate found, convert from Rupees to paise for storage
        // Otherwise use indent's estimated_unit_price (already in paise or 0)
        let unitPrice = item.estimated_unit_price || 0;
        let taxRate = 0;
        let discountPercent = 0;

        if (rateInfo && rateInfo.found) {
          // Convert rate from Rupees to paise
          unitPrice = toPaise(rateInfo.rate);
          taxRate = rateInfo.gstPercentage || 0;
          discountPercent = rateInfo.discountPercentage || 0;
        }

        // Calculate line totals
        const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
          quantity,
          unitPrice,
          taxRate,
          discountPercent
        );

        return {
          purchase_order_id: po.id,
          indent_item_id: item.id,
          product_id: item.product_id,
          item_description: item.item_description,
          specifications: item.specifications,
          ordered_quantity: quantity,
          unit_of_measure: item.unit_of_measure,
          unit_price: unitPrice,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          line_total: lineTotal,
          unmatched_qty: quantity,
          unmatched_amount: lineTotal,
          notes: rateInfo?.found 
            ? `${item.notes || ''} [Rate from supplier contract]`.trim()
            : item.notes,
        };
      });

      const { error: poItemsError } = await supabase
        .from("purchase_order_items")
        .insert(poItems);

      if (poItemsError) throw poItemsError;

      // Update indent status to po_created
      const { error: updateIndentError } = await supabase
        .from("indents")
        .update({
          status: "po_created",
          po_created_at: new Date().toISOString(),
          linked_po_id: po.id,
        })
        .eq("id", indentId);

      if (updateIndentError) {
        console.warn("Warning: Failed to update indent status:", updateIndentError);
      }

      await fetchPurchaseOrders();
      return po as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create PO from indent";
      console.error("Error creating PO from indent:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPurchaseOrders, getSupplierRatesForProducts]);

  // ============================================
  // UPDATE PURCHASE ORDER
  // ============================================
  const updatePurchaseOrder = useCallback(async (
    poId: string,
    updates: Partial<CreatePOInput>
  ): Promise<PurchaseOrder | null> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (po && po.status !== "draft") {
        throw new Error("Only draft purchase orders can be edited");
      }

      const { data, error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", poId)
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders();
      return data as PurchaseOrder;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update purchase order";
      console.error("Error updating purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // DELETE PURCHASE ORDER
  // ============================================
  const deletePurchaseOrder = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (po && po.status !== "draft") {
        throw new Error("Only draft purchase orders can be deleted");
      }

      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", poId);

      if (error) throw error;

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete purchase order";
      console.error("Error deleting purchase order:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.purchaseOrders, fetchPurchaseOrders]);

  // ============================================
  // ADD PO ITEM
  // ============================================
  const addPOItem = useCallback(async (input: CreatePOItemInput): Promise<POItem | null> => {
    try {
      // Calculate totals
      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        input.ordered_quantity,
        input.unit_price,
        input.tax_rate,
        input.discount_percent
      );

      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert({
          purchase_order_id: input.purchase_order_id,
          indent_item_id: input.indent_item_id,
          product_id: input.product_id,
          item_description: input.item_description,
          specifications: input.specifications,
          ordered_quantity: input.ordered_quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          unit_price: input.unit_price,
          tax_rate: input.tax_rate || 0,
          tax_amount: taxAmount,
          discount_percent: input.discount_percent || 0,
          discount_amount: discountAmount,
          line_total: lineTotal,
          unmatched_qty: input.ordered_quantity,
          unmatched_amount: lineTotal,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPOItems(input.purchase_order_id);
      await fetchPurchaseOrders();
      return data as POItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add PO item";
      console.error("Error adding PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // ADD PO ITEM WITH AUTO RATE LOOKUP
  // ============================================
  /**
   * Add a PO item with automatic rate lookup from supplier_rates
   * If rate is found, it will be auto-populated along with discount and tax
   * If rate is not found, falls back to provided unit_price or 0
   */
  const addPOItemWithAutoRate = useCallback(async (
    poId: string,
    productId: string,
    supplierId: string,
    input: {
      ordered_quantity: number;
      item_description?: string;
      specifications?: string;
      unit_of_measure?: string;
      indent_item_id?: string;
      notes?: string;
      fallback_unit_price?: number; // Fallback price in paise if no rate found
    }
  ): Promise<{ item: POItem | null; rateFound: boolean; rateInfo: SupplierRateLookupResult | null }> => {
    try {
      // Look up supplier rate for this product
      const rateInfo = await getSupplierRateForProduct(supplierId, productId);
      
      let unitPrice = input.fallback_unit_price || 0;
      let taxRate = 0;
      let discountPercent = 0;
      let rateFound = false;

      if (rateInfo && rateInfo.found) {
        // Convert rate from Rupees to paise
        unitPrice = toPaise(rateInfo.rate);
        taxRate = rateInfo.gstPercentage || 0;
        discountPercent = rateInfo.discountPercentage || 0;
        rateFound = true;
      }

      // Calculate totals
      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        input.ordered_quantity,
        unitPrice,
        taxRate,
        discountPercent
      );

      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert({
          purchase_order_id: poId,
          indent_item_id: input.indent_item_id,
          product_id: productId,
          item_description: input.item_description,
          specifications: input.specifications,
          ordered_quantity: input.ordered_quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          unit_price: unitPrice,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          line_total: lineTotal,
          unmatched_qty: input.ordered_quantity,
          unmatched_amount: lineTotal,
          notes: rateFound 
            ? `${input.notes || ''} [Rate from supplier contract]`.trim()
            : input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPOItems(poId);
      await fetchPurchaseOrders();
      
      return { 
        item: data as POItem, 
        rateFound, 
        rateInfo 
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add PO item";
      console.error("Error adding PO item with auto rate:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return { item: null, rateFound: false, rateInfo: null };
    }
  }, [fetchPOItems, fetchPurchaseOrders, getSupplierRateForProduct]);

  // ============================================
  // UPDATE PO ITEM
  // ============================================
  const updatePOItem = useCallback(async (
    itemId: string,
    updates: Partial<CreatePOItemInput>
  ): Promise<POItem | null> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      // Recalculate if quantity or price changed
      const quantity = updates.ordered_quantity ?? item.ordered_quantity;
      const unitPrice = updates.unit_price ?? item.unit_price;
      const taxRate = updates.tax_rate ?? item.tax_rate;
      const discountPercent = updates.discount_percent ?? item.discount_percent;

      const { lineTotal, taxAmount, discountAmount } = calculateLineTotal(
        quantity,
        unitPrice,
        taxRate,
        discountPercent
      );

      const updateData = {
        ...updates,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        line_total: lineTotal,
        unmatched_qty: quantity - (item.received_quantity || 0),
        unmatched_amount: lineTotal,
      };

      const { data, error } = await supabase
        .from("purchase_order_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      await fetchPOItems(item.purchase_order_id);
      await fetchPurchaseOrders();
      return data as POItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update PO item";
      console.error("Error updating PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.items, fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // DELETE PO ITEM
  // ============================================
  const deletePOItem = useCallback(async (itemId: string, poId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await fetchPOItems(poId);
      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete PO item";
      console.error("Error deleting PO item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // SEND TO VENDOR
  // ============================================
  const sendToVendor = useCallback(async (poId: string): Promise<boolean> => {
    try {
      // Validate PO has items (client-side pre-check)
      const items = await fetchPOItems(poId);
      if (items.length === 0) {
        throw new Error("Cannot send PO without items");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status' as any, {
        p_po_id: poId,
        p_new_status: 'sent_to_vendor',
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      // UI-H1 Fix: Notify the supplier's portal user(s) that a PO has been issued to them.
      try {
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('supplier_id, po_number')
          .eq('id', poId)
          .single();

        if (poData?.supplier_id) {
          const { data: supplierUsers } = await supabase
            .from('users')
            .select('id')
            .eq('supplier_id', poData.supplier_id);

          for (const supplierUser of supplierUsers || []) {
            await supabase.from('notifications').insert({
              user_id: supplierUser.id,
              notification_type: 'po_issued',
              title: 'New Purchase Order Issued',
              message: `Purchase Order ${poData.po_number || poId} has been issued to you. Please review and acknowledge.`,
              reference_id: poId,
              reference_type: 'purchase_order',
            });
          }
        }
      } catch (notifyErr) {
        // Non-fatal: log but don't fail the mutation
        console.error('Failed to send PO issued notification:', notifyErr);
      }

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send to vendor";
      console.error("Error sending to vendor:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // ACKNOWLEDGE PO (Vendor Acknowledged)
  // ============================================
  const acknowledgePO = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status' as any, {
        p_po_id: poId,
        p_new_status: 'acknowledged',
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to acknowledge PO";
      console.error("Error acknowledging PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // UPDATE PO STATUS
  // ============================================
  const updatePOStatus = useCallback(async (
    poId: string,
    newStatus: POStatus
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status' as any, {
        p_po_id: poId,
        p_new_status: newStatus,
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update PO status";
      console.error("Error updating PO status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // CANCEL PO
  // ============================================
  const cancelPO = useCallback(async (poId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: result, error: rpcError } = await supabase.rpc('transition_po_status' as any, {
        p_po_id: poId,
        p_new_status: 'cancelled',
        p_user_id: userId,
      });
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Status transition failed');

      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel PO";
      console.error("Error cancelling PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchPurchaseOrders]);

  // ============================================
  // UPDATE RECEIVED QUANTITY (for partial/full receipt)
  // ============================================
  const updateReceivedQuantity = useCallback(async (
    itemId: string,
    receivedQty: number
  ): Promise<boolean> => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      if (receivedQty > item.ordered_quantity) {
        throw new Error("Received quantity cannot exceed ordered quantity");
      }

      const unmatchedQty = item.ordered_quantity - receivedQty;
      const unmatchedAmount = Math.round((unmatchedQty / item.ordered_quantity) * item.line_total);

      const { error } = await supabase
        .from("purchase_order_items")
        .update({
          received_quantity: receivedQty,
          unmatched_qty: unmatchedQty,
          unmatched_amount: unmatchedAmount,
        })
        .eq("id", itemId);

      if (error) throw error;

      // Delegate receipt status derivation to server-side RPC
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      await supabase.rpc('update_po_receipt_status' as any, { p_po_id: item.purchase_order_id, p_user_id: userId });

      await fetchPOItems(item.purchase_order_id);
      await fetchPurchaseOrders();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update received quantity";
      console.error("Error updating received quantity:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.items, fetchPOItems, fetchPurchaseOrders]);

  // ============================================
  // SELECT PO
  // ============================================
  const selectPO = useCallback(async (poId: string | null) => {
    if (!poId) {
      setState((prev) => ({ ...prev, selectedPO: null, items: [] }));
      return;
    }

    const po = state.purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setState((prev) => ({ ...prev, selectedPO: po }));
      await fetchPOItems(poId);
    }
  }, [state.purchaseOrders, fetchPOItems]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getPOById = useCallback(
    (id: string): PurchaseOrder | undefined => {
      return state.purchaseOrders.find((p) => p.id === id);
    },
    [state.purchaseOrders]
  );

  const getDraftPOs = useCallback((): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => p.status === "draft");
  }, [state.purchaseOrders]);

  const getActivePOs = useCallback((): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => 
      p.status && ["sent_to_vendor", "acknowledged", "partial_received"].includes(p.status)
    );
  }, [state.purchaseOrders]);

  const getPOsBySupplier = useCallback((supplierId: string): PurchaseOrder[] => {
    return state.purchaseOrders.filter((p) => p.supplier_id === supplierId);
  }, [state.purchaseOrders]);

  const refresh = useCallback(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    purchaseOrders: state.purchaseOrders,
    items: state.items,
    selectedPO: state.selectedPO,
    isLoading: state.isLoading,
    error: state.error,

    // PO Operations
    fetchPurchaseOrders,
    createPurchaseOrder,
    createPOFromIndent,
    updatePurchaseOrder,
    deletePurchaseOrder,
    selectPO,
    getPOWithItems,

    // Item Operations
    fetchPOItems,
    addPOItem,
    addPOItemWithAutoRate, // NEW: Auto-populate rate from supplier_rates
    updatePOItem,
    deletePOItem,
    updateReceivedQuantity,

    // Rate Lookup Operations (NEW)
    getSupplierRateForProduct,
    getSupplierRatesForProducts,

    // Workflow Operations
    sendToVendor,
    acknowledgePO,
    updatePOStatus,
    cancelPO,

    // Helpers
    getPOById,
    getDraftPOs,
    getActivePOs,
    getPOsBySupplier,
    canTransition,
    formatCurrency,

    // Refresh
    refresh,
  };
}

export default usePurchaseOrders;

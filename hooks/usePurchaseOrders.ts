"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { notifySupplierUsers } from "@/src/lib/inventory/notifySupplierUsers";
import {
  calculateLineTotal,
  createPOItemRows,
  fetchPurchaseOrderItemRows,
  fetchPurchaseOrderRows,
  getSupplierRateForProduct as loadSupplierRateForProduct,
  getSupplierRatesForProducts as loadSupplierRatesForProducts,
  PO_RECEIPT_READY_STATUSES,
  type POItem,
  type POStatus,
  type PurchaseOrder,
  type SupplierRateLookupResult,
  type SupplierRatesForProducts,
  toPaiseFromRate,
  canTransition as canTransitionPO,
} from "@/src/lib/purchase-orders/purchaseOrderTransforms";
export type {
  POItem,
  POStatus,
  PurchaseOrder,
  SupplierRateLookupResult,
  SupplierRatesForProducts,
} from "@/src/lib/purchase-orders/purchaseOrderTransforms";
export { PO_RECEIPT_READY_STATUSES } from "@/src/lib/purchase-orders/purchaseOrderTransforms";

// ============================================
// TYPES
// ============================================

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
  acknowledged: ["dispatched", "partial_received", "received"],
  dispatched: ["partial_received", "received"],
  partial_received: ["received"],
  received: [], // Terminal state
  cancelled: [], // Terminal state
};

// Status display configuration
export const PO_STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent_to_vendor: { label: "Sent to Vendor", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-primary/10 text-primary border-primary/20" },
  dispatched: { label: "Dispatched", className: "bg-indigo/10 text-indigo border-indigo/20" },
  partial_received: { label: "Partial Received", className: "bg-warning/10 text-warning border-warning/20" },
  received: { label: "Received", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
import { toRupees, toPaise, formatCurrency } from "@/src/lib/utils/currency";

// ============================================
// SUPPLIER RATE LOOKUP INTERFACES
// ============================================

interface PoTransitionRpcResult {
  success?: boolean;
  error?: string;
}

interface RpcErrorLike {
  message?: string;
  details?: string;
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

async function transitionPurchaseOrderStatus(
  poId: string,
  newStatus: POStatus,
  userId: string | null,
) {
  const { data, error } = await supabase.rpc("transition_po_status", {
    p_po_id: poId,
    p_new_status: newStatus,
    p_user_id: userId,
  });

  if (error) {
    const rpcError = error as RpcErrorLike;
    throw new Error(rpcError.message || rpcError.details || JSON.stringify(error));
  }

  const rpcResult = data as PoTransitionRpcResult | null;
  if (!rpcResult?.success) {
    throw new Error(rpcResult?.error || "Status transition failed");
  }
}

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

      return loadSupplierRateForProduct(supplierId, productId, effectiveDate);
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
      return loadSupplierRatesForProducts(supplierId, productIds, effectiveDate);
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

      const posWithDetails = await fetchPurchaseOrderRows(filters);

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
      const itemsWithDetails = await fetchPurchaseOrderItemRows(poId);

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
      const po = state.purchaseOrders.find((p) => p.id === poId) || null;
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
        const productIds = (indentItems as IndentItemRow[])
          .map((item) => item.product_id)
          .filter((id: string | null) => id !== null);
        
        if (productIds.length > 0) {
          supplierRates = await loadSupplierRatesForProducts(supplierId, productIds);
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
      const poItems = createPOItemRows({
        purchaseOrderId: po.id,
        items: (indentItems as IndentItemRow[]).map((item) => {
          const quantity = item.approved_quantity || item.requested_quantity;
          const rateInfo = item.product_id ? supplierRates[item.product_id] : null;

          let unitPrice = item.estimated_unit_price || 0;
          let taxRate = 0;
          let discountPercent = 0;

          if (rateInfo && rateInfo.found) {
            unitPrice = toPaiseFromRate(rateInfo.rate);
            taxRate = rateInfo.gstPercentage || 0;
            discountPercent = rateInfo.discountPercentage || 0;
          }

          return {
            indent_item_id: item.id,
            product_id: item.product_id,
            item_description: item.item_description,
            specifications: item.specifications,
            ordered_quantity: quantity,
            unit_of_measure: item.unit_of_measure,
            unit_price: unitPrice,
            tax_rate: taxRate,
            discount_percent: discountPercent,
            notes: rateInfo?.found
              ? `${item.notes || ""} [Rate from supplier contract]`.trim()
              : item.notes,
          };
        }),
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
      }, [fetchPurchaseOrders, loadSupplierRatesForProducts]);

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
      const rateInfo = await loadSupplierRateForProduct(supplierId, productId);
      
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
  }, [fetchPOItems, fetchPurchaseOrders, loadSupplierRateForProduct]);

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
      const userId = user?.id ?? null;

      await transitionPurchaseOrderStatus(poId, "sent_to_vendor", userId);

      try {
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('supplier_id, po_number')
          .eq('id', poId)
          .single();

        if (poData?.supplier_id) {
          await notifySupplierUsers({
            supplierId: poData.supplier_id,
            title: 'New Purchase Order Issued',
            body: `Purchase Order ${poData.po_number || poId} has been issued to you. Please review and acknowledge.`,
            notificationType: 'po_issued',
            referenceId: poId,
            referenceType: 'purchase_order',
          });
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

      await transitionPurchaseOrderStatus(poId, "acknowledged", userId ?? null);

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

      await transitionPurchaseOrderStatus(poId, newStatus, userId ?? null);

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

      await transitionPurchaseOrderStatus(poId, "cancelled", userId ?? null);

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
      await supabase.rpc("update_po_receipt_status", {
        p_po_id: item.purchase_order_id,
        p_user_id: userId ?? null,
      });

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
      p.status && ["sent_to_vendor", ...PO_RECEIPT_READY_STATUSES].includes(p.status)
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
    canTransition: canTransitionPO,
    formatCurrency,

    // Refresh
    refresh,
  };
}

export default usePurchaseOrders;

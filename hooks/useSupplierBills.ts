"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type BillStatus = "draft" | "submitted" | "approved" | "disputed";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface SupplierBill {
  id: string;
  bill_number: string;
  supplier_invoice_number: string | null;
  purchase_order_id: string | null;
  material_receipt_id: string | null;
  supplier_id: string | null;
  bill_date: string;
  due_date: string | null;
  status: BillStatus;
  payment_status: PaymentStatus;
  subtotal: number; // In paise
  tax_amount: number; // In paise
  discount_amount: number; // In paise
  total_amount: number; // In paise
  paid_amount: number; // In paise
  due_amount: number; // In paise
  last_payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
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
  unit_price: number; // In paise
  tax_rate: number;
  tax_amount: number; // In paise
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

export interface CreateBillInput {
  supplier_invoice_number?: string;
  purchase_order_id?: string;
  material_receipt_id?: string;
  supplier_id: string;
  bill_date?: string;
  due_date?: string;
  subtotal?: number; // In paise
  tax_amount?: number; // In paise
  discount_amount?: number; // In paise
  total_amount?: number; // In paise
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
  unit_price: number; // In paise
  tax_rate?: number;
  tax_amount?: number; // In paise
  discount_amount?: number; // In paise
  notes?: string;
}

export interface PaymentInput {
  amount: number; // In paise
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
}

interface UseSupplierBillsState {
  bills: SupplierBill[];
  items: BillItem[];
  selectedBill: SupplierBill | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules for bill lifecycle
const STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  draft: ["submitted", "disputed"],
  submitted: ["approved", "disputed"],
  approved: ["disputed"],
  disputed: ["draft", "submitted"],
};

// Status display configuration
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

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (currentStatus: BillStatus, targetStatus: BillStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

// Convert paise to rupees for display
export const toRupees = (paise: number): number => paise / 100;

// Convert rupees to paise for storage
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

// Format currency
export const formatCurrency = (paiseAmount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(toRupees(paiseAmount));
};

// Calculate line total including tax and discount
export const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  taxRate: number = 0,
  discountAmount: number = 0
): { taxAmount: number; lineTotal: number } => {
  const subtotal = quantity * unitPrice;
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const lineTotal = subtotal + taxAmount - discountAmount;
  return { taxAmount, lineTotal };
};

// ============================================
// HOOK
// ============================================

export function useSupplierBills(filters?: {
  status?: BillStatus;
  paymentStatus?: PaymentStatus;
  supplierId?: string;
  poId?: string;
  grnId?: string;
}) {
  const [state, setState] = useState<UseSupplierBillsState>({
    bills: [],
    items: [],
    selectedBill: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH SUPPLIER BILLS
  // ============================================
  const fetchSupplierBills = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("purchase_bills")
        .select(`
          *,
          suppliers!supplier_id (
            supplier_name,
            supplier_code
          ),
          purchase_orders!purchase_order_id (
            po_number
          ),
          material_receipts!material_receipt_id (
            grn_number
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.paymentStatus) {
        query = query.eq("payment_status", filters.paymentStatus);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters?.poId) {
        query = query.eq("purchase_order_id", filters.poId);
      }
      if (filters?.grnId) {
        query = query.eq("material_receipt_id", filters.grnId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const billsWithDetails: SupplierBill[] = (data || []).map((bill: any) => ({
        ...bill,
        supplier_name: bill.suppliers?.supplier_name || "Unknown",
        supplier_code: bill.suppliers?.supplier_code || "N/A",
        po_number: bill.purchase_orders?.po_number || null,
        grn_number: bill.material_receipts?.grn_number || null,
      }));

      setState((prev) => ({
        ...prev,
        bills: billsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch supplier bills";
      console.error("Error fetching supplier bills:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.paymentStatus, filters?.supplierId, filters?.poId, filters?.grnId]);

  // ============================================
  // FETCH BILL ITEMS
  // ============================================
  const fetchBillItems = useCallback(async (billId: string): Promise<BillItem[]> => {
    try {
      const { data, error } = await supabase
        .from("purchase_bill_items")
        .select(`
          *,
          products!product_id (
            product_name,
            product_code
          )
        `)
        .eq("purchase_bill_id", billId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const itemsWithDetails: BillItem[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || null,
        product_code: item.products?.product_code || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching bill items:", err);
      return [];
    }
  }, []);

  // ============================================
  // CREATE BILL
  // ============================================
  const createBill = useCallback(async (input: CreateBillInput): Promise<SupplierBill | null> => {
    try {
      const totalAmount = input.total_amount ?? 
        ((input.subtotal ?? 0) + (input.tax_amount ?? 0) - (input.discount_amount ?? 0));

      const { data, error } = await supabase
        .from("purchase_bills")
        .insert({
          supplier_invoice_number: input.supplier_invoice_number,
          purchase_order_id: input.purchase_order_id,
          material_receipt_id: input.material_receipt_id,
          supplier_id: input.supplier_id,
          bill_date: input.bill_date || new Date().toISOString().split("T")[0],
          due_date: input.due_date,
          status: "draft",
          payment_status: "unpaid",
          subtotal: input.subtotal ?? 0,
          tax_amount: input.tax_amount ?? 0,
          discount_amount: input.discount_amount ?? 0,
          total_amount: totalAmount,
          paid_amount: 0,
          due_amount: totalAmount,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSupplierBills();
      return data as SupplierBill;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create bill";
      console.error("Error creating bill:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchSupplierBills]);

  // ============================================
  // CREATE BILL FROM GRN
  // ============================================
  const createBillFromGRN = useCallback(async (
    grnId: string,
    options?: {
      supplier_invoice_number?: string;
      bill_date?: string;
      due_date?: string;
      notes?: string;
    }
  ): Promise<SupplierBill | null> => {
    try {
      // Fetch GRN details
      const { data: grn, error: grnError } = await supabase
        .from("material_receipts")
        .select("*")
        .eq("id", grnId)
        .single();

      if (grnError) throw grnError;

      if (!["accepted", "partial_accepted"].includes(grn.status)) {
        throw new Error("GRN must be accepted before creating bill");
      }

      // Fetch GRN items
      const { data: grnItems, error: itemsError } = await supabase
        .from("material_receipt_items")
        .select("*")
        .eq("material_receipt_id", grnId);

      if (itemsError) throw itemsError;

      if (!grnItems || grnItems.length === 0) {
        throw new Error("GRN has no items");
      }

      // Calculate totals from GRN items
      let subtotal = 0;
      for (const item of grnItems) {
        subtotal += item.line_total || 0;
      }

      // Create Bill
      const { data: bill, error: billError } = await supabase
        .from("purchase_bills")
        .insert({
          supplier_invoice_number: options?.supplier_invoice_number,
          purchase_order_id: grn.purchase_order_id,
          material_receipt_id: grnId,
          supplier_id: grn.supplier_id,
          bill_date: options?.bill_date || new Date().toISOString().split("T")[0],
          due_date: options?.due_date,
          status: "draft",
          payment_status: "unpaid",
          subtotal: subtotal,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: subtotal,
          paid_amount: 0,
          due_amount: subtotal,
          notes: options?.notes || `Bill for GRN ${grn.grn_number}`,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create Bill items from GRN items
      const billItems = grnItems.map((item: any) => ({
        purchase_bill_id: bill.id,
        po_item_id: item.po_item_id,
        grn_item_id: item.id,
        product_id: item.product_id,
        item_description: item.item_description,
        billed_quantity: item.accepted_quantity || item.received_quantity,
        unit_of_measure: "pcs",
        unit_price: item.unit_price || 0,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        line_total: item.line_total || 0,
        unmatched_qty: item.accepted_quantity || item.received_quantity,
        unmatched_amount: item.line_total || 0,
        notes: item.notes,
      }));

      const { error: billItemsError } = await supabase
        .from("purchase_bill_items")
        .insert(billItems);

      if (billItemsError) throw billItemsError;

      await fetchSupplierBills();
      return bill as SupplierBill;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create bill from GRN";
      console.error("Error creating bill from GRN:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchSupplierBills]);

  // ============================================
  // CREATE BILL FROM PO
  // ============================================
  const createBillFromPO = useCallback(async (
    poId: string,
    options?: {
      supplier_invoice_number?: string;
      bill_date?: string;
      due_date?: string;
      notes?: string;
    }
  ): Promise<SupplierBill | null> => {
    try {
      // Fetch PO details
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      // PO should be at least acknowledged
      if (!["acknowledged", "partial_received", "received"].includes(po.status)) {
        throw new Error("PO must be acknowledged before creating bill");
      }

      // Fetch PO items
      const { data: poItems, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", poId);

      if (itemsError) throw itemsError;

      if (!poItems || poItems.length === 0) {
        throw new Error("PO has no items");
      }

      // Calculate totals from PO
      const subtotal = po.subtotal || 0;
      const taxAmount = po.tax_amount || 0;
      const discountAmount = po.discount_amount || 0;
      const totalAmount = po.grand_total || (subtotal + taxAmount - discountAmount);

      // Create Bill
      const { data: bill, error: billError } = await supabase
        .from("purchase_bills")
        .insert({
          supplier_invoice_number: options?.supplier_invoice_number,
          purchase_order_id: poId,
          material_receipt_id: null,
          supplier_id: po.supplier_id,
          bill_date: options?.bill_date || new Date().toISOString().split("T")[0],
          due_date: options?.due_date,
          status: "draft",
          payment_status: "unpaid",
          subtotal: subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          paid_amount: 0,
          due_amount: totalAmount,
          notes: options?.notes || `Bill for PO ${po.po_number}`,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create Bill items from PO items
      const billItems = poItems.map((item: any) => {
        const lineSubtotal = item.ordered_quantity * item.unit_price;
        const taxAmount = Math.round(lineSubtotal * ((item.tax_rate || 0) / 100));
        const lineTotal = lineSubtotal + taxAmount - (item.discount_amount || 0);

        return {
          purchase_bill_id: bill.id,
          po_item_id: item.id,
          grn_item_id: null,
          product_id: item.product_id,
          item_description: item.item_description,
          billed_quantity: item.ordered_quantity,
          unit_of_measure: item.unit_of_measure || "pcs",
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          tax_amount: taxAmount,
          discount_amount: item.discount_amount || 0,
          line_total: lineTotal,
          unmatched_qty: item.ordered_quantity,
          unmatched_amount: lineTotal,
          notes: item.notes,
        };
      });

      const { error: billItemsError } = await supabase
        .from("purchase_bill_items")
        .insert(billItems);

      if (billItemsError) throw billItemsError;

      await fetchSupplierBills();
      return bill as SupplierBill;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create bill from PO";
      console.error("Error creating bill from PO:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchSupplierBills]);

  // ============================================
  // UPDATE BILL
  // ============================================
  const updateBill = useCallback(async (
    billId: string,
    updates: Partial<Omit<CreateBillInput, "supplier_id">>
  ): Promise<SupplierBill | null> => {
    try {
      const bill = state.bills.find((b) => b.id === billId);
      if (bill && bill.status !== "draft") {
        throw new Error("Only draft bills can be edited");
      }

      // Recalculate total if amounts changed
      const updateData: any = { ...updates };
      if (
        updates.subtotal !== undefined ||
        updates.tax_amount !== undefined ||
        updates.discount_amount !== undefined
      ) {
        const subtotal = updates.subtotal ?? bill?.subtotal ?? 0;
        const taxAmount = updates.tax_amount ?? bill?.tax_amount ?? 0;
        const discountAmount = updates.discount_amount ?? bill?.discount_amount ?? 0;
        updateData.total_amount = subtotal + taxAmount - discountAmount;
        updateData.due_amount = updateData.total_amount - (bill?.paid_amount ?? 0);
      }

      const { data, error } = await supabase
        .from("purchase_bills")
        .update(updateData)
        .eq("id", billId)
        .select()
        .single();

      if (error) throw error;

      await fetchSupplierBills();
      return data as SupplierBill;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update bill";
      console.error("Error updating bill:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.bills, fetchSupplierBills]);

  // ============================================
  // DELETE BILL
  // ============================================
  const deleteBill = useCallback(async (billId: string): Promise<boolean> => {
    try {
      const bill = state.bills.find((b) => b.id === billId);
      if (bill && bill.status !== "draft") {
        throw new Error("Only draft bills can be deleted");
      }

      const { error } = await supabase
        .from("purchase_bills")
        .delete()
        .eq("id", billId);

      if (error) throw error;

      await fetchSupplierBills();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete bill";
      console.error("Error deleting bill:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.bills, fetchSupplierBills]);

  // ============================================
  // ADD BILL ITEM
  // ============================================
  const addBillItem = useCallback(async (input: CreateBillItemInput): Promise<BillItem | null> => {
    try {
      const { taxAmount, lineTotal } = calculateLineTotal(
        input.billed_quantity,
        input.unit_price,
        input.tax_rate,
        input.discount_amount
      );

      const { data, error } = await supabase
        .from("purchase_bill_items")
        .insert({
          purchase_bill_id: input.purchase_bill_id,
          po_item_id: input.po_item_id,
          grn_item_id: input.grn_item_id,
          product_id: input.product_id,
          item_description: input.item_description,
          billed_quantity: input.billed_quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          unit_price: input.unit_price,
          tax_rate: input.tax_rate || 0,
          tax_amount: input.tax_amount ?? taxAmount,
          discount_amount: input.discount_amount || 0,
          line_total: lineTotal,
          unmatched_qty: input.billed_quantity,
          unmatched_amount: lineTotal,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate bill totals
      await recalculateBillTotals(input.purchase_bill_id);
      await fetchBillItems(input.purchase_bill_id);
      await fetchSupplierBills();

      return data as BillItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add bill item";
      console.error("Error adding bill item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchBillItems, fetchSupplierBills]);

  // ============================================
  // UPDATE BILL ITEM
  // ============================================
  const updateBillItem = useCallback(async (
    itemId: string,
    updates: Partial<CreateBillItemInput>
  ): Promise<BillItem | null> => {
    try {
      // Get current item to recalculate if needed
      const currentItem = state.items.find((i) => i.id === itemId);
      if (!currentItem) throw new Error("Item not found");

      const quantity = updates.billed_quantity ?? currentItem.billed_quantity;
      const unitPrice = updates.unit_price ?? currentItem.unit_price;
      const taxRate = updates.tax_rate ?? currentItem.tax_rate;
      const discountAmount = updates.discount_amount ?? currentItem.discount_amount;

      const { taxAmount, lineTotal } = calculateLineTotal(quantity, unitPrice, taxRate, discountAmount);

      const { data, error } = await supabase
        .from("purchase_bill_items")
        .update({
          ...updates,
          tax_amount: updates.tax_amount ?? taxAmount,
          line_total: lineTotal,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      // Recalculate bill totals
      await recalculateBillTotals(currentItem.purchase_bill_id);
      await fetchBillItems(currentItem.purchase_bill_id);
      await fetchSupplierBills();

      return data as BillItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update bill item";
      console.error("Error updating bill item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.items, fetchBillItems, fetchSupplierBills]);

  // ============================================
  // DELETE BILL ITEM
  // ============================================
  const deleteBillItem = useCallback(async (itemId: string, billId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("purchase_bill_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      // Recalculate bill totals
      await recalculateBillTotals(billId);
      await fetchBillItems(billId);
      await fetchSupplierBills();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete bill item";
      console.error("Error deleting bill item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchBillItems, fetchSupplierBills]);

  // ============================================
  // RECALCULATE BILL TOTALS
  // ============================================
  const recalculateBillTotals = useCallback(async (billId: string): Promise<void> => {
    try {
      const { data: items } = await supabase
        .from("purchase_bill_items")
        .select("line_total, tax_amount, discount_amount, unit_price, billed_quantity")
        .eq("purchase_bill_id", billId);

      if (!items) return;

      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      for (const item of items) {
        const itemSubtotal = item.unit_price * item.billed_quantity;
        subtotal += itemSubtotal;
        totalTax += item.tax_amount || 0;
        totalDiscount += item.discount_amount || 0;
      }

      const totalAmount = subtotal + totalTax - totalDiscount;

      // Get current paid amount to calculate due
      const { data: bill } = await supabase
        .from("purchase_bills")
        .select("paid_amount")
        .eq("id", billId)
        .single();

      const paidAmount = bill?.paid_amount || 0;
      const dueAmount = totalAmount - paidAmount;

      await supabase
        .from("purchase_bills")
        .update({
          subtotal,
          tax_amount: totalTax,
          discount_amount: totalDiscount,
          total_amount: totalAmount,
          due_amount: dueAmount,
        })
        .eq("id", billId);
    } catch (err) {
      console.error("Error recalculating bill totals:", err);
    }
  }, []);

  // ============================================
  // UPDATE BILL STATUS
  // ============================================
  const updateBillStatus = useCallback(async (
    billId: string,
    newStatus: BillStatus
  ): Promise<boolean> => {
    try {
      const bill = state.bills.find((b) => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      if (!canTransition(bill.status, newStatus)) {
        throw new Error(`Cannot transition from ${bill.status} to ${newStatus}`);
      }

      const { error } = await supabase
        .from("purchase_bills")
        .update({ status: newStatus })
        .eq("id", billId);

      if (error) throw error;

      await fetchSupplierBills();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update bill status";
      console.error("Error updating bill status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.bills, fetchSupplierBills]);

  // ============================================
  // SUBMIT BILL FOR APPROVAL
  // ============================================
  const submitBill = useCallback(async (billId: string): Promise<boolean> => {
    return updateBillStatus(billId, "submitted");
  }, [updateBillStatus]);

  // ============================================
  // APPROVE BILL
  // ============================================
  const approveBill = useCallback(async (billId: string): Promise<boolean> => {
    return updateBillStatus(billId, "approved");
  }, [updateBillStatus]);

  // ============================================
  // DISPUTE BILL
  // ============================================
  const disputeBill = useCallback(async (billId: string, reason?: string): Promise<boolean> => {
    try {
      const bill = state.bills.find((b) => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      if (!canTransition(bill.status, "disputed")) {
        throw new Error(`Cannot dispute bill in ${bill.status} status`);
      }

      const updates: any = { status: "disputed" };
      if (reason) {
        updates.notes = bill.notes ? `${bill.notes}\n\nDispute: ${reason}` : `Dispute: ${reason}`;
      }

      const { error } = await supabase
        .from("purchase_bills")
        .update(updates)
        .eq("id", billId);

      if (error) throw error;

      await fetchSupplierBills();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to dispute bill";
      console.error("Error disputing bill:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.bills, fetchSupplierBills]);

  // ============================================
  // RECORD PAYMENT
  // ============================================
  const recordPayment = useCallback(async (
    billId: string,
    payment: PaymentInput
  ): Promise<boolean> => {
    try {
      const bill = state.bills.find((b) => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      // Bill must be approved to record payment
      if (bill.status !== "approved") {
        throw new Error("Bill must be approved before recording payment");
      }

      if (payment.amount <= 0) {
        throw new Error("Payment amount must be positive");
      }

      const newPaidAmount = bill.paid_amount + payment.amount;
      
      if (newPaidAmount > bill.total_amount) {
        throw new Error("Payment amount exceeds due amount");
      }

      // Determine new payment status
      let newPaymentStatus: PaymentStatus;
      if (newPaidAmount >= bill.total_amount) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      } else {
        newPaymentStatus = "unpaid";
      }

      const newDueAmount = bill.total_amount - newPaidAmount;

      // Add payment note
      const paymentNote = `Payment of ${formatCurrency(payment.amount)} recorded on ${
        payment.payment_date || new Date().toISOString().split("T")[0]
      }${payment.payment_reference ? ` (Ref: ${payment.payment_reference})` : ""}`;
      
      const updatedNotes = bill.notes 
        ? `${bill.notes}\n\n${paymentNote}` 
        : paymentNote;

      const { error } = await supabase
        .from("purchase_bills")
        .update({
          paid_amount: newPaidAmount,
          due_amount: newDueAmount,
          payment_status: newPaymentStatus,
          last_payment_date: payment.payment_date || new Date().toISOString().split("T")[0],
          notes: updatedNotes,
        })
        .eq("id", billId);

      if (error) throw error;

      await fetchSupplierBills();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record payment";
      console.error("Error recording payment:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.bills, fetchSupplierBills]);

  // ============================================
  // GET BILLS BY STATUS
  // ============================================
  const getBillsByStatus = useCallback((status: BillStatus): SupplierBill[] => {
    return state.bills.filter((b) => b.status === status);
  }, [state.bills]);

  // ============================================
  // GET BILLS BY PAYMENT STATUS
  // ============================================
  const getBillsByPaymentStatus = useCallback((paymentStatus: PaymentStatus): SupplierBill[] => {
    return state.bills.filter((b) => b.payment_status === paymentStatus);
  }, [state.bills]);

  // ============================================
  // GET OVERDUE BILLS
  // ============================================
  const getOverdueBills = useCallback((): SupplierBill[] => {
    const today = new Date().toISOString().split("T")[0];
    return state.bills.filter(
      (b) => b.due_date && b.due_date < today && b.payment_status !== "paid"
    );
  }, [state.bills]);

  // ============================================
  // GET BILL STATISTICS
  // ============================================
  const getBillStatistics = useCallback(() => {
    const bills = state.bills;
    
    return {
      totalBills: bills.length,
      draftBills: bills.filter((b) => b.status === "draft").length,
      pendingApproval: bills.filter((b) => b.status === "submitted").length,
      approvedBills: bills.filter((b) => b.status === "approved").length,
      disputedBills: bills.filter((b) => b.status === "disputed").length,
      unpaidBills: bills.filter((b) => b.payment_status === "unpaid").length,
      partiallyPaid: bills.filter((b) => b.payment_status === "partial").length,
      fullyPaid: bills.filter((b) => b.payment_status === "paid").length,
      totalAmount: bills.reduce((sum, b) => sum + b.total_amount, 0),
      totalPaid: bills.reduce((sum, b) => sum + b.paid_amount, 0),
      totalDue: bills.reduce((sum, b) => sum + b.due_amount, 0),
      overdueBills: getOverdueBills().length,
      overdueAmount: getOverdueBills().reduce((sum, b) => sum + b.due_amount, 0),
    };
  }, [state.bills, getOverdueBills]);

  // ============================================
  // SELECT BILL
  // ============================================
  const selectBill = useCallback((bill: SupplierBill | null) => {
    setState((prev) => ({ ...prev, selectedBill: bill }));
    if (bill) {
      fetchBillItems(bill.id);
    }
  }, [fetchBillItems]);

  // ============================================
  // CLEAR ERROR
  // ============================================
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // INITIAL FETCH
  // ============================================
  useEffect(() => {
    fetchSupplierBills();
  }, [fetchSupplierBills]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    bills: state.bills,
    items: state.items,
    selectedBill: state.selectedBill,
    isLoading: state.isLoading,
    error: state.error,

    // Fetch functions
    fetchSupplierBills,
    fetchBillItems,

    // CRUD - Bills
    createBill,
    createBillFromGRN,
    createBillFromPO,
    updateBill,
    deleteBill,

    // CRUD - Items
    addBillItem,
    updateBillItem,
    deleteBillItem,

    // Workflow
    submitBill,
    approveBill,
    disputeBill,
    updateBillStatus,

    // Payments
    recordPayment,

    // Queries
    getBillsByStatus,
    getBillsByPaymentStatus,
    getOverdueBills,
    getBillStatistics,

    // Utilities
    selectBill,
    clearError,
    recalculateBillTotals,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

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
  subtotal: number; // In paise
  tax_amount: number; // In paise
  discount_amount: number; // In paise
  total_amount: number; // In paise
  paid_amount: number; // In paise
  due_amount: number; // In paise
  last_payment_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
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
  unit_price: number; // In paise
  tax_rate: number;
  tax_amount: number; // In paise
  discount_amount: number; // In paise
  line_total: number; // In paise
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
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
  subtotal?: number; // In paise
  tax_amount?: number; // In paise
  discount_amount?: number; // In paise
  total_amount?: number; // In paise
  notes?: string;
}

export interface CreateInvoiceItemInput {
  sale_bill_id: string;
  service_id?: string;
  product_id?: string;
  item_description?: string;
  quantity: number;
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
  payment_method?: string;
  notes?: string;
}

interface UseBuyerInvoicesState {
  invoices: BuyerInvoice[];
  items: InvoiceItem[];
  selectedInvoice: BuyerInvoice | null;
  isLoading: boolean;
  error: string | null;
}

// Status transition rules for invoice lifecycle
const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "disputed"],
  sent: ["acknowledged", "disputed"],
  acknowledged: ["disputed"],
  cancelled: [],
  submitted: ["approved", "disputed"],
  approved: ["disputed"],
  disputed: ["draft", "sent"],
};

// Status display configuration
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

// ============================================
// HELPER FUNCTIONS
// ============================================

const canTransition = (currentStatus: InvoiceStatus, targetStatus: InvoiceStatus): boolean => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

import { useAuth } from "@/hooks/useAuth";
import { toRupees, toPaise, formatCurrency } from "@/src/lib/utils/currency";
export { formatCurrency };

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

export function useBuyerInvoices(filters?: {
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  clientId?: string;
  contractId?: string;
}) {
  const { userId, role } = useAuth();
  const [state, setState] = useState<UseBuyerInvoicesState>({
    invoices: [],
    items: [],
    selectedInvoice: null,
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH BUYER INVOICES
  // ============================================
  const fetchInvoices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (role === "buyer" && !userId) {
        setState((prev) => ({ ...prev, invoices: [], isLoading: false }));
        return;
      }

      let query = supabase
        .from("sale_bills")
        .select(`
          *,
          societies!client_id (
            society_name,
            society_code
          ),
          contracts!contract_id (
            contract_number
          ),
          requests!request_id (
            id,
            buyer_id,
            request_number,
            title
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
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.contractId) {
        query = query.eq("contract_id", filters.contractId);
      }

      const { data: billRows, error } = await query;

      if (error) throw error;

      const scopedBills = ((billRows || []) as any[]).filter((bill) => {
        if (role !== "buyer") return true;
        return bill.requests?.buyer_id === userId;
      });

      const requestIds = Array.from(
        new Set(
          scopedBills
            .map((bill: any) => bill.request_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let feedbackRequestIds = new Set<string>();
      if (requestIds.length > 0) {
        const { data: feedbackRows, error: feedbackError } = await supabase
          .from("buyer_feedback")
          .select("request_id")
          .in("request_id", requestIds);

        if (feedbackError) throw feedbackError;
        feedbackRequestIds = new Set(
          (feedbackRows || [])
            .map((row: { request_id?: string | null }) => row.request_id || null)
            .filter((value): value is string => Boolean(value))
        );
      }

      const invoicesWithDetails: BuyerInvoice[] = scopedBills.map((bill: any) => ({
        ...bill,
        sale_bill_id: bill.id,
        invoice_number:
          bill.invoice_number ||
          `INV-${String(bill.id).slice(0, 8).toUpperCase()}`,
        client_name: bill.societies?.society_name || bill.requests?.title || "Unknown",
        client_code: bill.societies?.society_code || bill.requests?.request_number || "N/A",
        contract_number: bill.contracts?.contract_number || null,
        supplier_name: null,
        feedback_submitted: bill.request_id ? feedbackRequestIds.has(bill.request_id) : null,
        total_items: null,
      }));

      setState((prev) => ({
        ...prev,
        invoices: invoicesWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch invoices";
      console.error("Error fetching invoices:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.paymentStatus, filters?.clientId, filters?.contractId, role, userId]);

  // ============================================
  // FETCH INVOICE ITEMS
  // ============================================
  const fetchInvoiceItems = useCallback(async (invoiceId: string): Promise<InvoiceItem[]> => {
    try {
      const { data, error } = await supabase
        .from("sale_bill_items")
        .select(`
          *,
          products!product_id (
            product_name
          )
        `)
        .eq("sale_bill_id", invoiceId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const itemsWithDetails: InvoiceItem[] = (data || []).map((item: any) => ({
        ...item,
        sale_bill_id: item.sale_bill_id,
        product_name: item.products?.product_name || null,
      }));

      setState((prev) => ({ ...prev, items: itemsWithDetails }));
      return itemsWithDetails;
    } catch (err: unknown) {
      console.error("Error fetching invoice items:", err);
      return [];
    }
  }, []);

  // ============================================
  // CREATE INVOICE
  // ============================================
  const createInvoice = useCallback(async (input: CreateInvoiceInput): Promise<BuyerInvoice | null> => {
    try {
      const totalAmount = input.total_amount ?? 
        ((input.subtotal ?? 0) + (input.tax_amount ?? 0) - (input.discount_amount ?? 0));

      const { data, error } = await supabase
        .from("sale_bills")
        .insert({
          client_id: input.client_id,
          contract_id: input.contract_id,
          invoice_date: input.invoice_date || new Date().toISOString().split("T")[0],
          due_date: input.due_date,
          billing_period_start: input.billing_period_start,
          billing_period_end: input.billing_period_end,
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

      await fetchInvoices();
      return data as BuyerInvoice;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create invoice";
      console.error("Error creating invoice:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchInvoices]);

  // ============================================
  // CREATE INVOICE FROM CONTRACT
  // ============================================
  const createInvoiceFromContract = useCallback(async (
    contractId: string,
    options?: {
      invoice_date?: string;
      due_date?: string;
      billing_period_start?: string;
      billing_period_end?: string;
      notes?: string;
    }
  ): Promise<BuyerInvoice | null> => {
    try {
      // Fetch Contract details
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", contractId)
        .single();

      if (contractError) throw contractError;

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Calculate default billing period (current month)
      const now = new Date();
      const periodStart = options?.billing_period_start || 
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const periodEnd = options?.billing_period_end || 
        new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      // Use contract value as invoice amount
      const totalAmount = contract.contract_value || 0;

      // Create Invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("sale_bills")
        .insert({
          client_id: contract.society_id,
          contract_id: contractId,
          invoice_date: options?.invoice_date || new Date().toISOString().split("T")[0],
          due_date: options?.due_date,
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          status: "draft",
          payment_status: "unpaid",
          subtotal: totalAmount,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: totalAmount,
          paid_amount: 0,
          due_amount: totalAmount,
          notes: options?.notes || `Invoice for Contract ${contract.contract_number}`,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      await fetchInvoices();
      return invoice as BuyerInvoice;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create invoice from contract";
      console.error("Error creating invoice from contract:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchInvoices]);

  // ============================================
  // UPDATE INVOICE
  // ============================================
  const updateInvoice = useCallback(async (
    invoiceId: string,
    updates: Partial<Omit<CreateInvoiceInput, "client_id">>
  ): Promise<BuyerInvoice | null> => {
    try {
      const invoice = state.invoices.find((i) => i.id === invoiceId);
      if (invoice && invoice.status !== "draft") {
        throw new Error("Only draft invoices can be edited");
      }

      // Recalculate total if amounts changed
      const updateData: any = { ...updates };
      if (
        updates.subtotal !== undefined ||
        updates.tax_amount !== undefined ||
        updates.discount_amount !== undefined
      ) {
        const subtotal = updates.subtotal ?? invoice?.subtotal ?? 0;
        const taxAmount = updates.tax_amount ?? invoice?.tax_amount ?? 0;
        const discountAmount = updates.discount_amount ?? invoice?.discount_amount ?? 0;
        updateData.total_amount = subtotal + taxAmount - discountAmount;
        updateData.due_amount = updateData.total_amount - (invoice?.paid_amount ?? 0);
      }

      const { data, error } = await supabase
        .from("sale_bills")
        .update(updateData)
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;

      await fetchInvoices();
      return data as BuyerInvoice;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update invoice";
      console.error("Error updating invoice:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.invoices, fetchInvoices]);

  // ============================================
  // DELETE INVOICE
  // ============================================
  const deleteInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    try {
      const invoice = state.invoices.find((i) => i.id === invoiceId);
      if (invoice && invoice.status !== "draft") {
        throw new Error("Only draft invoices can be deleted");
      }

      const { error } = await supabase
        .from("sale_bills")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete invoice";
      console.error("Error deleting invoice:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.invoices, fetchInvoices]);

  // ============================================
  // ADD INVOICE ITEM
  // ============================================
  const addInvoiceItem = useCallback(async (input: CreateInvoiceItemInput): Promise<InvoiceItem | null> => {
    try {
      const { taxAmount, lineTotal } = calculateLineTotal(
        input.quantity,
        input.unit_price,
        input.tax_rate,
        input.discount_amount
      );

      const { data, error } = await supabase
        .from("sale_bill_items")
        .insert({
          sale_bill_id: input.sale_bill_id,
          service_id: input.service_id,
          product_id: input.product_id,
          item_description: input.item_description,
          quantity: input.quantity,
          unit_of_measure: input.unit_of_measure || "pcs",
          unit_price: input.unit_price,
          tax_rate: input.tax_rate || 0,
          tax_amount: input.tax_amount ?? taxAmount,
          discount_amount: input.discount_amount || 0,
          line_total: lineTotal,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(input.sale_bill_id);
      await fetchInvoiceItems(input.sale_bill_id);
      await fetchInvoices();

      return data as InvoiceItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add invoice item";
      console.error("Error adding invoice item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchInvoiceItems, fetchInvoices]);

  // ============================================
  // UPDATE INVOICE ITEM
  // ============================================
  const updateInvoiceItem = useCallback(async (
    itemId: string,
    updates: Partial<CreateInvoiceItemInput>
  ): Promise<InvoiceItem | null> => {
    try {
      // Get current item to recalculate if needed
      const currentItem = state.items.find((i) => i.id === itemId);
      if (!currentItem) throw new Error("Item not found");

      const quantity = updates.quantity ?? currentItem.quantity;
      const unitPrice = updates.unit_price ?? currentItem.unit_price;
      const taxRate = updates.tax_rate ?? currentItem.tax_rate;
      const discountAmount = updates.discount_amount ?? currentItem.discount_amount;

      const { taxAmount, lineTotal } = calculateLineTotal(quantity, unitPrice, taxRate, discountAmount);

      const { data, error } = await supabase
        .from("sale_bill_items")
        .update({
          ...updates,
          tax_amount: updates.tax_amount ?? taxAmount,
          line_total: lineTotal,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(currentItem.sale_bill_id);
      await fetchInvoiceItems(currentItem.sale_bill_id);
      await fetchInvoices();

      return data as InvoiceItem;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update invoice item";
      console.error("Error updating invoice item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.items, fetchInvoiceItems, fetchInvoices]);

  // ============================================
  // DELETE INVOICE ITEM
  // ============================================
  const deleteInvoiceItem = useCallback(async (itemId: string, invoiceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("sale_bill_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(invoiceId);
      await fetchInvoiceItems(invoiceId);
      await fetchInvoices();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete invoice item";
      console.error("Error deleting invoice item:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [fetchInvoiceItems, fetchInvoices]);

  // ============================================
  // RECALCULATE INVOICE TOTALS
  // ============================================
  const recalculateInvoiceTotals = useCallback(async (invoiceId: string): Promise<void> => {
    try {
      const { data: items } = await supabase
        .from("sale_bill_items")
        .select("line_total, tax_amount, discount_amount, unit_price, quantity")
        .eq("sale_bill_id", invoiceId);

      if (!items) return;

      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      for (const item of items) {
        const itemSubtotal = (item.unit_price || 0) * (item.quantity || 0);
        subtotal += itemSubtotal;
        totalTax += item.tax_amount || 0;
        totalDiscount += item.discount_amount || 0;
      }

      const totalAmount = subtotal + totalTax - totalDiscount;

      // Get current paid amount to calculate due
      const { data: invoice } = await supabase
        .from("sale_bills")
        .select("paid_amount")
        .eq("id", invoiceId)
        .single();

      const paidAmount = invoice?.paid_amount || 0;
      const dueAmount = totalAmount - paidAmount;

      await supabase
        .from("sale_bills")
        .update({
          subtotal,
          tax_amount: totalTax,
          discount_amount: totalDiscount,
          total_amount: totalAmount,
          due_amount: dueAmount,
        })
        .eq("id", invoiceId);
    } catch (err) {
      console.error("Error recalculating invoice totals:", err);
    }
  }, []);

  // ============================================
  // UPDATE INVOICE STATUS
  // ============================================
  const updateInvoiceStatus = useCallback(async (
    invoiceId: string,
    newStatus: InvoiceStatus
  ): Promise<boolean> => {
    try {
      const invoice = state.invoices.find((i) => i.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      if (!canTransition(invoice.status, newStatus)) {
        throw new Error(`Cannot transition from ${invoice.status} to ${newStatus}`);
      }

      const { error } = await supabase
        .from("sale_bills")
        .update({ status: newStatus })
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update invoice status";
      console.error("Error updating invoice status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.invoices, fetchInvoices]);

  // ============================================
  // SEND INVOICE TO CLIENT
  // ============================================
  const sendInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    return updateInvoiceStatus(invoiceId, "sent");
  }, [updateInvoiceStatus]);

  // ============================================
  // ACKNOWLEDGE INVOICE
  // ============================================
  const acknowledgeInvoice = useCallback(async (invoiceId: string): Promise<boolean> => {
    return updateInvoiceStatus(invoiceId, "acknowledged");
  }, [updateInvoiceStatus]);

  // ============================================
  // DISPUTE INVOICE
  // ============================================
  const disputeInvoice = useCallback(async (invoiceId: string, reason?: string): Promise<boolean> => {
    try {
      const invoice = state.invoices.find((i) => i.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      if (!canTransition(invoice.status, "disputed")) {
        throw new Error(`Cannot dispute invoice in ${invoice.status} status`);
      }

      const updates: any = { status: "disputed" };
      if (reason) {
        updates.notes = invoice.notes ? `${invoice.notes}\n\nDispute: ${reason}` : `Dispute: ${reason}`;
      }

      const { error } = await supabase
        .from("sale_bills")
        .update(updates)
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to dispute invoice";
      console.error("Error disputing invoice:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.invoices, fetchInvoices]);

  // ============================================
  // RECORD PAYMENT
  // ============================================
  const recordPayment = useCallback(async (
    invoiceId: string,
    payment: PaymentInput
  ): Promise<boolean> => {
    try {
      const invoice = state.invoices.find((i) => i.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      // Invoice should be sent or acknowledged to record payment
      if (invoice.status === "draft") {
        throw new Error("Invoice must be sent to client before recording payment");
      }

      if (payment.amount <= 0) {
        throw new Error("Payment amount must be positive");
      }

      const newPaidAmount = invoice.paid_amount + payment.amount;
      
      if (newPaidAmount > invoice.total_amount) {
        throw new Error("Payment amount exceeds due amount");
      }

      // Determine new payment status
      let newPaymentStatus: PaymentStatus;
      if (newPaidAmount >= invoice.total_amount) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      } else {
        newPaymentStatus = "unpaid";
      }

      const newDueAmount = invoice.total_amount - newPaidAmount;

      // Add payment note
      const paymentNote = `Payment of ${formatCurrency(payment.amount)} received on ${
        payment.payment_date || new Date().toISOString().split("T")[0]
      }${payment.payment_reference ? ` (Ref: ${payment.payment_reference})` : ""}${
        payment.payment_method ? ` via ${payment.payment_method}` : ""
      }`;
      
      const updatedNotes = invoice.notes 
        ? `${invoice.notes}\n\n${paymentNote}` 
        : paymentNote;

      const { error } = await supabase
        .from("sale_bills")
        .update({
          paid_amount: newPaidAmount,
          due_amount: newDueAmount,
          payment_status: newPaymentStatus,
          last_payment_date: payment.payment_date || new Date().toISOString().split("T")[0],
          notes: updatedNotes,
        })
        .eq("id", invoiceId);

      if (error) throw error;

      await fetchInvoices();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record payment";
      console.error("Error recording payment:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.invoices, fetchInvoices]);

  // ============================================
  // GET INVOICES BY STATUS
  // ============================================
  const getInvoicesByStatus = useCallback((status: InvoiceStatus): BuyerInvoice[] => {
    return state.invoices.filter((i) => i.status === status);
  }, [state.invoices]);

  // ============================================
  // GET INVOICES BY PAYMENT STATUS
  // ============================================
  const getInvoicesByPaymentStatus = useCallback((paymentStatus: PaymentStatus): BuyerInvoice[] => {
    return state.invoices.filter((i) => i.payment_status === paymentStatus);
  }, [state.invoices]);

  // ============================================
  // GET OVERDUE INVOICES
  // ============================================
  const getOverdueInvoices = useCallback((): BuyerInvoice[] => {
    const today = new Date().toISOString().split("T")[0];
    return state.invoices.filter(
      (i) => i.due_date && i.due_date < today && i.payment_status !== "paid"
    );
  }, [state.invoices]);

  // ============================================
  // GET INVOICE STATISTICS
  // ============================================
  const getInvoiceStatistics = useCallback(() => {
    const invoices = state.invoices;
    
    return {
      totalInvoices: invoices.length,
      draftInvoices: invoices.filter((i) => i.status === "draft").length,
      sentInvoices: invoices.filter((i) => ["sent", "submitted"].includes(i.status)).length,
      acknowledgedInvoices: invoices.filter((i) => ["acknowledged", "approved"].includes(i.status)).length,
      disputedInvoices: invoices.filter((i) => i.status === "disputed").length,
      unpaidInvoices: invoices.filter((i) => i.payment_status === "unpaid").length,
      partiallyPaid: invoices.filter((i) => i.payment_status === "partial").length,
      fullyPaid: invoices.filter((i) => i.payment_status === "paid").length,
      totalAmount: invoices.reduce((sum, i) => sum + i.total_amount, 0),
      totalCollected: invoices.reduce((sum, i) => sum + i.paid_amount, 0),
      totalOutstanding: invoices.reduce((sum, i) => sum + i.due_amount, 0),
      overdueInvoices: getOverdueInvoices().length,
      overdueAmount: getOverdueInvoices().reduce((sum, i) => sum + i.due_amount, 0),
    };
  }, [state.invoices, getOverdueInvoices]);

  // ============================================
  // SELECT INVOICE
  // ============================================
  const selectInvoice = useCallback((invoice: BuyerInvoice | null) => {
    setState((prev) => ({ ...prev, selectedInvoice: invoice }));
    if (invoice) {
      fetchInvoiceItems(invoice.id);
    }
  }, [fetchInvoiceItems]);

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
    fetchInvoices();
  }, [fetchInvoices]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    invoices: state.invoices,
    items: state.items,
    selectedInvoice: state.selectedInvoice,
    isLoading: state.isLoading,
    error: state.error,

    // Fetch functions
    fetchInvoices,
    fetchInvoiceItems,

    // CRUD - Invoices
    createInvoice,
    createInvoiceFromContract,
    updateInvoice,
    deleteInvoice,

    // CRUD - Items
    addInvoiceItem,
    updateInvoiceItem,
    deleteInvoiceItem,

    // Workflow
    sendInvoice,
    acknowledgeInvoice,
    disputeInvoice,
    updateInvoiceStatus,

    // Payments
    recordPayment,

    // Queries
    getInvoicesByStatus,
    getInvoicesByPaymentStatus,
    getOverdueInvoices,
    getInvoiceStatistics,

    // Utilities
    selectInvoice,
    clearError,
    recalculateInvoiceTotals,
  };
}

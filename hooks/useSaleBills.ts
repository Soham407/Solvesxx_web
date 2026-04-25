"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
const supabase = supabaseClient as any;

// ============================================
// TYPES
// ============================================

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
  subtotal: number; // In paise
  tax_amount: number; // In paise
  discount_amount: number; // In paise
  total_amount: number; // In paise
  paid_amount: number; // In paise
  due_amount: number; // In paise
  last_payment_date: string | null;
  paid_at?: string | null;
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

export interface CreateSaleBillInput {
  client_id: string;
  contract_id?: string;
  request_id?: string;
  invoice_date?: string;
  due_date?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal?: number; // In paise
  tax_amount?: number; // In paise
  discount_amount?: number; // In paise
  total_amount?: number; // In paise
  notes?: string;
  items: Array<{
    service_id?: string;
    product_id?: string;
    item_description?: string;
    quantity: number;
    unit_of_measure?: string;
    unit_price: number; // In paise
    tax_rate?: number;
    notes?: string;
  }>;
}

interface UseSaleBillsState {
  bills: SaleBill[];
  isLoading: boolean;
  error: string | null;
}

// Status display configuration
export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Sent", className: "bg-info/10 text-info border-info/20" },
  acknowledged: { label: "Acknowledged", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-critical/10 text-critical border-critical/20" },
  partial: { label: "Partial", className: "bg-warning/10 text-warning border-warning/20" },
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20" },
  overdue: { label: "Overdue", className: "bg-critical text-critical-foreground" },
};

// ============================================
// HOOK
// ============================================

export function useSaleBills(filters?: {
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  clientId?: string;
}) {
  const { userId } = useAuth();
  const [state, setState] = useState<UseSaleBillsState>({
    bills: [],
    isLoading: true,
    error: null,
  });

  const fetchBills = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

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
            request_number
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
      if (filters?.clientId) query = query.eq("client_id", filters.clientId);

      const { data, error } = await query;
      if (error) throw error;

      const billsWithDetails: SaleBill[] = (data || []).map((bill: any) => ({
        ...bill,
        client_name: bill.societies?.society_name || "Unknown",
        client_code: bill.societies?.society_code || "N/A",
        contract_number: bill.contracts?.contract_number || null,
        request_number: bill.requests?.request_number || null,
      }));

      setState((prev) => ({
        ...prev,
        bills: billsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch bills";
      console.error("Error fetching sale bills:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters?.status, filters?.paymentStatus, filters?.clientId]);

  const createBill = useCallback(async (input: CreateSaleBillInput): Promise<SaleBill | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const subtotal = input.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const taxAmount = input.items.reduce((sum, item) => {
          const itemSubtotal = item.unit_price * item.quantity;
          return sum + Math.round(itemSubtotal * ((item.tax_rate || 0) / 100));
      }, 0);
      const totalAmount = subtotal + taxAmount - (input.discount_amount || 0);

      // 1. Create the bill header
      const { data: bill, error: billError } = await supabase
        .from("sale_bills")
        .insert({
          client_id: input.client_id,
          contract_id: input.contract_id,
          request_id: input.request_id,
          invoice_date: input.invoice_date || new Date().toISOString().split("T")[0],
          due_date: input.due_date,
          billing_period_start: input.billing_period_start,
          billing_period_end: input.billing_period_end,
          status: "sent",
          payment_status: "unpaid",
          subtotal: subtotal,
          tax_amount: taxAmount,
          discount_amount: input.discount_amount ?? 0,
          total_amount: totalAmount,
          paid_amount: 0,
          due_amount: totalAmount,
          notes: input.notes,
        })
        .select()
        .single();

      if (billError) throw billError;

      // 2. Create the bill items
      const billItems = input.items.map(item => {
          const itemSubtotal = item.unit_price * item.quantity;
          const itemTax = Math.round(itemSubtotal * ((item.tax_rate || 0) / 100));
          return {
            sale_bill_id: bill.id,
            service_id: item.service_id,
            product_id: item.product_id,
            item_description: item.item_description,
            quantity: item.quantity,
            unit_of_measure: item.unit_of_measure || "pcs",
            unit_price: item.unit_price,
            tax_rate: item.tax_rate || 0,
            tax_amount: itemTax,
            discount_amount: 0,
            line_total: itemSubtotal + itemTax,
            notes: item.notes,
          };
      });

      const { error: itemsError } = await supabase
        .from("sale_bill_items")
        .insert(billItems);

      if (itemsError) throw itemsError;

      await fetchBills();
      return bill as SaleBill;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create bill";
      console.error("Error creating sale bill:", err);
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [fetchBills]);

  const markPaid = useCallback(async (billId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const bill = state.bills.find(b => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      const paymentDate = new Date().toISOString().split("T")[0];
      const { data: method, error: methodError } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("is_active", true)
        .eq("gateway", "manual")
        .limit(1)
        .maybeSingle();

      if (methodError) throw methodError;
      if (!method?.id) {
        throw new Error("No active manual payment method available");
      }

      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          payment_type: "receipt",
          reference_type: "sale_bill",
          reference_id: billId,
          amount: bill.due_amount || bill.total_amount,
          payment_method_id: method.id,
          payment_date: paymentDate,
          notes: `Marked paid from sale bills screen for invoice ${bill.invoice_number}`,
          payer_id: bill.client_id,
          payee_id: userId,
          gateway_log: {},
          status: "completed",
          processed_by: userId,
        }]);

      if (paymentError) throw paymentError;

      await fetchBills();
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to mark bill as paid";
      console.error("Error marking bill as paid:", err);
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return false;
    }
  }, [state.bills, fetchBills, userId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    bills: state.bills,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchBills,
    createBill,
    markPaid,
  };
}

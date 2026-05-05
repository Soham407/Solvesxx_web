"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { notifySocietyManager } from "@/src/lib/notifications/notifySocietyManager";
import { notifyAdminTierUsers } from "@/src/lib/notifications/notifyAdminTierUsers";
import {
  INVOICE_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  mapSaleBillRows,
  type CreateSaleBillInput,
  type InvoiceStatus,
  type PaymentStatus,
  type SaleBill,
  type SaleBillItem,
  type SaleBillRow,
} from "@/src/lib/sale-bills/saleBillTransforms";

export type {
  CreateSaleBillInput,
  InvoiceStatus,
  PaymentStatus,
  SaleBill,
  SaleBillItem,
} from "@/src/lib/sale-bills/saleBillTransforms";

export { INVOICE_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/src/lib/sale-bills/saleBillTransforms";
const supabase = supabaseClient;

interface UseSaleBillsState {
  bills: SaleBill[];
  isLoading: boolean;
  error: string | null;
}

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

      const billsWithDetails: SaleBill[] = mapSaleBillRows((data || []) as SaleBillRow[]);

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

      try {
        if (bill.client_id) {
          await notifySocietyManager({
            societyId: bill.client_id,
            title: "New Sale Bill Generated",
            body: `Invoice ${bill.invoice_number || bill.id} has been generated and sent for review.`,
            notificationType: "sale_bill_generated",
            referenceId: bill.id,
            referenceType: "sale_bill",
          });
        }
      } catch (notifyErr) {
        console.error("Failed to notify society manager about sale bill:", notifyErr);
      }

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

      const paidAt = new Date().toISOString();
      const paymentDate = paidAt.split("T")[0];
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

      const { error: billUpdateError } = await supabase
        .from("sale_bills")
        .update({
          payment_status: "paid",
          paid_amount: bill.total_amount,
          due_amount: 0,
          last_payment_date: paymentDate,
          paid_at: paidAt,
        })
        .eq("id", billId);

      if (billUpdateError) throw billUpdateError;

      try {
        if (bill.client_id) {
          await notifySocietyManager({
            societyId: bill.client_id,
            title: "Sale Bill Payment Received",
            body: `Invoice ${bill.invoice_number} has been marked paid.`,
            notificationType: "sale_bill_paid",
            referenceId: billId,
            referenceType: "sale_bill",
          });
        }

        await notifyAdminTierUsers({
          title: "Sale Bill Paid",
          body: `Invoice ${bill.invoice_number} was marked paid.`,
          notificationType: "sale_bill_paid",
          referenceId: billId,
          referenceType: "sale_bill",
        });
      } catch (notifyErr) {
        console.error("Failed to notify payment recipients:", notifyErr);
      }

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

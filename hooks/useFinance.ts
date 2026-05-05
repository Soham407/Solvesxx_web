"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "./useAuth";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentType = "receipt" | "payout";
export type ReferenceType = "sale_bill" | "purchase_bill";

export interface PaymentModel {
  id: string;
  payment_number: string;
  payment_type: PaymentType;
  reference_type: ReferenceType;
  reference_id: string;
  payer_id: string;
  payee_id: string;
  payment_date: string;
  payment_method_id: string;
  amount: number;
  status: PaymentStatus;
  notes?: string;
  evidence_url?: string;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  method_name: string;
  gateway: string;
  is_active?: boolean | null;
}

function toPaymentType(value: string | null | undefined): PaymentType {
  if (value === "receipt" || value === "payout") {
    return value;
  }

  return "receipt";
}

function toPaymentStatus(value: string | null | undefined): PaymentStatus {
  if (value === "pending" || value === "completed" || value === "failed" || value === "refunded") {
    return value;
  }

  return "pending";
}

function toReferenceType(value: string | null | undefined): ReferenceType {
  if (value === "sale_bill" || value === "purchase_bill") {
    return value;
  }

  return "purchase_bill";
}

export function useFinance() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentModel[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [paymentsRes, methodsRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_methods').select('*').eq('is_active', true)
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (methodsRes.error) throw methodsRes.error;

      setPayments((paymentsRes.data || []).map((payment) => ({
        ...payment,
        payment_type: toPaymentType(payment.payment_type),
        reference_type: toReferenceType(payment.reference_type),
        status: toPaymentStatus(payment.status),
      })));
      setMethods(methodsRes.data || []);
    } catch (err) {
      console.error("Error fetching finance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordTransaction = async (data: {
    type: PaymentType;
    referenceType: ReferenceType;
    referenceId: string;
    amount: number;
    methodId: string;
    date: string;
    notes?: string;
    evidenceUrl?: string;
    payerId: string;
    payeeId: string;
  }) => {
    try {
      const selectedMethod = methods.find((method) => method.id === data.methodId);
      if (!selectedMethod) {
        throw new Error("Selected payment method is no longer available.");
      }

      const isGatewayPayment = selectedMethod.gateway !== "manual";
      const paymentStatus: PaymentStatus = isGatewayPayment ? "pending" : "completed";

      // 1. Insert Payment Record
      const { error: payError } = await supabase
        .from('payments')
        .insert([{
          payment_type: data.type,
          reference_type: data.referenceType,
          reference_id: data.referenceId,
          amount: data.amount,
          payment_method_id: data.methodId,
          payment_date: data.date,
          notes: data.notes,
          evidence_url: data.evidenceUrl,
          payer_id: data.payerId,
          payee_id: data.payeeId,
          gateway_log: isGatewayPayment
            ? {
                initiated_at: new Date().toISOString(),
                gateway: selectedMethod.gateway,
                source: "useFinance.recordTransaction",
              }
            : {},
          status: paymentStatus,
          processed_by: user?.id
        }]);

      if (payError) throw payError;

      if (isGatewayPayment) {
        await fetchData();
        return true;
      }

      // 2. Update Bill Balances (Sale Bill or Purchase Bill)
      const table = data.referenceType === 'sale_bill' ? 'sale_bills' : 'purchase_bills';
      
      const { data: bill, error: billError } = await supabase
        .from(table)
        .select('paid_amount, total_amount')
        .eq('id', data.referenceId)
        .single();
      if (billError) throw billError;
      
      if (bill) {
        const newPaidAmount = (bill.paid_amount || 0) + data.amount;
        const newDueAmount = Math.max(0, bill.total_amount - newPaidAmount);
        const newStatus = newDueAmount === 0 ? 'paid' : 'partial';

        const { error: updateError } = await supabase.from(table).update({
          paid_amount: newPaidAmount,
          due_amount: newDueAmount,
          payment_status: newStatus,
          last_payment_date: data.date
        }).eq('id', data.referenceId);
        if (updateError) throw updateError;
      }

      await fetchData();
      return true;
    } catch (err) {
      console.error("Error recording transaction:", err);
      return false;
    }
  };

  const forceMatchBill = async (billId: string, reason: string, evidenceUrl?: string) => {
    try {
      const { error } = await supabase.rpc('force_match_bill', {
        p_bill_id: billId,
        p_reason: reason,
        p_evidence_url: evidenceUrl ?? null
      });

      if (error) throw error;
      await fetchData();
      return { success: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error force matching bill:", err);
      return { success: false as const, error: message };
    }
  };

  const validateBillForPayout = async (billId: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_bill_for_payout', {
        p_bill_id: billId
      });

      if (error) throw error;
      
      // RPC returns a table of results, but since we call it for one ID, we get one row? 
      // Actually declared as RETURNS TABLE, so it returns an array.
      const result = Array.isArray(data) ? data[0] : data;
      const typedResult = result as {
        can_pay?: boolean;
        is_valid?: boolean;
        match_status?: string | null;
        message?: string | null;
        po_total?: number | null;
        grn_total?: number | null;
        bill_total?: number | null;
      } | undefined;
      
      return { 
        success: true as const, 
        // result?.can_pay ?? result?.is_valid ?? false
        canPay: typedResult?.can_pay ?? typedResult?.is_valid ?? false,
        reason: typedResult?.message ?? null,
        reconciliationStatus: typedResult?.match_status ?? null,
        details: {
          poAmount: typedResult?.po_total ?? null,
          grnAmount: typedResult?.grn_total ?? null,
          billAmount: typedResult?.bill_total ?? null
        }
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error validating bill:", err);
      return { success: false as const, error: message };
    }
  };

  return {
    payments,
    methods,
    isLoading,
    recordTransaction,
    forceMatchBill,
    validateBillForPayout,
    refresh: fetchData
  };
}

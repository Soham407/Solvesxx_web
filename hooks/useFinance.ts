"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { useAuth } from "./useAuth";

// FIX: Cast at import level instead of @ts-nocheck on entire file
const supabase = supabaseClient as any;

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

      setPayments(paymentsRes.data || []);
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
          status: 'completed',
          processed_by: user?.id
        }]);

      if (payError) throw payError;

      // 2. Update Bill Balances (Sale Bill or Purchase Bill)
      const table = data.referenceType === 'sale_bill' ? 'sale_bills' : 'purchase_bills';
      
      const { data: bill } = await supabase.from(table).select('paid_amount, total_amount').eq('id', data.referenceId).single();
      
      if (bill) {
        const newPaidAmount = (bill.paid_amount || 0) + data.amount;
        const newDueAmount = Math.max(0, bill.total_amount - newPaidAmount);
        const newStatus = newDueAmount === 0 ? 'paid' : 'partially_paid';

        await supabase.from(table).update({
          paid_amount: newPaidAmount,
          due_amount: newDueAmount,
          payment_status: newStatus,
          last_payment_date: data.date
        }).eq('id', data.referenceId);
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
      
      return { 
        success: true as const, 
        canPay: result?.can_pay ?? false,
        reason: result?.reason,
        reconciliationStatus: result?.reconciliation_status,
        details: {
          poAmount: result?.po_amount,
          grnAmount: result?.grn_amount,
          billAmount: result?.bill_amount
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

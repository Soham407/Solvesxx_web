// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { RequestStatus } from "./useBuyerRequests";

export type POStatus = 
  | 'draft' 
  | 'sent_to_vendor' 
  | 'acknowledged' 
  | 'dispatched'
  | 'partial_received' 
  | 'received' 
  | 'cancelled';

export interface SupplierIndent {
  id: string;
  request_number: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_at: string;
  request_items: any[];
}

export interface SupplierPO {
  id: string;
  po_number: string;
  po_date: string;
  status: POStatus;
  grand_total: number;
  expected_delivery_date: string;
  vendor_acknowledged_at: string | null;
  dispatched_at: string | null;
  vehicle_details: string | null;
  dispatch_notes: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  supplier_id: string;
  items: any[];
}

export interface SupplierBill {
  id: string;
  bill_number: string;
  supplier_invoice_number: string;
  bill_date: string;
  total_amount: number;
  status: string;
  payment_status: string;
  purchase_order_id: string;
}

export function useSupplierPortal() {
  const { user } = useAuth();
  const [indents, setIndents] = useState<SupplierIndent[]>([]);
  const [pos, setPos] = useState<SupplierPO[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPortalData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);

      // 1. Fetch User's Supplier ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.supplier_id) {
        console.error("User not linked to a supplier record", userError);
        setIsLoading(false);
        return;
      }

      const supplierId = userData.supplier_id;

      // 2. Fetch Forwarded Indents (Requests)
      const { data: requestData, error: reqError } = await supabase
        .from('requests')
        .select(`
          *,
          request_items (
            *,
            products (product_name, unit)
          )
        `)
        .eq('supplier_id', supplierId)
        .in('status', ['indent_forwarded', 'indent_accepted', 'indent_rejected']);

      if (reqError) throw reqError;

      // 3. Fetch Purchase Orders
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (
            *,
            products (product_name, unit)
          )
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (poError) throw poError;

      // 4. Fetch Purchase Bills
      const { data: billData, error: billError } = await supabase
        .from('purchase_bills')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (billError) throw billError;

      setIndents(requestData || []);
      setPos(poData || []);
      setBills(billData || []);

    } catch (err) {
      console.error("Error fetching supplier portal data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // ACTIONS

  const respondToIndent = async (requestId: string, decision: 'indent_accepted' | 'indent_rejected', reason?: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: decision,
          rejection_reason: decision === 'indent_rejected' ? reason : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      await fetchPortalData();
      return true;
    } catch (err) {
      console.error("Error responding to indent:", err);
      return false;
    }
  };

  const acknowledgePO = async (poId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'acknowledged' as POStatus,
          vendor_acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) throw error;
      
      // Also update the overall request status
      const { data: po } = await supabase.from('purchase_orders').select('indent_id').eq('id', poId).single();
      if (po?.indent_id) {
        const { data: indent } = await supabase.from('indents').select('id').eq('id', po.indent_id).single();
        // Assuming we find the request linked to this indent
        const { data: request } = await supabase.from('requests').select('id').eq('indent_id', po.indent_id).single();
        if (request) {
          await supabase.from('requests').update({ status: 'po_received' as RequestStatus }).eq('id', request.id);
        }
      }

      await fetchPortalData();
      return true;
    } catch (err) {
      console.error("Error acknowledging PO:", err);
      return false;
    }
  };

  const dispatchPO = async (poId: string, dispatchData: { date: string, vehicle?: string, notes?: string }) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'dispatched' as POStatus,
          dispatched_at: dispatchData.date,
          vehicle_details: dispatchData.vehicle,
          dispatch_notes: dispatchData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', poId);

      if (error) throw error;

      // Update request status
      const { data: po } = await supabase.from('purchase_orders').select('indent_id').eq('id', poId).single();
      if (po?.indent_id) {
        const { data: request } = await supabase.from('requests').select('id').eq('indent_id', po.indent_id).single();
        if (request) {
          await supabase.from('requests').update({ status: 'po_dispatched' as RequestStatus }).eq('id', request.id);
        }
      }

      await fetchPortalData();
      return true;
    } catch (err) {
      console.error("Error dispatching PO:", err);
      return false;
    }
  };

  const submitBill = async (billData: any): Promise<{ success: boolean; billId?: string }> => {
    try {
      const { data, error } = await supabase
        .from('purchase_bills')
        .insert([{
          ...billData,
          status: 'submitted',
          payment_status: 'unpaid',
          created_by: user?.id
        }])
        .select('id')
        .single();

      if (error) throw error;

      // Update request status to bill_generated
      if (billData.purchase_order_id) {
        const { data: po } = await supabase.from('purchase_orders').select('indent_id').eq('id', billData.purchase_order_id).single();
        if (po?.indent_id) {
          const { data: request } = await supabase.from('requests').select('id').eq('indent_id', po.indent_id).single();
          if (request) {
            await supabase.from('requests').update({ status: 'bill_generated' as RequestStatus }).eq('id', request.id);
          }
        }
      }

      await fetchPortalData();
      return { success: true, billId: data.id };
    } catch (err) {
      console.error("Error submitting bill:", err);
      return { success: false };
    }
  };

  return {
    indents,
    pos,
    bills,
    isLoading,
    refresh: fetchPortalData,
    respondToIndent,
    acknowledgePO,
    dispatchPO,
    submitBill
  };
}

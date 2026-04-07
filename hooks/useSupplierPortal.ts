"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { RequestStatus } from "./useBuyerRequests";
import type { SupplierExtended, UpdateSupplierForm } from "@/src/types/supply-chain";
import type { SPOStatus } from "./useServicePurchaseOrders";
import { toast } from "@/components/ui/use-toast";

const supabase = supabaseTyped;

export type POStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
  | "dispatched"
  | "partial_received"
  | "received"
  | "cancelled";

export interface SupplierIndent {
  id: string;
  indent_id?: string | null;
  request_number: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_at: string;
  service_type?: string | null;
  service_grade?: string | null;
  headcount?: number | null;
  shift?: string | null;
  start_date?: string | null;
  duration_months?: number | null;
  site_location_id?: string | null;
  site_location_name?: string | null;
  is_service_request?: boolean;
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
  purchase_order_id: string | null;
  service_purchase_order_id: string | null;
}

export interface SupplierServiceOrder {
  id: string;
  spo_number: string;
  vendor_id: string;
  request_id: string | null;
  service_type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  total_amount: number;
  status: SPOStatus;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
  site_location_id?: string | null;
  site_location_name?: string | null;
}

export interface SupplierServiceAcknowledgment {
  id: string;
  spo_id: string;
  status: string;
  acknowledged_by: string | null;
  headcount_expected: number | null;
  headcount_received: number | null;
  grade_verified: boolean | null;
  notes: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface UpdateSupplierProfileInput extends UpdateSupplierForm {
  rates?: string | null;
  availability?: string | null;
}

interface SupplierRequestRow extends SupplierIndent {
  site_location?: {
    location_name?: string | null;
  } | null;
}

interface SupplierServiceAcknowledgmentRow extends SupplierServiceAcknowledgment {
  service_purchase_orders?: {
    vendor_id?: string | null;
  } | null;
}

interface SupplierServiceOrderRow extends SupplierServiceOrder {
  request?: {
    site_location_id?: string | null;
    site_location?: {
      location_name?: string | null;
    } | null;
  } | null;
}

interface SupplierPurchaseOrderRow {
  purchase_order_items?: any[] | null;
  [key: string]: any;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    return err.message;
  }

  return fallback;
}

export function useSupplierPortal() {
  const { user } = useAuth();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierExtended | null>(null);
  const [indents, setIndents] = useState<SupplierIndent[]>([]);
  const [pos, setPos] = useState<SupplierPO[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [serviceOrders, setServiceOrders] = useState<SupplierServiceOrder[]>([]);
  const [serviceAcknowledgments, setServiceAcknowledgments] = useState<SupplierServiceAcknowledgment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const resolveSupplierId = useCallback(async () => {
    if (!user?.id) {
      setSupplierId(null);
      return null;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("supplier_id")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw userError;
    }

    const nextSupplierId = userData?.supplier_id ?? null;
    setSupplierId(nextSupplierId);
    return nextSupplierId;
  }, [user?.id]);

  const fetchPortalData = useCallback(async () => {
    if (!user?.id) {
      setSupplierId(null);
      setSupplierProfile(null);
      setIndents([]);
      setPos([]);
      setBills([]);
      setServiceOrders([]);
      setServiceAcknowledgments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const currentSupplierId = await resolveSupplierId();

      if (!currentSupplierId) {
        console.error("User is not linked to a supplier record");
        setSupplierProfile(null);
        setIndents([]);
        setPos([]);
        setBills([]);
        setServiceOrders([]);
        setServiceAcknowledgments([]);
        return;
      }

      const [
        supplierProfileResult,
        requestResult,
        purchaseOrdersResult,
        purchaseBillsResult,
        serviceOrdersResult,
        serviceAcknowledgmentsResult,
      ] = await Promise.all([
        supabase
          .from("suppliers")
          .select("*")
          .eq("id", currentSupplierId)
          .single(),
        supabase
          .from("requests")
          .select(`
            *,
            site_location:company_locations!site_location_id (
              location_name
            ),
            request_items (
              *,
              products (product_name, unit_of_measurement)
            )
          `)
          .eq("supplier_id", currentSupplierId)
          .in("status", ["indent_forwarded", "indent_accepted", "indent_rejected", "po_issued"])
          .order("created_at", { ascending: false }),
        supabase
          .from("purchase_orders")
          .select(`
            *,
            purchase_order_items (
              *,
              products (product_name, unit_of_measurement)
            )
          `)
          .eq("supplier_id", currentSupplierId)
          .order("created_at", { ascending: false }),
        supabase
          .from("purchase_bills")
          .select("*")
          .eq("supplier_id", currentSupplierId)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_purchase_orders")
          .select(`
            *,
            request:requests!request_id (
              site_location_id,
              site_location:company_locations!site_location_id (
                location_name
              )
            )
          `)
          .eq("vendor_id", currentSupplierId)
          .order("created_at", { ascending: false }),
        supabase
          .from("service_acknowledgments")
          .select(`
            *,
            service_purchase_orders!inner(vendor_id)
          `)
          .eq("service_purchase_orders.vendor_id", currentSupplierId)
          .order("acknowledged_at", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (supplierProfileResult.error) throw supplierProfileResult.error;
      if (requestResult.error) throw requestResult.error;
      if (purchaseOrdersResult.error) throw purchaseOrdersResult.error;
      if (purchaseBillsResult.error) throw purchaseBillsResult.error;
      if (serviceOrdersResult.error) throw serviceOrdersResult.error;
      if (serviceAcknowledgmentsResult.error) throw serviceAcknowledgmentsResult.error;

      setSupplierProfile((supplierProfileResult.data ?? null) as SupplierExtended | null);
      setIndents(
        ((requestResult.data ?? []) as SupplierRequestRow[])
          .filter((request) => request.is_service_request || !!request.indent_id)
          .map((request) => ({
            ...request,
            site_location_name: request.site_location?.location_name ?? null,
          })) as SupplierIndent[]
      );
      setPos(
        ((purchaseOrdersResult.data ?? []) as SupplierPurchaseOrderRow[]).map((purchaseOrder) => ({
          ...purchaseOrder,
          items: purchaseOrder.purchase_order_items ?? [],
        })) as SupplierPO[]
      );
      setBills((purchaseBillsResult.data ?? []) as SupplierBill[]);
      setServiceOrders(
        ((serviceOrdersResult.data ?? []) as SupplierServiceOrderRow[]).map((serviceOrder) => ({
          ...serviceOrder,
          site_location_id: serviceOrder.request?.site_location_id ?? null,
          site_location_name: serviceOrder.request?.site_location?.location_name ?? null,
        })) as SupplierServiceOrder[]
      );
      setServiceAcknowledgments(
        ((serviceAcknowledgmentsResult.data ?? []) as SupplierServiceAcknowledgmentRow[]).map(
          ({ service_purchase_orders: _servicePurchaseOrders, ...acknowledgment }) => acknowledgment
        )
      );
    } catch (err) {
      console.error("Error fetching supplier portal data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [resolveSupplierId, user?.id]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`supplier-portal-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, fetchPortalData)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, fetchPortalData)
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_bills" }, fetchPortalData)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_purchase_orders" }, fetchPortalData)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_acknowledgments" }, fetchPortalData)
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, fetchPortalData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPortalData, user?.id]);

  const respondToIndent = async (
    requestId: string,
    decision: "indent_accepted" | "indent_rejected",
    reason?: string
  ) => {
    try {
      const targetIndent = indents.find((indent) => indent.id === requestId);
      const isServiceRequest = targetIndent?.is_service_request === true;

      if (decision === "indent_rejected") {
        const { data: authData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("requests")
          .update({
            status: decision,
            rejection_reason: reason || null,
            rejected_at: new Date().toISOString(),
            rejected_by: authData.user?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        if (error) throw error;
      } else if (isServiceRequest) {
        const response = await fetch("/api/supplier/service-indent-response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requestId }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || "Failed to accept the service deployment request.");
        }
      } else {
        const { data, error } = await (supabase as any).rpc("create_po_from_supplier_request", {
          p_request_id: requestId,
        });

        if (error) throw error;

        const rpcResult = data as any;
        if (!rpcResult?.success) {
          throw new Error(rpcResult?.error || "Failed to create purchase order from accepted indent");
        }
      }

      await fetchPortalData();
      return true;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, "Failed to respond to indent");
      console.error("Error responding to indent:", err);
      toast({
        title: "Indent Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const acknowledgePO = async (poId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "acknowledged" as POStatus,
          vendor_acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", poId);

      if (error) throw error;

      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("indent_id")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      if (po?.indent_id) {
        await supabase
          .from("requests")
          .update({ status: "po_received" as RequestStatus, updated_at: new Date().toISOString() })
          .eq("indent_id", po.indent_id)
          .in("status", ["po_issued", "indent_accepted"]);
      }

      await fetchPortalData();
      return true;
    } catch (err) {
      console.error("Error acknowledging PO:", err);
      return false;
    }
  };

  const dispatchPO = async (
    poId: string,
    dispatchData: { date: string; vehicle?: string; notes?: string }
  ) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? user?.id;

      const { data: result, error: rpcError } = await supabase.rpc("transition_po_status" as any, {
        p_po_id: poId,
        p_new_status: "dispatched",
        p_user_id: userId,
        p_vehicle_details: dispatchData.vehicle ?? null,
        p_dispatch_notes: dispatchData.notes ?? null,
        p_dispatched_at: dispatchData.date,
      });

      if (rpcError) throw rpcError;

      const rpcResult = result as any;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || "Status transition failed");
      }

      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select("indent_id")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      if (po?.indent_id) {
        await supabase
          .from("requests")
          .update({ status: "po_dispatched" as RequestStatus, updated_at: new Date().toISOString() })
          .eq("indent_id", po.indent_id)
          .in("status", ["po_received", "po_issued"]);
      }

      await fetchPortalData();
      return true;
    } catch (err) {
      console.error("Error dispatching PO:", err);
      return false;
    }
  };

  const acknowledgeServiceOrder = async (
    spoId: string,
    headcountExpected?: number,
    gradeVerified?: boolean,
    notes?: string
  ) => {
    try {
      const { data, error } = await (supabase as any).rpc("supplier_transition_service_po_status", {
        p_spo_id: spoId,
        p_new_status: "acknowledged",
        p_headcount_expected: headcountExpected,
        p_grade_verified: gradeVerified ?? null,
        p_notes: notes?.trim() || null,
      });

      if (error) throw error;

      const rpcResult = data as any;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || "Failed to acknowledge service order");
      }

      await fetchPortalData();
      return true;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, "Failed to acknowledge service order");
      console.error("Error acknowledging service purchase order:", err);
      toast({
        title: "Acknowledgment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSupplierProfile = async (
    updates: UpdateSupplierProfileInput
  ): Promise<{ success: boolean; data?: SupplierExtended; error?: string }> => {
    try {
      const currentSupplierId = supplierId ?? (await resolveSupplierId());
      if (!currentSupplierId) {
        throw new Error("Supplier profile is not linked to this user");
      }

      const { data, error } = await supabase
        .from("suppliers")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("id", currentSupplierId)
        .select("*")
        .single();

      if (error) throw error;

      setSupplierProfile(data as SupplierExtended);
      await fetchPortalData();
      return { success: true, data: data as SupplierExtended };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update supplier profile";
      console.error("Error updating supplier profile:", err);
      return { success: false, error: errorMessage };
    }
  };

  const submitBill = async (billData: any): Promise<{ success: boolean; billId?: string }> => {
    try {
      const { bill_number: _discardedBillNumber, ...billPayload } = billData;

      // Pre-flight check for SPO-linked work
      if (billPayload.service_purchase_order_id) {
        const { data: ack, error: ackError } = await supabase
          .from("service_acknowledgments")
          .select("status")
          .eq("spo_id", billPayload.service_purchase_order_id)
          .eq("status", "acknowledged")
          .maybeSingle();

        if (ackError) throw ackError;
        if (!ack) {
          throw new Error("Service acknowledgment required before billing for SPO-linked work. Please obtain acknowledgment first.");
        }
      }

      let material_receipt_id = null;

      // Only require GRN for material purchase orders
      if (billPayload.purchase_order_id && !billPayload.service_purchase_order_id) {
        const { data: acceptedGRNs, error: grnError } = await supabase
          .from("material_receipts")
          .select("id")
          .eq("purchase_order_id", billPayload.purchase_order_id)
          .in("status", ["accepted", "partial_accepted"])
          .order("received_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (grnError) throw grnError;

        if (!acceptedGRNs || acceptedGRNs.length === 0) {
          throw new Error("Bill submission requires an accepted GRN linked to the PO.");
        }

        if (acceptedGRNs.length > 1) {
          throw new Error(
            "Multiple accepted GRNs exist for this PO. Submit the bill against a specific receipt to preserve 3-way match."
          );
        }
        
        material_receipt_id = acceptedGRNs[0].id; // material_receipt_id: acceptedGRNs[0].id
      }

      const { data, error } = await supabase
        .from("purchase_bills")
        .insert([
          {
            ...billPayload,
            material_receipt_id,
            status: "submitted",
            payment_status: "unpaid",
            created_by: user?.id,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      // Request-state propagation is server-authoritative from purchase_bills
      // triggers so service flows can obey the shared workflow guard safely.

      await fetchPortalData();
      return { success: true, billId: data.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit bill";
      console.error("Error submitting bill:", err);
      toast({ title: "Bill submission failed", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  return {
    supplierId,
    supplierProfile,
    indents,
    pos,
    bills,
    serviceOrders,
    serviceAcknowledgments,
    isLoading,
    refresh: fetchPortalData,
    respondToIndent,
    acknowledgePO,
    dispatchPO,
    acknowledgeServiceOrder,
    updateSupplierProfile,
    submitBill,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { RequestStatus } from "./useBuyerRequests";
import { notifyAdminTierUsers } from "@/src/lib/notifications/notifyAdminTierUsers";
import type { SupplierExtended, UpdateSupplierForm } from "@/src/types/supply-chain";
import type { Database } from "@/src/types/supabase";
import type { SPOStatus } from "./useServicePurchaseOrders";
import { toast } from "@/components/ui/use-toast";
import {
  acknowledgePurchaseOrderAction,
  dispatchPurchaseOrderAction,
} from "@/src/lib/supplier-portal/supplierPortalActions";
import type { CreateBillInput as SupplierBillInput } from "@/src/lib/supplier-bills/supplierBillTransforms";
import {
  mapSupplierBills,
  mapSupplierIndents,
  mapSupplierPurchaseOrders,
  mapSupplierServiceAcknowledgments,
  mapSupplierServiceOrders,
  type SupplierBill,
  type SupplierIndent,
  type SupplierPO,
  type SupplierServiceAcknowledgment,
  type SupplierServiceOrder,
} from "@/src/lib/supplier-portal/supplierPortalTransforms";
export type {
  SupplierBill,
  SupplierIndent,
  SupplierPO,
  SupplierServiceAcknowledgment,
  SupplierServiceOrder,
} from "@/src/lib/supplier-portal/supplierPortalTransforms";

const supabase = supabaseTyped;

export type POStatus =
  | "draft"
  | "sent_to_vendor"
  | "acknowledged"
  | "dispatched"
  | "partial_received"
  | "received"
  | "cancelled";

export interface UpdateSupplierProfileInput extends UpdateSupplierForm {
  rates?: string | null;
  availability?: string | null;
}

type SupplierPortalRpcResult = {
  success?: boolean;
  error?: string;
};

type RequestRow = Parameters<typeof mapSupplierIndents>[0][number];
type SupplierPORow = Parameters<typeof mapSupplierPurchaseOrders>[0][number];
type SupplierBillRow = Parameters<typeof mapSupplierBills>[0][number];
type SupplierServiceOrderRow = Parameters<typeof mapSupplierServiceOrders>[0][number];
type SupplierServiceAckRow = Parameters<typeof mapSupplierServiceAcknowledgments>[0][number];

function normalizeRows<T>(rows: unknown): T[] {
  return Array.isArray(rows) ? (rows as T[]) : [];
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
          // Request-state propagation is server-authoritative from purchase_bills
          .from("purchase_bills")
          .select(`
            id,
            bill_number,
            supplier_invoice_number,
            bill_date,
            total_amount,
            paid_amount,
            due_amount,
            status,
            payment_status,
            last_payment_date,
            purchase_order_id,
            service_purchase_order_id,
            document_url,
            supplier_id,
            created_at
          `)
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
      setIndents(mapSupplierIndents(normalizeRows<RequestRow>(requestResult.data)));
      setPos(mapSupplierPurchaseOrders(normalizeRows<SupplierPORow>(purchaseOrdersResult.data)));
      setBills(mapSupplierBills(normalizeRows<SupplierBillRow>(purchaseBillsResult.data)));
      setServiceOrders(
        normalizeRows<SupplierServiceOrderRow>(serviceOrdersResult.data).map((serviceOrder) => ({
          ...serviceOrder,
          site_location_id: serviceOrder.request?.site_location_id ?? null,
          site_location_name: serviceOrder.request?.site_location?.location_name ?? null,
        })) as SupplierServiceOrder[]
      );
      setServiceAcknowledgments(
        mapSupplierServiceAcknowledgments(normalizeRows<SupplierServiceAckRow>(serviceAcknowledgmentsResult.data))
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
        await notifyAdminTierUsers({
          title: "Indent Rejected by Supplier",
          body: `${targetIndent?.request_number || requestId} was rejected by the supplier${reason ? `: ${reason}` : "."}`,
          notificationType: "supplier_indent_rejected",
          referenceId: requestId,
          referenceType: "request",
        });
      } else if (targetIndent?.is_service_request === true) {
        const response = await fetch("/api/supplier/service-indent-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || "Failed to accept the service deployment request.");
        }
        await notifyAdminTierUsers({
          title: "Service Indent Accepted",
          body: `${targetIndent?.request_number || requestId} was accepted by the supplier.`,
          notificationType: "supplier_indent_accepted",
          referenceId: requestId,
          referenceType: "request",
        });
      } else {
        const { data, error } = await supabase.rpc("create_po_from_supplier_request", {
          p_request_id: requestId,
        });
        if (error) throw error;
        const rpcResult = data as SupplierPortalRpcResult | null;
        if (!rpcResult?.success) {
          throw new Error(rpcResult?.error || "Failed to create purchase order from accepted indent");
        }
        await notifyAdminTierUsers({
          title: "Indent Accepted by Supplier",
          body: `${targetIndent?.request_number || requestId} was accepted and converted into a purchase order.`,
          notificationType: "supplier_indent_accepted",
          referenceId: requestId,
          referenceType: "request",
        });
      }

      await fetchPortalData();
      return true;
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to respond to indent");
      toast({ title: "Indent Update Failed", description: message, variant: "destructive" });
      return false;
    }
  };

  const acknowledgePO = async (poId: string) => {
    return acknowledgePurchaseOrderAction({
      poId,
      refresh: fetchPortalData,
    });
  };

  const dispatchPO = async (
    poId: string,
    dispatchData: { date: string; vehicle?: string; notes?: string }
  ) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? user?.id;
    return dispatchPurchaseOrderAction({
      poId,
      dispatchData,
      userId,
      refresh: fetchPortalData,
    });
  };

  const acknowledgeServiceOrder = async (
    spoId: string,
    headcountExpected?: number,
    gradeVerified?: boolean,
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc("supplier_transition_service_po_status", {
        p_spo_id: spoId,
        p_new_status: "acknowledged",
        p_headcount_expected: headcountExpected,
        p_grade_verified: gradeVerified ?? null,
        p_notes: notes?.trim() || null,
      });
      if (error) throw error;
      const rpcResult = data as SupplierPortalRpcResult | null;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || "Failed to acknowledge service order");
      }
      await fetchPortalData();
      return true;
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to acknowledge service order");
      toast({ title: "Acknowledgment Failed", description: message, variant: "destructive" });
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

  const submitBill = async (billData: SupplierBillInput): Promise<{ success: boolean; billId?: string }> => {
    try {
      // const { bill_number: _discardedBillNumber, ...billPayload } = billData;
      const { bill_number: _discardedBillNumber, ...billPayload } = billData as SupplierBillInput & { bill_number?: string | null };

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
          throw new Error("Multiple accepted GRNs exist for this PO. Submit the bill against a specific receipt to preserve 3-way match.");
        }
        // material_receipt_id: acceptedGRNs[0].id
        material_receipt_id = acceptedGRNs[0].id;
      }

      const { data, error } = await supabase
        .from("purchase_bills")
        .insert([
          {
            ...(billPayload as Database["public"]["Tables"]["purchase_bills"]["Insert"]),
            material_receipt_id,
            status: "submitted",
            payment_status: "unpaid",
            created_by: user?.id ?? null,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      await notifyAdminTierUsers({
        title: "Supplier Bill Submitted",
        body: `A bill has been submitted for processing${billPayload.purchase_order_id ? ` against PO ${billPayload.purchase_order_id}` : ""}.`,
        notificationType: "supplier_bill_submitted",
        referenceId: data.id,
        referenceType: "purchase_bill",
      });

      await fetchPortalData();
      return { success: true, billId: data.id };
    } catch (err) {
      const message = getErrorMessage(err, "Failed to submit bill");
      toast({ title: "Bill submission failed", description: message, variant: "destructive" });
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

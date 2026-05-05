import type { RequestStatus } from "@/hooks/useBuyerRequests";
import type { Database } from "@/src/types/supabase";
import { supabase } from "@/src/lib/supabaseClient";
import { notifyAdminTierUsers } from "@/src/lib/notifications/notifyAdminTierUsers";

type SupplierPortalRpcResult = {
  success?: boolean;
  error?: string;
};

type ToastFn = (input: { title: string; description: string; variant: "destructive" }) => void;

export type SupplierPortalIndent = {
  id: string;
  request_number: string;
  is_service_request?: boolean;
};

export async function respondToIndentAction(input: {
  requestId: string;
  decision: "indent_accepted" | "indent_rejected";
  reason?: string;
  targetIndent: SupplierPortalIndent | undefined;
  refresh: () => Promise<void>;
  toast: ToastFn;
}): Promise<boolean> {
  try {
    const { requestId, decision, reason, targetIndent, refresh } = input;

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

    await refresh();
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to respond to indent";
    input.toast({
      title: "Indent Update Failed",
      description: message,
      variant: "destructive",
    });
    return false;
  }
}

export async function acknowledgePurchaseOrderAction(input: {
  poId: string;
  refresh: () => Promise<void>;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: "acknowledged",
        vendor_acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.poId);

    if (error) throw error;

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("indent_id")
      .eq("id", input.poId)
      .single();

    if (poError) throw poError;

    if (po?.indent_id) {
      await supabase
        .from("requests")
        .update({ status: "po_received" as RequestStatus, updated_at: new Date().toISOString() })
        .eq("indent_id", po.indent_id)
        .in("status", ["po_issued", "indent_accepted"]);
    }

    await notifyAdminTierUsers({
      title: "Purchase Order Acknowledged",
      body: `Purchase order ${input.poId} has been acknowledged by the supplier.`,
      notificationType: "purchase_order_acknowledged",
      referenceId: input.poId,
      referenceType: "purchase_order",
    });

    await input.refresh();
    return true;
  } catch (err) {
    console.error("Error acknowledging PO:", err);
    return false;
  }
}

export async function dispatchPurchaseOrderAction(input: {
  poId: string;
  dispatchData: { date: string; vehicle?: string; notes?: string };
  userId: string | null;
  refresh: () => Promise<void>;
}): Promise<boolean> {
  try {
    const { data: result, error: rpcError } = await supabase.rpc("transition_po_status", {
      p_po_id: input.poId,
      p_new_status: "dispatched",
      p_user_id: input.userId,
      p_vehicle_details: input.dispatchData.vehicle ?? null,
      p_dispatch_notes: input.dispatchData.notes ?? null,
      p_dispatched_at: input.dispatchData.date,
    });

    if (rpcError) throw rpcError;

    const rpcResult = result as SupplierPortalRpcResult | null;
    if (!rpcResult?.success) {
      throw new Error(rpcResult?.error || "Status transition failed");
    }

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("indent_id")
      .eq("id", input.poId)
      .single();

    if (poError) throw poError;

    if (po?.indent_id) {
      await supabase
        .from("requests")
        .update({ status: "po_dispatched" as RequestStatus, updated_at: new Date().toISOString() })
        .eq("indent_id", po.indent_id)
        .in("status", ["po_received", "po_issued"]);
    }

    await notifyAdminTierUsers({
      title: "Purchase Order Dispatched",
      body: `Purchase order ${input.poId} has been dispatched.`,
      notificationType: "purchase_order_dispatched",
      referenceId: input.poId,
      referenceType: "purchase_order",
    });

    await input.refresh();
    return true;
  } catch (err) {
    console.error("Error dispatching PO:", err);
    return false;
  }
}

export async function acknowledgeServiceOrderAction(input: {
  spoId: string;
  headcountExpected?: number;
  gradeVerified?: boolean;
  notes?: string;
  refresh: () => Promise<void>;
  toast: ToastFn;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("supplier_transition_service_po_status", {
      p_spo_id: input.spoId,
      p_new_status: "acknowledged",
      p_headcount_expected: input.headcountExpected,
      p_grade_verified: input.gradeVerified ?? null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) throw error;

    const rpcResult = data as SupplierPortalRpcResult | null;
    if (!rpcResult?.success) {
      throw new Error(rpcResult?.error || "Failed to acknowledge service order");
    }

    await input.refresh();
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to acknowledge service order";
    input.toast({
      title: "Acknowledgment Failed",
      description: message,
      variant: "destructive",
    });
    return false;
  }
}

export async function submitBillAction(input: {
  billData: Omit<Database["public"]["Tables"]["purchase_bills"]["Insert"], "bill_number"> & {
    bill_number?: string | null;
  };
  supplierId?: string | null;
  userId?: string | null;
  refresh: () => Promise<void>;
  toast: ToastFn;
}): Promise<{ success: boolean; billId?: string }> {
  try {
    const { bill_number: _discardedBillNumber, ...billPayload } = input.billData;

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
          created_by: input.userId,
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

    await input.refresh();
    return { success: true, billId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit bill";
    input.toast({ title: "Bill submission failed", description: message, variant: "destructive" });
    return { success: false };
  }
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { notifyAdminTierUsers } from "@/src/lib/notifications/notifyAdminTierUsers";
import { notifySupplierUsers } from "@/src/lib/inventory/notifySupplierUsers";
import { notifyAuthUser } from "@/src/lib/notifications/notifyAuthUser";
import {
  FORWARDABLE_INDENT_STATUSES,
  mapBuyerRequestItemRows,
  mapBuyerRequestRows,
  type BuyerRequest,
  type BuyerRequestItem,
  type BuyerRequestItemJoinRow,
  type BuyerRequestJoinRow,
  type BuyerRequestUpdateRow,
  type CreateBuyerRequestInput,
  type RequestStatus,
  type UpdateBuyerRequestInput,
} from "@/src/lib/buyer-requests/buyerRequestTransforms";

export type {
  BuyerRequest,
  BuyerRequestItem,
  CreateBuyerRequestInput,
  RequestStatus,
  UpdateBuyerRequestInput,
} from "@/src/lib/buyer-requests/buyerRequestTransforms";

export { REQUEST_STATUS_CONFIG } from "@/src/lib/buyer-requests/buyerRequestTransforms";

export type BuyerServiceDeploymentInput = {
  service_type?: string;
  service_grade?: string;
  start_date?: string;
  site_location_id?: string;
};

// ============================================
// HOOK
// ============================================

export function useBuyerRequests() {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) {
        setRequests([]);
        return;
      }

      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          product_categories (category_name),
          company_locations!location_id (location_name),
          site_location:company_locations!site_location_id (location_name)
        `)
        .eq("buyer_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData: BuyerRequest[] = mapBuyerRequestRows((data || []) as BuyerRequestJoinRow[]);

      setRequests(formattedData);
    } catch (err: unknown) {
      console.error("Error fetching requests:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRequestItems = useCallback(async (requestId: string): Promise<BuyerRequestItem[]> => {
    try {
      const { data, error } = await supabase
        .from("request_items")
        .select(`
          *,
          products (product_name)
        `)
        .eq("request_id", requestId);

      if (error) throw error;

      return mapBuyerRequestItemRows((data || []) as BuyerRequestItemJoinRow[]);
    } catch (err: unknown) {
      console.error("Error fetching request items:", err);
      return [];
    }
  }, []);

  const createRequest = async (input: CreateBuyerRequestInput) => {
    try {
      setIsLoading(true);

      // 1. Create request record
      const { data: request, error: reqError } = await supabase
        .from("requests")
        .insert({
          title: input.title,
          description: input.description,
          category_id: input.category_id,
          location_id: input.location_id,
          preferred_delivery_date: input.preferred_delivery_date,
          service_type: input.service_type || null,
          service_grade: input.service_grade || null,
          headcount: typeof input.headcount === "number" ? input.headcount : null,
          shift: input.shift || null,
          start_date: input.start_date || null,
          duration_months: typeof input.duration_months === "number" ? input.duration_months : null,
          site_location_id: input.site_location_id || null,
          is_service_request: input.is_service_request === true,
          buyer_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create items
      if (input.items.length > 0) {
        const itemsToInsert = input.items.map(item => ({
          request_id: request.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes
        }));

        const { error: itemsError } = await supabase
          .from("request_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await notifyAdminTierUsers({
        title: "New Buyer Request Submitted",
        body: `${request.request_number} has been submitted and is awaiting review.`,
        notificationType: "buyer_request_submitted",
        referenceId: request.id,
        referenceType: "request",
      });

      await fetchRequests();
      return request;
    } catch (err: unknown) {
      console.error("Error creating request:", err);
      setError(err instanceof Error ? err.message : "Failed to create request");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: RequestStatus, reason?: string) => {
    try {
      // Guard: cannot set to 'completed' without a feedback record
      if (status === "completed") {
        const { data: feedback } = await supabase
          .from("buyer_feedback")
          .select("id")
          .eq("request_id", requestId)
          .maybeSingle();
        if (!feedback) {
          setError("Feedback must be submitted before marking as completed.");
          return false;
        }
      }

      const updates: BuyerRequestUpdateRow = { status, updated_at: new Date().toISOString() };
      if (reason) {
        updates.rejection_reason = reason;
        updates.rejected_at = new Date().toISOString();
        updates.rejected_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from("requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;

      const { data: updatedRequest } = await supabase
        .from("requests")
        .select("buyer_id, request_number, status")
        .eq("id", requestId)
        .single();

      if (updatedRequest?.buyer_id) {
        const isRejected = status === "rejected";
        await notifyAuthUser({
          userId: updatedRequest.buyer_id,
          title: isRejected ? "Request Rejected" : "Request Updated",
          body: isRejected
            ? `Your request ${updatedRequest.request_number} was rejected${reason ? `: ${reason}` : "."}`
            : `Your request ${updatedRequest.request_number} status changed to ${status}.`,
          notificationType: isRejected ? "buyer_request_rejected" : "buyer_request_updated",
          priority: isRejected ? "high" : "normal",
          referenceId: requestId,
          referenceType: "request",
        });
      }

      await fetchRequests();
      return true;
    } catch (err: unknown) {
      console.error("Error updating request status:", err);
      setError(err instanceof Error ? err.message : "Failed to update request status");
      return false;
    }
  };

  const updateRequest = async (requestId: string, input: UpdateBuyerRequestInput) => {
    try {
      const updates: UpdateBuyerRequestInput = {
        ...input,
        updated_at: input.updated_at || new Date().toISOString(),
      };

      const { error } = await supabase
        .from("requests")
        .update(updates)
        .eq("id", requestId);

      if (error) throw error;
      await fetchRequests();
      return true;
    } catch (err: unknown) {
      console.error("Error updating request:", err);
      setError(err instanceof Error ? err.message : "Failed to update request");
      return false;
    }
  };

  const linkRequestToIndent = useCallback(async (
    requestId: string,
    input: {
      indent_id: string;
      supplier_id: string;
      status?: RequestStatus;
    }
  ) => {
    try {
      // 1. Pre-flight Rate Verification
      const { data: hasRate, error: rateError } = await supabase
        .rpc("validate_indent_rate", { p_indent_id: input.indent_id });

      if (rateError) {
        console.error("Rate verification failed:", rateError);
        // Fallback to manual check if RPC fails for any reason
      } else if (hasRate === false) {
        throw new Error("No active rate contract found for this indent. Please verify rates before forwarding.");
      }

      const { data: indent, error: indentError } = await supabase
        .from("indents")
        .select("id, status")
        .eq("id", input.indent_id)
        .single();

      if (indentError) throw indentError;
      if (!indent || !FORWARDABLE_INDENT_STATUSES.has(indent.status)) {
        throw new Error("Only approved indents can be forwarded to suppliers.");
      }

      const { data: request, error: requestError } = await supabase
        .from("requests")
        .select("indent_id, status")
        .eq("id", requestId)
        .single();

      if (requestError) throw requestError;
      if (request?.indent_id && request.status !== "indent_rejected") {
        throw new Error("Request is already linked to an indent.");
      }

      const { error, count } = await supabase
        .from("requests")
        .update({
          indent_id: input.indent_id,
          supplier_id: input.supplier_id,
          status: input.status || "indent_forwarded",
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq("id", requestId)
        .or("indent_id.is.null,status.eq.indent_rejected");

      if (error) throw error;
      if (count === 0) {
        throw new Error("Request is already linked to an indent.");
      }

      if (requestId) {
        const { data: linkedRequest } = await supabase
          .from("requests")
          .select("buyer_id, request_number, supplier_id")
          .eq("id", requestId)
          .single();

        if (linkedRequest?.buyer_id) {
          await notifyAuthUser({
            userId: linkedRequest.buyer_id,
            title: "Request Forwarded",
            body: `Your request ${linkedRequest.request_number} has been forwarded for supplier processing.`,
            notificationType: "buyer_request_forwarded",
            priority: "normal",
            referenceId: requestId,
            referenceType: "request",
          });
        }

        if (linkedRequest?.supplier_id) {
          await notifySupplierUsers({
            supplierId: linkedRequest.supplier_id,
            title: "Indent Forwarded",
            body: `Request ${linkedRequest.request_number} has been forwarded to you for response.`,
            notificationType: "indent_forwarded",
            referenceId: requestId,
            referenceType: "request",
          });
        }
      }

      await fetchRequests();
      return true;
    } catch (err: unknown) {
      console.error("Error linking request to indent:", err);
      setError(err instanceof Error ? err.message : "Failed to link request to indent");
      return false;
    }
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const channel = supabase
      .channel("buyer-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        fetchRequests
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const fetchRequestById = useCallback(async (requestId: string): Promise<BuyerRequest | null> => {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          product_categories (category_name),
          company_locations!location_id (location_name),
          site_location:company_locations!site_location_id (location_name)
        `)
        .eq("id", requestId)
        .single();

      if (error) throw error;

      const row = data as BuyerRequestJoinRow;
      return {
        ...row,
        category_name: row.product_categories?.category_name,
        location_name: row.company_locations?.location_name,
        site_location_name: row.site_location?.location_name,
      };
    } catch (err: unknown) {
      console.error("Error fetching request by ID:", err);
      return null;
    }
  }, []);

  return {
    requests,
    isLoading,
    error,
    refresh: fetchRequests,
    fetchRequestItems,
    fetchRequestById,
    createRequest,
    updateRequest,
    updateRequestStatus,
    linkRequestToIndent,
  };
}

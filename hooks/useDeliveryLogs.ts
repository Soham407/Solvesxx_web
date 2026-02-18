"use client";

import { useState, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

export interface LogArrivalParams {
  poId: string;
  vehicleNumber: string;
  arrivalPhotoUrl: string;
  arrivalSignatureUrl?: string;
  gateLocation?: string;
  notes?: string;
}

export interface ArrivalLog {
  id: string;
  po_id: string;
  vehicle_number: string;
  photo_url: string;
  signature_url: string | null;
  driver_name: string | null;
  logged_by: string;
  created_at: string;
  // Joined data
  logged_by_name?: string;
  po_number?: string;
  gate_location?: string;
  notes?: string;
}

export function useDeliveryLogs() {
  // FIX: Separate loading states to prevent one operation 
  // incorrectly clearing loading state of another
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logMaterialArrival = useCallback(async (params: LogArrivalParams) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabaseClient as any).rpc(
        "log_gate_entry",
        {
          p_po_id: params.poId,
          p_photo_url: params.arrivalPhotoUrl,
          p_signature_url: params.arrivalSignatureUrl || null,
          p_vehicle_number: params.vehicleNumber || null,
          p_gate_location: params.gateLocation || null,
          p_notes: params.notes || null,
        },
      );

      if (rpcError) throw rpcError;

      return data as string; // Returns the log ID
    } catch (err: any) {
      const errorMessage = err.message || "Failed to log material arrival";
      console.error("Error logging material arrival:", err);
      setError(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const getArrivalLogs = useCallback(async (poId?: string) => {
    setIsFetching(true);
    setError(null);
    try {
      let query = (supabaseClient as any)
        .from("material_arrival_evidence")
        .select(
          `
          *,
          users!logged_by (
            full_name
          ),
          purchase_orders!po_id (
            po_number
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (poId) {
        query = query.eq("po_id", poId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return (data || []).map((log: any) => ({
        ...log,
        logged_by_name: log.users?.full_name,
        po_number: log.purchase_orders?.po_number,
      })) as ArrivalLog[];
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch arrival logs";
      console.error("Error fetching arrival logs:", err);
      setError(errorMessage);
      return [];
    } finally {
      setIsFetching(false);
    }
  }, []);

  return {
    logMaterialArrival,
    getArrivalLogs,
    isLoading: isSubmitting || isFetching,
    isSubmitting,
    isFetching,
    error,
  };
}

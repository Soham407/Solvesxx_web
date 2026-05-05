"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

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

type ArrivalLogRow = {
  id: string;
  po_id: string;
  vehicle_number: string;
  photo_url: string;
  signature_url: string | null;
  driver_name: string | null;
  logged_by: string;
  created_at: string;
  users?: { full_name?: string | null } | null;
  purchase_orders?: { po_number?: string | null } | null;
  gate_location?: string | null;
  notes?: string | null;
};

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
      const { data, error: rpcError } = await supabase.rpc(
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to log material arrival";
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
      let query = supabase
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

      return ((data || []) as ArrivalLogRow[]).map((log) => ({
        id: log.id,
        po_id: log.po_id,
        vehicle_number: log.vehicle_number,
        photo_url: log.photo_url,
        signature_url: log.signature_url,
        driver_name: log.driver_name,
        logged_by: log.logged_by,
        created_at: log.created_at,
        ...log,
        logged_by_name: log.users?.full_name || undefined,
        po_number: log.purchase_orders?.po_number || undefined,
      })) as ArrivalLog[];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch arrival logs";
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

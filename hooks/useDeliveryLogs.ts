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
  arrival_photo_url: string;
  arrival_signature_url: string | null;
  logged_by: string;
  logged_at: string;
  gate_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  logged_by_name?: string;
  po_number?: string;
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
      const { data, error: rpcError } = await supabase.rpc(
        "log_material_arrival",
        {
          p_po_id: params.poId,
          p_vehicle_number: params.vehicleNumber,
          p_arrival_photo_url: params.arrivalPhotoUrl,
          p_arrival_signature_url: params.arrivalSignatureUrl || null,
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
      let query = supabase
        .from("material_arrival_logs")
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
        .order("logged_at", { ascending: false })
        .limit(50); // FIX: Add reasonable limit

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

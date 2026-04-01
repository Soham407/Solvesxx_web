"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;

export interface PestControlPPEVerification {
  id: string;
  job_session_id: string;
  technician_id: string;
  service_request_id: string;
  gloves_worn: boolean;
  mask_worn: boolean;
  goggles_worn: boolean;
  full_suit_worn: boolean;
  chemical_dilution_verified: boolean;
  resident_area_cleared: boolean;
  all_items_checked: boolean;
  verified_at: string;
  status: string;
}

export interface PPEChecklistData {
  gloves_worn: boolean;
  mask_worn: boolean;
  goggles_worn: boolean;
  full_suit_worn: boolean;
  chemical_dilution_verified: boolean;
  resident_area_cleared: boolean;
}

/**
 * Hook for managing Pest Control PPE Verifications
 */
export function usePestControlPPE(jobSessionId?: string, serviceRequestId?: string) {
  const [ppeVerification, setPpeVerification] = useState<PestControlPPEVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = useCallback(async () => {
    if (!jobSessionId && !serviceRequestId) return;

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from("pest_control_ppe_verifications").select("*");

      if (jobSessionId) {
        query = query.eq("job_session_id", jobSessionId);
      } else if (serviceRequestId) {
        query = query.eq("service_request_id", serviceRequestId).order("verified_at", { ascending: false });
      }

      const { data, error: ppeError } = await query.limit(1).maybeSingle();

      if (ppeError) throw ppeError;
      setPpeVerification(data);
    } catch (err: any) {
      console.error("Error fetching PPE verification:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobSessionId, serviceRequestId]);

  const submitPPEChecklist = useCallback(async (data: PPEChecklistData, technicianId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const allItemsChecked = 
        data.gloves_worn && 
        data.mask_worn && 
        data.goggles_worn && 
        data.full_suit_worn && 
        data.chemical_dilution_verified && 
        data.resident_area_cleared;

      const { data: result, error: ppeError } = await supabase
        .from("pest_control_ppe_verifications")
        .upsert({
          job_session_id: jobSessionId,
          service_request_id: serviceRequestId,
          technician_id: technicianId,
          ...data,
          all_items_checked: allItemsChecked,
          verified_at: new Date().toISOString(),
          status: allItemsChecked ? "verified" : "failed"
        })
        .select()
        .single();

      if (ppeError) throw ppeError;
      
      setPpeVerification(result);
      return { success: true, data: result };
    } catch (err: any) {
      console.error("Error submitting PPE checklist:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [jobSessionId, serviceRequestId]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  return {
    ppeVerification,
    isLoading,
    submitPPEChecklist,
    error,
    refresh: fetchVerification
  };
}

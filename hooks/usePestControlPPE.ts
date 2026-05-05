"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  buildPpeChecklistInsert,
  isPpeChecklistComplete,
  type PestControlPPEVerification,
  type PPEChecklistData,
} from "@/src/lib/pest-control/ppeTransforms";

export type { PestControlPPEVerification, PPEChecklistData } from "@/src/lib/pest-control/ppeTransforms";

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
    } catch (err: unknown) {
      console.error("Error fetching PPE verification:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch PPE verification");
    } finally {
      setIsLoading(false);
    }
  }, [jobSessionId, serviceRequestId]);

  const submitPPEChecklist = useCallback(async (data: PPEChecklistData, technicianId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error: ppeError } = await supabase
        .from("pest_control_ppe_verifications")
        .upsert(buildPpeChecklistInsert(data, jobSessionId ?? null, serviceRequestId ?? null, technicianId))
        .select()
        .single();

      if (ppeError) throw ppeError;
      
      setPpeVerification(result);
      return { success: true, data: result };
    } catch (err: unknown) {
      console.error("Error submitting PPE checklist:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit PPE checklist";
      setError(errorMessage);
      return { success: false, error: errorMessage };
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

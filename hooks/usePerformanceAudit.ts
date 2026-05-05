"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  mapServiceFeedbackRow,
  mapVendorScorecardRow,
  type ServiceFeedback,
  type ServiceFeedbackWithJoins,
  type VendorScorecard,
  type VendorScorecardRow,
} from "@/src/lib/performance-audit/performanceAuditTransforms";

export type {
  ServiceFeedback,
  ServiceFeedbackWithJoins,
  VendorScorecard,
  VendorScorecardRow,
} from "@/src/lib/performance-audit/performanceAuditTransforms";

interface UsePerformanceAuditState {
  feedback: ServiceFeedback[];
  scorecards: VendorScorecard[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function usePerformanceAudit() {
  const [state, setState] = useState<UsePerformanceAuditState>({
    feedback: [],
    scorecards: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch Feedback with Residents and Service Request details
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("service_feedback")
        .select(`
          *,
          residents (full_name, flat_no),
          service_requests (
            service_id,
            services (service_name, service_category)
          )
        `)
        .order("created_at", { ascending: false });

      if (feedbackError) throw feedbackError;

      const formattedFeedback: ServiceFeedback[] = ((feedbackData as ServiceFeedbackWithJoins[] | null) ?? []).map(mapServiceFeedbackRow);

      // Fetch Vendor Scorecards (from View)
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from("vendor_scorecards")
        .select("*")
        .order("average_rating", { ascending: false });

      if (scorecardsError) throw scorecardsError;

      const formattedScorecards: VendorScorecard[] = ((scorecardsData as VendorScorecardRow[] | null) ?? []).map(mapVendorScorecardRow);

      setState({
        feedback: formattedFeedback,
        scorecards: formattedScorecards,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error("Error fetching performance audit:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch audit data";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}

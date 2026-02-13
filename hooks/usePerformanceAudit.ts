"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface ServiceFeedback {
  id: string;
  service_request_id: string;
  society_id: string;
  resident_id: string;
  score: number;
  comments: string;
  photo_url: string | null;
  created_at: string;
  
  // Joined Data
  resident_name?: string;
  flat_no?: string;
  service_category?: string;
  service_name?: string;
}

export interface VendorScorecard {
  supplier_id: string;
  supplier_name: string;
  service_type: string;
  total_feedbacks: number;
  average_rating: number;
  critical_feedbacks: number;
  performance_status: "Incentivize" | "Warning" | "Standard";
}

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

      const formattedFeedback: ServiceFeedback[] = (feedbackData || []).map((fb: any) => ({
        ...fb,
        resident_name: fb.residents?.full_name || "Unknown Resident",
        flat_no: fb.residents?.flat_no || "N/A",
        service_name: fb.service_requests?.services?.service_name || "Unknown Service",
        service_category: fb.service_requests?.services?.service_category || "General"
      }));

      // Fetch Vendor Scorecards (from View)
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from("vendor_scorecards")
        .select("*")
        .order("average_rating", { ascending: false });

      if (scorecardsError) throw scorecardsError;

      setState({
        feedback: formattedFeedback,
        scorecards: scorecardsData || [],
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching performance audit:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch audit data",
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

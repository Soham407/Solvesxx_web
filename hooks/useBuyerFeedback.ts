"use client";

import { useState, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;
import { useToast } from "@/components/ui/use-toast";

export interface BuyerFeedback {
  id: string;
  request_id: string;
  overall_rating: number;
  quality_rating: number | null;
  delivery_rating: number | null;
  professionalism_rating: number | null;
  would_recommend: boolean;
  comments: string | null;
  submitted_by: string | null;
  created_at: string;
}

export interface SubmitFeedbackDTO {
  requestId?: string;
  serviceRequestId?: string;
  overall_rating: number;
  quality_rating?: number;
  delivery_rating?: number;
  professionalism_rating?: number;
  would_recommend: boolean;
  comments?: string;
}

export function useBuyerFeedback() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useCallback(async (dto: SubmitFeedbackDTO) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert feedback record
      const { error: insertError } = await supabase
        .from("buyer_feedback")
        .insert({
          request_id: dto.requestId || null,
          service_request_id: dto.serviceRequestId || null,
          overall_rating: dto.overall_rating,
          quality_rating: dto.quality_rating || null,
          delivery_rating: dto.delivery_rating || null,
          professionalism_rating: dto.professionalism_rating || null,
          would_recommend: dto.would_recommend,
          comments: dto.comments || null,
          submitted_by: user?.id,
        });

      if (insertError) throw insertError;

      // Update request status to 'completed' for regular requests only
      if (dto.requestId) {
        const { error: updateError } = await supabase
          .from("requests")
          .update({ status: "completed" })
          .eq("id", dto.requestId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const getFeedbackForRequest = useCallback(async (requestId: string): Promise<BuyerFeedback | null> => {
    const { data } = await supabase
      .from("buyer_feedback")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();
    return data || null;
  }, []);

  const getFeedbackForServiceRequest = useCallback(async (serviceRequestId: string): Promise<BuyerFeedback | null> => {
    const { data } = await supabase
      .from("buyer_feedback")
      .select("*")
      .eq("service_request_id", serviceRequestId)
      .maybeSingle();
    return data || null;
  }, []);

  return { isSubmitting, submitFeedback, getFeedbackForRequest, getFeedbackForServiceRequest };
}

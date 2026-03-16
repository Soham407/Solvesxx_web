// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export type BGVType = "police" | "address" | "education" | "employment";
export type BGVStatus = "pending" | "in_progress" | "verified" | "rejected";

export interface BackgroundVerification {
  id: string;
  candidate_id: string | null;
  employee_id: string | null;
  verification_type: BGVType;
  verification_agency: string | null;
  initiated_date: string;
  completed_date: string | null;
  status: BGVStatus;
  verification_document_url: string | null;
  remarks: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export const BGV_TYPE_CONFIG: Record<BGVType, { label: string; description: string }> = {
  police: { label: "Police Verification", description: "Local police station clearance" },
  address: { label: "Address Verification", description: "Permanent & current address check" },
  education: { label: "Education Verification", description: "Academic credential validation" },
  employment: { label: "Employment Verification", description: "Previous employer cross-check" },
};

export const BGV_STATUS_CONFIG: Record<BGVStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted/50 text-muted-foreground border-border" },
  in_progress: { label: "In Progress", className: "bg-warning/10 text-warning border-warning/20" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

export function useBackgroundVerifications(candidateId?: string) {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<BackgroundVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVerifications = useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("background_verifications")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setVerifications(data || []);
    } catch (err) {
      console.error("BGV fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  const initiateVerification = async (candidateId: string, type: BGVType, agency?: string) => {
    try {
      const { error } = await supabase
        .from("background_verifications")
        .insert({
          candidate_id: candidateId,
          verification_type: type,
          verification_agency: agency || null,
          status: "in_progress",
          initiated_date: new Date().toISOString().split("T")[0],
        });

      if (error) throw error;
      toast({ title: "BGV Initiated", description: `${BGV_TYPE_CONFIG[type].label} started.` });
      fetchVerifications();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate BGV";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const updateStatus = async (id: string, status: BGVStatus, remarks?: string) => {
    try {
      const { error } = await supabase
        .from("background_verifications")
        .update({
          status,
          remarks: remarks || null,
          completed_date: ["verified", "rejected"].includes(status)
            ? new Date().toISOString().split("T")[0]
            : null,
        })
        .eq("id", id);

      if (error) throw error;
      toast({
        title: status === "verified" ? "BGV Verified" : "BGV Updated",
        description: `Status changed to ${status}.`,
      });
      fetchVerifications();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update BGV";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const uploadDocument = async (id: string, file: File) => {
    try {
      const path = `bgv/${id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("background_verifications")
        .update({ verification_document_url: publicUrl })
        .eq("id", id);

      if (updateError) throw updateError;

      toast({ title: "Document Uploaded", description: "BGV report attached." });
      fetchVerifications();
      return { success: true, url: publicUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  // Computed: all 4 types verified = candidate can proceed to 'offered'
  const allVerified = verifications.length === 4 &&
    verifications.every((v) => v.status === "verified");

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  return {
    verifications,
    isLoading,
    allVerified,
    initiateVerification,
    updateStatus,
    uploadDocument,
    refresh: fetchVerifications,
  };
}

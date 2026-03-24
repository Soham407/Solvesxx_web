"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type CandidateStatus = 
  | "screening" 
  | "interviewing" 
  | "background_check" 
  | "offered" 
  | "hired" 
  | "rejected";

export interface Candidate {
  id: string;
  candidate_code: string;
  
  // Personal Info
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  
  // Address
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  
  // Application
  applied_position: string;
  designation_id: string | null;
  department: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  resume_url: string | null;
  
  // Status
  status: CandidateStatus;
  status_changed_at: string | null;
  
  // Interview
  interview_date: string | null;
  interview_notes: string | null;
  interview_rating: number | null;
  interviewer_id: string | null;
  
  // BGV
  bgv_initiated_at: string | null;
  bgv_completed_at: string | null;
  bgv_status: string | null;
  bgv_notes: string | null;
  
  // Offer
  offered_salary: number | null;
  offer_date: string | null;
  offer_accepted_at: string | null;
  joining_date: string | null;
  
  // Rejection
  rejection_reason: string | null;
  
  // Conversion
  converted_employee_id: string | null;
  converted_at: string | null;
  
  // Source
  source: string | null;
  referred_by: string | null;
  
  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed
  full_name?: string;
}

export interface CreateCandidateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  applied_position: string;
  date_of_birth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  designation_id?: string | null;
  department?: string | null;
  expected_salary?: number | null;
  notice_period_days?: number | null;
  resume_url?: string | null;
  source?: string | null;
  referred_by?: string | null;
  notes?: string | null;
}

export interface UpdateCandidateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  applied_position?: string;
  date_of_birth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  designation_id?: string | null;
  department?: string | null;
  expected_salary?: number | null;
  notice_period_days?: number | null;
  resume_url?: string | null;
  interview_date?: string | null;
  interview_notes?: string | null;
  interview_rating?: number | null;
  interviewer_id?: string | null;
  offered_salary?: number | null;
  offer_date?: string | null;
  joining_date?: string | null;
  source?: string | null;
  referred_by?: string | null;
  notes?: string | null;
}

interface UseCandidatesState {
  candidates: Candidate[];
  isLoading: boolean;
  error: string | null;
}

interface UseCandidatesFilters {
  status?: CandidateStatus;
  department?: string;
  search?: string;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  screening: ["interviewing", "rejected"],
  interviewing: ["background_check", "rejected"],
  background_check: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  hired: [], // Terminal state
  rejected: [], // Terminal state (could allow reconsideration in future)
};

// ============================================
// HOOK
// ============================================

export function useCandidates(initialFilters?: UseCandidatesFilters) {
  const [state, setState] = useState<UseCandidatesState>({
    candidates: [],
    isLoading: true,
    error: null,
  });
  const [filters, setFilters] = useState<UseCandidatesFilters>(initialFilters || {});

  // ============================================
  // FETCH CANDIDATES
  // ============================================
  const fetchCandidates = useCallback(async (filterOverrides?: UseCandidatesFilters) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const activeFilters = { ...filters, ...filterOverrides };

      let query = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (activeFilters.status) {
        query = query.eq("status", activeFilters.status);
      }
      if (activeFilters.department) {
        query = query.eq("department", activeFilters.department);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include full_name
      const candidatesWithFullName: Candidate[] = (data || []).map((c: any) => ({
        ...c,
        full_name: [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Unknown",
      }));

      // Apply client-side search filter if provided
      let filteredCandidates = candidatesWithFullName;
      if (activeFilters.search) {
        const searchLower = activeFilters.search.toLowerCase();
        filteredCandidates = candidatesWithFullName.filter(
          (c) =>
            c.full_name?.toLowerCase().includes(searchLower) ||
            c.email.toLowerCase().includes(searchLower) ||
            c.applied_position.toLowerCase().includes(searchLower) ||
            c.candidate_code.toLowerCase().includes(searchLower)
        );
      }

      setState({
        candidates: filteredCandidates,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch candidates";
      console.error("Error fetching candidates:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters]);

  // ============================================
  // CREATE CANDIDATE
  // ============================================
  const createCandidate = useCallback(async (input: CreateCandidateInput): Promise<Candidate | null> => {
    try {
      const { data, error } = await supabase
        .from("candidates")
        .insert({
          ...input,
          status: "screening", // Default status
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchCandidates();

      return {
        ...data,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
      } as Candidate;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create candidate";
      console.error("Error creating candidate:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchCandidates]);

  // ============================================
  // UPDATE CANDIDATE
  // ============================================
  const updateCandidate = useCallback(async (
    id: string,
    input: UpdateCandidateInput
  ): Promise<Candidate | null> => {
    try {
      const { data, error } = await supabase
        .from("candidates")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchCandidates();

      return {
        ...data,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
      } as Candidate;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update candidate";
      console.error("Error updating candidate:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchCandidates]);

  // ============================================
  // DELETE CANDIDATE
  // ============================================
  const deleteCandidate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setState((prev) => ({
        ...prev,
        candidates: prev.candidates.filter((c) => c.id !== id),
      }));

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete candidate";
      console.error("Error deleting candidate:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  // ============================================
  // UPDATE CANDIDATE STATUS
  // ============================================
  const updateCandidateStatus = useCallback(async (
    id: string,
    newStatus: CandidateStatus,
    additionalData?: {
      rejection_reason?: string;
      bgv_notes?: string;
      interview_notes?: string;
      offered_salary?: number;
    }
  ): Promise<Candidate | null> => {
    try {
      // Get current candidate to validate transition
      const candidate = state.candidates.find((c) => c.id === id);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      // Validate status transition
      const allowedTransitions = STATUS_TRANSITIONS[candidate.status];
      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from '${candidate.status}' to '${newStatus}'. ` +
          `Allowed transitions: ${allowedTransitions.join(", ") || "none"}`
        );
      }

      // Build update payload
      const updatePayload: Record<string, any> = {
        status: newStatus,
        status_changed_at: new Date().toISOString(),
        ...additionalData,
      };

      // Add status-specific timestamps
      if (newStatus === "background_check" && !candidate.bgv_initiated_at) {
        updatePayload.bgv_initiated_at = new Date().toISOString();
      }
      if (newStatus === "offered" && candidate.status === "background_check") {
        updatePayload.bgv_completed_at = new Date().toISOString();
        updatePayload.bgv_status = "cleared";
      }
      if (newStatus === "rejected" && candidate.status === "background_check") {
        updatePayload.bgv_completed_at = new Date().toISOString();
        updatePayload.bgv_status = "flagged";
      }

      const { data, error } = await supabase
        .from("candidates")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchCandidates();

      return {
        ...data,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
      } as Candidate;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update candidate status";
      console.error("Error updating candidate status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.candidates, fetchCandidates]);

  // ============================================
  // CONVERT TO EMPLOYEE
  // ============================================
  const convertToEmployee = useCallback(async (
    candidateId: string,
    employeeData: {
      employee_code: string;
      date_of_joining: string;
      designation_id?: string;
      department?: string;
      reporting_to?: string;
    }
  ): Promise<{ candidate: Candidate; employeeId: string } | null> => {
    try {
      // Get candidate
      const candidate = state.candidates.find((c) => c.id === candidateId);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      if (candidate.status !== "offered") {
        throw new Error("Only candidates with 'offered' status can be converted to employees");
      }

      // Create employee record
      const { data: newEmployee, error: empError } = await supabase
        .from("employees")
        .insert({
          employee_code: employeeData.employee_code,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          email: candidate.email,
          phone: candidate.phone,
          date_of_birth: candidate.date_of_birth,
          date_of_joining: employeeData.date_of_joining,
          designation_id: employeeData.designation_id || candidate.designation_id,
          department: employeeData.department || candidate.department,
          reporting_to: employeeData.reporting_to,
          address: candidate.address,
          city: candidate.city,
          state: candidate.state,
          pincode: candidate.pincode,
          is_active: true,
        })
        .select()
        .single();

      if (empError) throw empError;

      // Update candidate status to hired and link to employee
      const { data: updatedCandidate, error: candError } = await supabase
        .from("candidates")
        .update({
          status: "hired",
          status_changed_at: new Date().toISOString(),
          converted_employee_id: newEmployee.id,
          converted_at: new Date().toISOString(),
          offer_accepted_at: candidate.offer_accepted_at || new Date().toISOString(),
          joining_date: employeeData.date_of_joining,
        })
        .eq("id", candidateId)
        .select()
        .single();

      if (candError) throw candError;

      // Refresh list
      await fetchCandidates();

      return {
        candidate: {
          ...updatedCandidate,
          full_name: [updatedCandidate.first_name, updatedCandidate.last_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
        } as Candidate,
        employeeId: newEmployee.id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to convert candidate to employee";
      console.error("Error converting candidate:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.candidates, fetchCandidates]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getCandidateById = useCallback(
    (id: string): Candidate | undefined => {
      return state.candidates.find((c) => c.id === id);
    },
    [state.candidates]
  );

  const getCandidateName = useCallback(
    (id: string | null): string => {
      if (!id) return "Unknown";
      const candidate = state.candidates.find((c) => c.id === id);
      return candidate?.full_name || "Unknown";
    },
    [state.candidates]
  );

  const getStatusStats = useCallback((): Record<CandidateStatus, number> => {
    const stats: Record<CandidateStatus, number> = {
      screening: 0,
      interviewing: 0,
      background_check: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
    };

    state.candidates.forEach((c) => {
      if (c.status in stats) {
        stats[c.status]++;
      }
    });

    return stats;
  }, [state.candidates]);

  const canTransitionTo = useCallback(
    (candidateId: string, targetStatus: CandidateStatus): boolean => {
      const candidate = state.candidates.find((c) => c.id === candidateId);
      if (!candidate) return false;
      return STATUS_TRANSITIONS[candidate.status].includes(targetStatus);
    },
    [state.candidates]
  );

  const refresh = useCallback(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // ============================================
  // SCHEDULE INTERVIEW
  // ============================================
  const scheduleInterview = useCallback(async (
    candidateId: string,
    interviewData: {
      interview_date: string;
      interviewer_id?: string;
      interview_notes?: string;
      interview_round?: number;
      interview_type?: 'phone' | 'video' | 'in_person' | 'technical' | 'hr';
    }
  ): Promise<Candidate | null> => {
    try {
      // Get current candidate to validate
      const candidate = state.candidates.find((c) => c.id === candidateId);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      // Candidate must be in screening or interviewing status to schedule interview
      if (!["screening", "interviewing"].includes(candidate.status)) {
        throw new Error(
          `Cannot schedule interview for candidate in '${candidate.status}' status. ` +
          `Candidate must be in 'screening' or 'interviewing' status.`
        );
      }

      // Build update payload
      const updatePayload: Record<string, any> = {
        interview_date: interviewData.interview_date,
        interview_notes: interviewData.interview_notes || candidate.interview_notes,
      };

      if (interviewData.interviewer_id) {
        updatePayload.interviewer_id = interviewData.interviewer_id;
      }

      // If scheduling first interview and candidate is in screening, move to interviewing
      if (candidate.status === "screening") {
        updatePayload.status = "interviewing";
        updatePayload.status_changed_at = new Date().toISOString();
      }

      // If using candidate_interviews table for multi-round tracking, also insert there
      if (interviewData.interview_round !== undefined) {
        const { error: interviewError } = await supabase
          .from("candidate_interviews")
          .insert({
            candidate_id: candidateId,
            round_number: interviewData.interview_round,
            interview_type: interviewData.interview_type || 'in_person',
            scheduled_at: interviewData.interview_date,
            interviewer_id: interviewData.interviewer_id,
            notes: interviewData.interview_notes,
            status: 'scheduled',
          });

        if (interviewError) {
          console.warn("Could not create interview record:", interviewError);
          // Continue - main candidate update still valid
        }
      }

      const { data, error } = await supabase
        .from("candidates")
        .update(updatePayload)
        .eq("id", candidateId)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchCandidates();

      return {
        ...data,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
      } as Candidate;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to schedule interview";
      console.error("Error scheduling interview:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.candidates, fetchCandidates]);

  // ============================================
  // EFFECT: Initial fetch
  // ============================================
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    candidates: state.candidates,
    isLoading: state.isLoading,
    error: state.error,

    // CRUD
    fetchCandidates,
    createCandidate,
    updateCandidate,
    deleteCandidate,

    // Status Management
    // Status Management
    updateCandidateStatus,
    uploadBGVDocument: async (file: File, candidateId: string): Promise<string | null> => {
      try {
        const supabaseAny = supabase as any;

        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
          throw new Error('Only PDF, JPEG, and PNG files are allowed');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size must be under 5MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${candidateId}_bgv_${Date.now()}.${fileExt}`;
        const filePath = `candidates/${candidateId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('staff-compliance-docs')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const verificationTypes = ["police", "address", "education", "employment"] as const;
        const { data: existingVerifications, error: fetchError } = await supabaseAny
          .from("background_verifications")
          .select("id, verification_type")
          .eq("candidate_id", candidateId)
          .in("verification_type", [...verificationTypes]);

        if (fetchError) throw fetchError;

        const existingByType = new Map(
          (existingVerifications || []).map((verification: any) => [
            verification.verification_type,
            verification.id,
          ])
        );

        const missingTypes = verificationTypes.filter((type) => !existingByType.has(type));
        if (missingTypes.length > 0) {
          const { error: insertError } = await supabaseAny
            .from("background_verifications")
            .insert(
              missingTypes.map((type) => ({
                candidate_id: candidateId,
                verification_type: type,
                initiated_date: new Date().toISOString().split("T")[0],
                status: "in_progress",
                verification_document_url: filePath,
              }))
            );

          if (insertError) throw insertError;
        }

        const existingIds = [...existingByType.values()];
        if (existingIds.length > 0) {
          const { error: updateError } = await supabaseAny
            .from("background_verifications")
            .update({ verification_document_url: filePath })
            .in("id", existingIds);

          if (updateError) throw updateError;
        }

        return filePath;
      } catch (err: unknown) {
        console.error("Error uploading BGV document:", err);
        return null;
      }
    },
    convertToEmployee,
    canTransitionTo,
    scheduleInterview,

    // Helpers
    getCandidateById,
    getCandidateName,
    getStatusStats,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh,
  };
}

export default useCandidates;

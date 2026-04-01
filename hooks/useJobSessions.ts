"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;
import type {
  JobSession,
  JobSessionInsert,
  JobSessionUpdate,
  JobSessionWithPhotos,
  StartJobSessionForm,
  CompleteJobSessionForm,
} from "@/src/types/operations";

interface UseJobSessionsState {
  sessions: JobSessionWithPhotos[];
  activeSession: JobSessionWithPhotos | null;
  isLoading: boolean;
  error: string | null;
}

interface UseJobSessionsReturn extends UseJobSessionsState {
  startSession: (data: StartJobSessionForm) => Promise<{ success: boolean; error?: string; data?: JobSession }>;
  pauseSession: (id: string) => Promise<{ success: boolean; error?: string }>;
  resumeSession: (id: string) => Promise<{ success: boolean; error?: string }>;
  completeSession: (id: string, data: CompleteJobSessionForm) => Promise<{ success: boolean; error?: string }>;
  cancelSession: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  completeJob: (id: string, data: CompleteJobSessionForm) => Promise<{ success: boolean; error?: string }>;
  getSessionById: (id: string) => Promise<JobSessionWithPhotos | null>;
  getSessionsByRequest: (serviceRequestId: string) => Promise<JobSessionWithPhotos[]>;
  getSessionsByTechnician: (technicianId: string) => Promise<JobSessionWithPhotos[]>;
  refresh: () => void;
}

/**
 * Hook for managing job sessions (work execution tracking)
 */
export function useJobSessions(serviceRequestId?: string, technicianId?: string): UseJobSessionsReturn {
  const [state, setState] = useState<UseJobSessionsState>({
    sessions: [],
    activeSession: null,
    isLoading: true,
    error: null,
  });

  // Fetch sessions with photos
  const fetchSessions = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("job_sessions")
        .select(`
          *,
          job_photos (*),
          service_request:service_requests (
            *,
            location:company_locations (location_name)
          )
        `);

      if (serviceRequestId) {
        query = query.eq("service_request_id", serviceRequestId);
      }
      if (technicianId) {
        query = query.eq("technician_id", technicianId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const sessionsWithPhotos: JobSessionWithPhotos[] = (data || []).map((session) => ({
        ...session,
        photos: session.job_photos || [],
        service_request: session.service_request ? {
          ...session.service_request,
          location: session.service_request.location || undefined
        } : undefined,
      }));

      // Find active session (started but not completed)
      const active = sessionsWithPhotos.find(
        (s) => s.status === "started" || s.status === "paused"
      );

      setState({
        sessions: sessionsWithPhotos,
        activeSession: active || null,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch sessions";
      console.error("Error fetching job sessions:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [serviceRequestId, technicianId]);

  const getSessionRecord = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("job_sessions")
      .select("id, service_request_id, status, start_latitude, start_longitude")
      .eq("id", id)
      .single();

    if (error) throw error;

    return data;
  }, []);

  const getActiveSessionForRequest = useCallback(async (requestId: string) => {
    const { data, error } = await supabase
      .from("job_sessions")
      .select("*")
      .eq("service_request_id", requestId)
      .in("status", ["started", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  }, []);

  const getLatestPhotoUrl = useCallback(async (jobSessionId: string, photoType: "before" | "after") => {
    const { data, error } = await supabase
      .from("job_photos")
      .select("photo_url")
      .eq("job_session_id", jobSessionId)
      .eq("photo_type", photoType)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data?.photo_url || null;
  }, []);

  // Start a new job session
  const startSession = useCallback(
    async (data: StartJobSessionForm): Promise<{ success: boolean; error?: string; data?: JobSession }> => {
      try {
        // Enforce the pre-job PPE gate for pest-control work using the
        // live `service_requests_with_details` view and the dedicated
        // `pest_control_ppe_verifications` table.
        const { data: serviceRequest, error: serviceError } = await supabase
          .from("service_requests_with_details")
          .select("service_name, service_code")
          .eq("id", data.serviceRequestId)
          .maybeSingle();

        if (serviceError) throw serviceError;

        const serviceName = String(serviceRequest?.service_name || "").toLowerCase();
        const serviceCode = String(serviceRequest?.service_code || "");
        const isPestControlJob =
          serviceCode === "PST-CON" ||
          serviceName.includes("pest control") ||
          serviceName.includes("pest") ||
          serviceName.includes("pst-con");

        if (isPestControlJob) {
          const { data: ppeVerifications, error: ppeError } = await supabase
            .from("pest_control_ppe_verifications")
            .select("id")
            .eq("service_request_id", data.serviceRequestId)
            .eq("technician_id", data.technicianId)
            .eq("all_items_checked", true)
            .order("verified_at", { ascending: false })
            .limit(1);

          if (ppeError) throw ppeError;

          if (!ppeVerifications?.length) {
            return {
              success: false,
              error: "PPE checklist must be completed before starting this job",
            };
          }
        }

        const { error: startError } = await supabase.rpc("start_service_task", {
          p_request_id: data.serviceRequestId,
          p_before_photo_url: null,
        });

        if (startError) throw startError;

        let session = await getActiveSessionForRequest(data.serviceRequestId);

        if (!session) {
          const sessionData: JobSessionInsert = {
            service_request_id: data.serviceRequestId,
            technician_id: data.technicianId,
            start_time: new Date().toISOString(),
            start_latitude: data.startLatitude,
            start_longitude: data.startLongitude,
            status: "started",
          };

          const { data: newSession, error: sessionError } = await supabase
            .from("job_sessions")
            .insert(sessionData)
            .select()
            .single();

          if (sessionError) throw sessionError;
          session = newSession;
        } else if (
          data.startLatitude !== undefined ||
          data.startLongitude !== undefined ||
          session.status !== "started"
        ) {
          const { data: updatedSession, error: updateError } = await supabase
            .from("job_sessions")
            .update({
              status: "started",
              start_latitude: data.startLatitude ?? session.start_latitude,
              start_longitude: data.startLongitude ?? session.start_longitude,
            })
            .eq("id", session.id)
            .select()
            .single();

          if (updateError) throw updateError;
          session = updatedSession;
        }

        fetchSessions();

        return { success: true, data: session || undefined };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start session";
        console.error("Error starting job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, getActiveSessionForRequest]
  );

  // Pause session
  const pauseSession = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const session = await getSessionRecord(id);

        const { error } = await supabase
          .from("job_sessions")
          .update({ status: "paused" })
          .eq("id", id);

        if (error) throw error;

        await supabase
          .from("service_requests")
          .update({ status: "on_hold" })
          .eq("id", session.service_request_id);

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to pause session";
        console.error("Error pausing job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, getSessionRecord]
  );

  // Resume session
  const resumeSession = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const session = await getSessionRecord(id);

        const { error } = await supabase
          .from("job_sessions")
          .update({ status: "started" })
          .eq("id", id);

        if (error) throw error;

        await supabase
          .from("service_requests")
          .update({ status: "in_progress" })
          .eq("id", session.service_request_id);

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to resume session";
        console.error("Error resuming job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, getSessionRecord]
  );

  // Complete session
  const completeSession = useCallback(
    async (id: string, data: CompleteJobSessionForm): Promise<{ success: boolean; error?: string }> => {
      try {
        const session = await getSessionRecord(id);
        
        // Enforce PPE verification for pest control jobs
        const { data: serviceRequest } = await supabase
          .from("service_requests_with_details")
          .select("service_name, service_code")
          .eq("id", session.service_request_id)
          .maybeSingle();

        const serviceName = String(serviceRequest?.service_name || "").toLowerCase();
        const serviceCode = String(serviceRequest?.service_code || "");
        const isPestControlJob =
          serviceCode === "PST-CON" ||
          serviceName.includes("pest control") ||
          serviceName.includes("pest") ||
          serviceName.includes("pst-con");

        if (isPestControlJob) {
          const { data: ppeVerifications, error: ppeError } = await supabase
            .from("pest_control_ppe_verifications")
            .select("id, all_items_checked")
            .eq("job_session_id", id)
            .eq("all_items_checked", true)
            .maybeSingle();

          if (ppeError) throw ppeError;

          if (!ppeVerifications) {
            return {
              success: false,
              error: "PPE verification required before completing pest control job",
            };
          }
        }

        let afterPhotoUrl = data.afterPhotoUrl || (await getLatestPhotoUrl(id, "after"));

        if (!afterPhotoUrl) {
          return {
            success: false,
            error: "After photo evidence is required before completing a session",
          };
        }

        if (data.afterPhotoUrl) {
          const existingAfterPhoto = await getLatestPhotoUrl(id, "after");

          if (existingAfterPhoto !== data.afterPhotoUrl) {
            const { error: photoError } = await supabase.from("job_photos").insert({
              job_session_id: id,
              photo_type: "after",
              photo_url: data.afterPhotoUrl,
              captured_at: new Date().toISOString(),
            });

            if (photoError) throw photoError;
            afterPhotoUrl = data.afterPhotoUrl;
          }
        }

        const { error: completeError } = await supabase.rpc("complete_service_task", {
          p_request_id: session.service_request_id,
          p_after_photo_url: afterPhotoUrl,
          p_completion_notes: data.remarks || data.workPerformed || null,
        });

        if (completeError) throw completeError;

        const updateData: JobSessionUpdate = {
          status: "completed",
          end_time: new Date().toISOString(),
          work_performed: data.workPerformed,
          remarks: data.remarks,
          end_latitude: data.endLatitude,
          end_longitude: data.endLongitude,
        };

        const { error } = await supabase
          .from("job_sessions")
          .update(updateData)
          .eq("id", id);

        if (error) throw error;

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to complete session";
        console.error("Error completing job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, getLatestPhotoUrl, getSessionRecord]
  );

  // Cancel session
  const cancelSession = useCallback(
    async (id: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("job_sessions")
          .update({
            status: "cancelled",
            end_time: new Date().toISOString(),
            remarks: reason,
          })
          .eq("id", id);

        if (error) throw error;

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to cancel session";
        console.error("Error cancelling job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions]
  );

  // Get session by ID
  const getSessionById = useCallback(
    async (id: string): Promise<JobSessionWithPhotos | null> => {
      try {
        const { data, error } = await supabase
          .from("job_sessions")
          .select(`
            *,
            job_photos (*)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        return {
          ...data,
          photos: data.job_photos || [],
        };
      } catch (err: unknown) {
        console.error("Error fetching session by ID:", err);
        return null;
      }
    },
    []
  );

  // Get sessions by service request
  const getSessionsByRequest = useCallback(
    async (serviceRequestId: string): Promise<JobSessionWithPhotos[]> => {
      try {
        const { data, error } = await supabase
          .from("job_sessions")
          .select(`
            *,
            job_photos (*)
          `)
          .eq("service_request_id", serviceRequestId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map((session) => ({
          ...session,
          photos: session.job_photos || [],
        }));
      } catch (err: unknown) {
        console.error("Error fetching sessions by request:", err);
        return [];
      }
    },
    []
  );

  // Get sessions by technician
  const getSessionsByTechnician = useCallback(
    async (technicianId: string): Promise<JobSessionWithPhotos[]> => {
      try {
        const { data, error } = await supabase
          .from("job_sessions")
          .select(`
            *,
            job_photos (*)
          `)
          .eq("technician_id", technicianId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map((session) => ({
          ...session,
          photos: session.job_photos || [],
        }));
      } catch (err: unknown) {
        console.error("Error fetching sessions by technician:", err);
        return [];
      }
    },
    []
  );

  // Refresh
  const refresh = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Alias completeSession as completeJob to match PRD/task terminology
  const completeJob = completeSession;

  // Initialize on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    ...state,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    completeJob,
    getSessionById,
    getSessionsByRequest,
    getSessionsByTechnician,
    refresh,
  };
}

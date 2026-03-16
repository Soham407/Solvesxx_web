"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  JobSession,
  JobSessionInsert,
  JobSessionUpdate,
  JobPhoto,
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

  // Start a new job session
  const startSession = useCallback(
    async (data: StartJobSessionForm): Promise<{ success: boolean; error?: string; data?: JobSession }> => {
      try {
        const sessionData: JobSessionInsert = {
          service_request_id: data.serviceRequestId,
          technician_id: data.technicianId,
          start_time: new Date().toISOString(),
          start_latitude: data.startLatitude,
          start_longitude: data.startLongitude,
          status: "started",
        };

        const { data: newSession, error } = await supabase
          .from("job_sessions")
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;

        // Update service request status to in_progress
        await supabase
          .from("service_requests")
          .update({ status: "in_progress" })
          .eq("id", data.serviceRequestId);

        fetchSessions();

        return { success: true, data: newSession };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start session";
        console.error("Error starting job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions]
  );

  // Pause session
  const pauseSession = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("job_sessions")
          .update({ status: "paused" })
          .eq("id", id);

        if (error) throw error;

        // Update service request status to on_hold
        const session = state.sessions.find((s) => s.id === id);
        if (session) {
          await supabase
            .from("service_requests")
            .update({ status: "on_hold" })
            .eq("id", session.service_request_id);
        }

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to pause session";
        console.error("Error pausing job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, state.sessions]
  );

  // Resume session
  const resumeSession = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("job_sessions")
          .update({ status: "started" })
          .eq("id", id);

        if (error) throw error;

        // Update service request status back to in_progress
        const session = state.sessions.find((s) => s.id === id);
        if (session) {
          await supabase
            .from("service_requests")
            .update({ status: "in_progress" })
            .eq("id", session.service_request_id);
        }

        fetchSessions();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to resume session";
        console.error("Error resuming job session:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchSessions, state.sessions]
  );

  // Complete session
  const completeSession = useCallback(
    async (id: string, data: CompleteJobSessionForm): Promise<{ success: boolean; error?: string }> => {
      try {
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
    [fetchSessions]
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
    getSessionById,
    getSessionsByRequest,
    getSessionsByTechnician,
    refresh,
  };
}

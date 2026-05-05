"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabaseClient";
import {
  ApprovalResultRow,
  mapPendingVisitorRows,
  mapResidentRow,
  normalizePresenceMembers,
  type PendingVisitorRow,
  type ResidentDetails,
  type ResidentPendingVisitor,
  type ResidentPresenceMember,
  type ResidentRow,
  type ResidentVisitorRow,
} from "@/src/lib/resident/residentTransforms";

interface Visitor extends ResidentVisitorRow {}

export type { ResidentPendingVisitor } from "@/src/lib/resident/residentTransforms";

interface ResidentState {
  resident: ResidentDetails | null;
  visitors: Visitor[];
  pendingApprovals: ResidentPendingVisitor[];
  activeResidents: ResidentPresenceMember[];
  isLoading: boolean;
  isLoadingVisitors: boolean;
  isLiveSyncConnected: boolean;
  error: string | null;
}

export function useResident(
  residentId?: string,
  options?: {
    authUserId?: string;
    displayName?: string | null;
  },
) {
  const [state, setState] = useState<ResidentState>({
    resident: null,
    visitors: [],
    pendingApprovals: [],
    activeResidents: [],
    isLoading: true,
    isLoadingVisitors: true,
    isLiveSyncConnected: false,
    error: null,
  });

  // Fetch resident details with flat and building info
  const fetchResidentDetails = useCallback(async () => {
    if (!residentId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "No resident ID provided",
      }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`
          id,
          resident_code,
          full_name,
          relation,
          phone,
          email,
          is_primary_contact,
          move_in_date,
          flats (
            id,
            flat_number,
            floor_number,
            flat_type,
            area_sqft,
            ownership_type,
            buildings (
              id,
              building_name,
              building_code
            )
          )
        `)
        .eq("id", residentId)
        .eq("is_active", true)
        .single();

      if (error) throw error;

      if (data) {
        setState((prev) => ({
          ...prev,
          resident: mapResidentRow(data as ResidentRow),
          isLoading: false,
          error: null,
        }));
      }
    } catch (err: unknown) {
      console.error("Error fetching resident details:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load resident details",
      }));
    }
  }, [residentId]);

  // Fetch visitors invited by this specific resident (Security: Only their resident_id)
  const fetchVisitors = useCallback(async () => {
    if (!state.resident?.id) return;

    setState((prev) => ({ ...prev, isLoadingVisitors: true }));

    try {
      const { data, error } = await supabase
        .from("visitors")
        .select(`
          id,
          visitor_name,
          visitor_type,
          phone,
          vehicle_number,
          purpose,
          photo_url,
          entry_time,
          exit_time,
          approved_by_resident,
          is_frequent_visitor
        `)
        .eq("resident_id", state.resident.id) // Security: Filter by resident_id (per-account, not per-flat)
        .order("entry_time", { ascending: false })
        .limit(20);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        visitors: data || [],
        isLoadingVisitors: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching visitors:", err);
      setState((prev) => ({
        ...prev,
        isLoadingVisitors: false,
      }));
    }
  }, [state.resident?.id]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!state.resident?.id) return;

    setState((prev) => ({ ...prev, isLoadingVisitors: true }));

    try {
      const { data, error } = await supabase.rpc("get_resident_pending_visitors" as any);

      if (error) throw error;

      const rows = (data as PendingVisitorRow[] | null)?.filter(
        (r) => r.approval_status === "pending"
      ) ?? [];
      const pendingApprovals = mapPendingVisitorRows(rows);

      setState((prev) => ({
        ...prev,
        pendingApprovals,
        isLoadingVisitors: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching resident pending approvals:", err);
      setState((prev) => ({
        ...prev,
        isLoadingVisitors: false,
      }));
    }
  }, [state.resident?.id]);

  // Invite a visitor (pre-approve)
  const inviteVisitor = useCallback(
    async (visitorData: {
      visitor_name: string;
      visitor_type: string;
      phone?: string;
      purpose?: string;
      vehicle_number?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!state.resident?.flat?.id || !state.resident?.id) {
        return { success: false, error: "Resident details not loaded" };
      }

      try {
        const { data, error } = await supabase.rpc(
          "create_resident_invited_visitor" as any,
          {
            p_visitor_name: visitorData.visitor_name,
            p_visitor_type: visitorData.visitor_type,
            p_phone: visitorData.phone || null,
            p_purpose: visitorData.purpose || null,
            p_vehicle_number: visitorData.vehicle_number || null,
          }
        );

        if (error) throw error;
        const result = data as ApprovalResultRow | null;
        if (!result?.success) {
          throw new Error(result?.error || "Failed to invite visitor");
        }

        fetchVisitors();
        fetchPendingApprovals();

        return { success: true };
      } catch (err: unknown) {
        console.error("Error inviting visitor:", err);
        return { success: false, error: err instanceof Error ? err.message : "Failed to invite visitor" };
      }
    },
    [state.resident, fetchPendingApprovals, fetchVisitors]
  );

  // Approve a visitor (PRD: Resident confirmation)
  const approveVisitor = useCallback(async (visitorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("approve_visitor", {
        p_visitor_id: visitorId,
        p_user_id: user.id
      });
      if (error) throw error;
      
      const result = data as ApprovalResultRow | null;
      if (!result.success) throw new Error(result.error);

      fetchVisitors();
      fetchPendingApprovals();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error approving visitor:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to approve visitor" };
    }
  }, [fetchPendingApprovals, fetchVisitors]);

  // Deny a visitor (PRD: Resident denial)
  const denyVisitor = useCallback(async (visitorId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("deny_visitor", {
        p_visitor_id: visitorId,
        p_user_id: user.id,
        p_reason: reason
      });
      if (error) throw error;
      
      const result = data as ApprovalResultRow | null;
      if (!result.success) throw new Error(result.error);

      fetchVisitors();
      fetchPendingApprovals();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error denying visitor:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to deny visitor" };
    }
  }, [fetchPendingApprovals, fetchVisitors]);

  // Toggle frequent visitor status (Phase 1B)
  const toggleFrequentVisitor = useCallback(async (visitorId: string, isFrequent: boolean) => {
    if (!state.resident?.flat?.id) {
      return { success: false, error: "Resident details not loaded" };
    }

    try {
      const { data, error } = await supabase
        .from("visitors")
        .update({ is_frequent_visitor: isFrequent })
        .eq("id", visitorId)
        .eq("flat_id", state.resident.flat.id)
        .select("id")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Visitor not found or update not permitted");
      
      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error toggling frequent status:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to update visitor status" };
    }
  }, [fetchVisitors, state.resident?.flat?.id]);

  // Refresh all data
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    fetchResidentDetails();
    fetchVisitors();
    fetchPendingApprovals();
  }, [fetchPendingApprovals, fetchResidentDetails, fetchVisitors]);

  // Initialize
  useEffect(() => {
    fetchResidentDetails();
  }, [fetchResidentDetails]);

  // Fetch visitors when resident data is loaded
  useEffect(() => {
    if (state.resident?.id) {
      fetchVisitors();
    }
  }, [state.resident?.id, fetchVisitors]);

  useEffect(() => {
    if (state.resident?.id) {
      fetchPendingApprovals();
    }
  }, [state.resident?.id, fetchPendingApprovals]);

  useEffect(() => {
    if (!state.resident?.flat?.id) {
      setState((prev) => ({
        ...prev,
        activeResidents: [],
        isLiveSyncConnected: false,
      }));
      return;
    }

    const channel = supabase
      .channel(`resident-visitors:${state.resident.flat.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
          filter: `flat_id=eq.${state.resident.flat.id}`,
        },
        () => {
          fetchVisitors();
          fetchPendingApprovals();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingApprovals, fetchVisitors, state.resident?.flat?.id]);

  useEffect(() => {
    if (!state.resident?.flat?.id || !options?.authUserId) {
      setState((prev) => ({
        ...prev,
        activeResidents: [],
        isLiveSyncConnected: false,
      }));
      return;
    }

    let presenceChannel: RealtimeChannel | null = supabase.channel(
      `resident-presence:${state.resident.flat.id}`,
      {
        config: {
          presence: {
            key: options.authUserId,
          },
        },
      },
    );

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        if (!presenceChannel) return;

        setState((prev) => ({
          ...prev,
          activeResidents: normalizePresenceMembers(
            presenceChannel.presenceState(),
            options.authUserId,
          ),
          isLiveSyncConnected: true,
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel?.track({
            userId: options.authUserId,
            residentId: state.resident?.id ?? null,
            fullName: options.displayName ?? state.resident?.full_name ?? "Resident",
            surface: "web",
            joinedAt: new Date().toISOString(),
          });
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setState((prev) => ({
            ...prev,
            activeResidents: [],
            isLiveSyncConnected: false,
          }));
        }
      });

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
        presenceChannel = null;
      }
    };
  }, [options?.authUserId, options?.displayName, state.resident?.flat?.id, state.resident?.full_name, state.resident?.id]);

  return {
    ...state,
    inviteVisitor,
    approveVisitor,
    denyVisitor,
    toggleFrequentVisitor,
    refresh,
    refreshVisitors: fetchVisitors,
  };
}

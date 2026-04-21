"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabaseClient";

interface FlatDetails {
  id: string;
  flat_number: string;
  floor_number: number | null;
  flat_type: string | null;
  area_sqft: number | null;
  ownership_type: string | null;
  building: {
    id: string;
    building_name: string;
    building_code: string;
  } | null;
}

interface ResidentDetails {
  id: string;
  resident_code: string;
  full_name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  is_primary_contact: boolean | null;
  move_in_date: string | null;
  flat: FlatDetails | null;
}

interface Visitor {
  id: string;
  visitor_name: string;
  visitor_type: string | null;
  phone: string | null;
  vehicle_number: string | null;
  purpose: string | null;
  photo_url: string | null;
  entry_time: string | null;
  exit_time: string | null;
  approved_by_resident: boolean | null;
  is_frequent_visitor: boolean | null;
}

interface ResidentPendingVisitor extends Visitor {
  approval_status: string | null;
  approval_deadline_at: string | null;
  flat_id: string | null;
  flat_label: string | null;
  rejection_reason: string | null;
}

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

interface ResidentPresenceMember {
  residentId: string | null;
  surface: "mobile" | "web" | "unknown";
  userId: string;
  fullName: string;
  joinedAt: string;
}

function normalizePresenceMembers(
  state: Record<string, Array<Record<string, unknown>>>,
  currentUserId?: string,
): ResidentPresenceMember[] {
  const members = Object.values(state)
    .flat()
    .map((entry) => {
      const surface: "mobile" | "web" | "unknown" =
        entry.surface === "mobile" || entry.surface === "web" ? entry.surface : "unknown";

      return {
        residentId: typeof entry.residentId === "string" ? entry.residentId : null,
        surface,
        userId: typeof entry.userId === "string" ? entry.userId : "",
        fullName:
          typeof entry.fullName === "string" && entry.fullName.trim().length
            ? entry.fullName.trim()
            : "Resident",
        joinedAt:
          typeof entry.joinedAt === "string" && entry.joinedAt.trim().length
            ? entry.joinedAt
            : new Date().toISOString(),
      };
    })
    .filter((entry) => entry.userId && entry.userId !== currentUserId);

  const deduped = new Map<string, (typeof members)[number]>();

  for (const member of members) {
    const existing = deduped.get(member.userId);

    if (!existing || new Date(member.joinedAt).getTime() > new Date(existing.joinedAt).getTime()) {
      deduped.set(member.userId, member);
    }
  }

  return [...deduped.values()].sort((left, right) => left.fullName.localeCompare(right.fullName));
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
        const flatData = data.flats as any;
        setState((prev) => ({
          ...prev,
          resident: {
            id: data.id,
            resident_code: data.resident_code,
            full_name: data.full_name,
            relation: data.relation,
            phone: data.phone,
            email: data.email,
            is_primary_contact: data.is_primary_contact,
            move_in_date: data.move_in_date,
            flat: flatData
              ? {
                  id: flatData.id,
                  flat_number: flatData.flat_number,
                  floor_number: flatData.floor_number,
                  flat_type: flatData.flat_type,
                  area_sqft: flatData.area_sqft,
                  ownership_type: flatData.ownership_type,
                  building: flatData.buildings || null,
                }
              : null,
          },
          isLoading: false,
          error: null,
        }));
      }
    } catch (err: any) {
      console.error("Error fetching resident details:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load resident details",
      }));
    }
  }, [residentId]);

  // Fetch visitors for the resident's flat (Security: Only their flat_id)
  const fetchVisitors = useCallback(async () => {
    if (!state.resident?.flat?.id) return;

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
        .eq("flat_id", state.resident.flat.id) // Security: Filter by flat_id
        .order("entry_time", { ascending: false })
        .limit(20);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        visitors: data || [],
        isLoadingVisitors: false,
      }));
    } catch (err: any) {
      console.error("Error fetching visitors:", err);
      setState((prev) => ({
        ...prev,
        isLoadingVisitors: false,
      }));
    }
  }, [state.resident?.flat?.id]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!state.resident?.id) return;

    setState((prev) => ({ ...prev, isLoadingVisitors: true }));

    try {
      const { data, error } = await supabase.rpc(
        "get_resident_pending_visitors" as any
      );

      if (error) throw error;

      const pendingApprovals = (
        ((data as Array<{
          id: string;
          visitor_name: string;
          phone: string | null;
          purpose: string | null;
          flat_id: string | null;
          flat_label: string | null;
          vehicle_number: string | null;
          photo_url: string | null;
          entry_time: string | null;
          approval_status: string | null;
          approval_deadline_at: string | null;
          is_frequent_visitor: boolean | null;
          rejection_reason: string | null;
        }> | null) ?? [])
      )
        .filter((visitor) => visitor.approval_status === "pending")
        .map((visitor) => ({
          id: visitor.id,
          visitor_name: visitor.visitor_name,
          visitor_type: null,
          phone: visitor.phone,
          vehicle_number: visitor.vehicle_number,
          purpose: visitor.purpose,
          photo_url: visitor.photo_url,
          entry_time: visitor.entry_time,
          exit_time: null,
          approved_by_resident: null,
          is_frequent_visitor: visitor.is_frequent_visitor,
          approval_status: visitor.approval_status,
          approval_deadline_at: visitor.approval_deadline_at,
          flat_id: visitor.flat_id,
          flat_label: visitor.flat_label,
          rejection_reason: visitor.rejection_reason,
        }));

      setState((prev) => ({
        ...prev,
        pendingApprovals,
        isLoadingVisitors: false,
      }));
    } catch (err: any) {
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
        const result = data as { success?: boolean; error?: string } | null;
        if (!result?.success) {
          throw new Error(result?.error || "Failed to invite visitor");
        }

        fetchVisitors();
        fetchPendingApprovals();

        return { success: true };
      } catch (err: any) {
        console.error("Error inviting visitor:", err);
        return { success: false, error: err.message || "Failed to invite visitor" };
      }
    },
    [state.resident, fetchPendingApprovals, fetchVisitors]
  );

  // Approve a visitor (PRD: Resident confirmation)
  const approveVisitor = useCallback(async (visitorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("approve_visitor" as any, {
        p_visitor_id: visitorId,
        p_user_id: user.id
      });
      if (error) throw error;
      
      const result = data as any;
      if (!result.success) throw new Error(result.error);

      fetchVisitors();
      fetchPendingApprovals();
      return { success: true };
    } catch (err: any) {
      console.error("Error approving visitor:", err);
      return { success: false, error: err.message };
    }
  }, [fetchPendingApprovals, fetchVisitors]);

  // Deny a visitor (PRD: Resident denial)
  const denyVisitor = useCallback(async (visitorId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("deny_visitor" as any, {
        p_visitor_id: visitorId,
        p_user_id: user.id,
        p_reason: reason
      });
      if (error) throw error;
      
      const result = data as any;
      if (!result.success) throw new Error(result.error);

      fetchVisitors();
      fetchPendingApprovals();
      return { success: true };
    } catch (err: any) {
      console.error("Error denying visitor:", err);
      return { success: false, error: err.message };
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
    } catch (err: any) {
      console.error("Error toggling frequent status:", err);
      return { success: false, error: err.message };
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
    if (state.resident?.flat?.id) {
      fetchVisitors();
    }
  }, [state.resident?.flat?.id, fetchVisitors]);

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

"use client";

import { useState, useEffect, useCallback } from "react";
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

interface ResidentState {
  resident: ResidentDetails | null;
  visitors: Visitor[];
  isLoading: boolean;
  isLoadingVisitors: boolean;
  error: string | null;
}

export function useResident(residentId?: string) {
  const [state, setState] = useState<ResidentState>({
    resident: null,
    visitors: [],
    isLoading: true,
    isLoadingVisitors: true,
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
        const { data, error } = await supabase
          .from("visitors")
          .insert({
            visitor_name: visitorData.visitor_name,
            visitor_type: visitorData.visitor_type,
            phone: visitorData.phone || null,
            purpose: visitorData.purpose || null,
            vehicle_number: visitorData.vehicle_number || null,
            flat_id: state.resident.flat.id,
            resident_id: state.resident.id,
            approved_by_resident: true, // Pre-approved by resident
            entry_time: null, // Will be set when visitor actually arrives
          })
          .select()
          .single();

        if (error) throw error;

        // Refresh visitors list
        fetchVisitors();

        return { success: true };
      } catch (err: any) {
        console.error("Error inviting visitor:", err);
        return { success: false, error: err.message || "Failed to invite visitor" };
      }
    },
    [state.resident, fetchVisitors]
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
      return { success: true };
    } catch (err: any) {
      console.error("Error approving visitor:", err);
      return { success: false, error: err.message };
    }
  }, [fetchVisitors]);

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
      return { success: true };
    } catch (err: any) {
      console.error("Error denying visitor:", err);
      return { success: false, error: err.message };
    }
  }, [fetchVisitors]);

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
  }, [fetchResidentDetails]);

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

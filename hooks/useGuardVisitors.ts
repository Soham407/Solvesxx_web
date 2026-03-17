"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { sendVisitorArrivalNotification } from "@/src/lib/notifications";


interface ExpectedVisitor {
  id: string;
  visitor_name: string;
  visitor_type: string | null;
  phone: string | null;
  vehicle_number: string | null;
  purpose: string | null;
  approved_by_resident: boolean;
  flat: {
    flat_number: string;
    building: {
      building_name: string;
    } | null;
  } | null;
  resident: {
    full_name: string;
    phone: string | null;
  } | null;
}

interface ActiveVisitor {
  id: string;
  visitor_name: string;
  visitor_type: string | null;
  phone: string | null;
  vehicle_number: string | null;
  purpose: string | null;
  photo_url: string | null;
  entry_time: string;
  flat: {
    flat_number: string;
    building: {
      building_name: string;
    } | null;
  } | null;
}

interface GuardVisitorsState {
  expectedVisitors: ExpectedVisitor[];
  activeVisitors: ActiveVisitor[];
  isLoading: boolean;
  isCheckingIn: string | null; // ID of visitor being checked in
  error: string | null;
}

export function useGuardVisitors() {
  const [state, setState] = useState<GuardVisitorsState>({
    expectedVisitors: [],
    activeVisitors: [],
    isLoading: true,
    isCheckingIn: null,
    error: null,
  });

  /**
   * Fetch pre-approved visitors who haven't entered yet
   * These are visitors invited by residents with entry_time = null
   */
  const fetchExpectedVisitors = useCallback(async () => {
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
          approved_by_resident,
          flats (
            flat_number,
            buildings (
              building_name
            )
          ),
          residents (
            full_name,
            phone
          )
        `)
        .eq("approved_by_resident", true)
        .is("entry_time", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      // PostgREST returns FK joins using table names (flats, residents, buildings)
      // Map them to our cleaner interface names (flat, resident, building)
      const visitors: ExpectedVisitor[] = (data || []).map((v) => {
        const rawFlat = v.flats as { flat_number: string; buildings: { building_name: string } | null } | null;
        return {
          id: v.id,
          visitor_name: v.visitor_name,
          visitor_type: v.visitor_type,
          phone: v.phone,
          vehicle_number: v.vehicle_number,
          purpose: v.purpose,
          approved_by_resident: v.approved_by_resident ?? false,
          flat: rawFlat ? { flat_number: rawFlat.flat_number, building: rawFlat.buildings } : null,
          resident: v.residents as ExpectedVisitor["resident"],
        };
      });

      setState((prev) => ({
        ...prev,
        expectedVisitors: visitors,
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load expected visitors";
      console.error("Error fetching expected visitors:", message);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  /**
   * Fetch visitors currently inside the premises (entry_time set, exit_time null)
   */
  const fetchActiveVisitors = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
          flats (
            flat_number,
            buildings (
              building_name
            )
          )
        `)
        .not("entry_time", "is", null)
        .is("exit_time", null)
        .gte("entry_time", today.toISOString())
        .order("entry_time", { ascending: false });

      if (error) throw error;

      const visitors: ActiveVisitor[] = (data || []).map((v) => {
        const rawFlat = v.flats as { flat_number: string; buildings: { building_name: string } | null } | null;
        return {
          id: v.id,
          visitor_name: v.visitor_name,
          visitor_type: v.visitor_type,
          phone: v.phone,
          vehicle_number: v.vehicle_number,
          purpose: v.purpose,
          photo_url: v.photo_url,
          entry_time: v.entry_time!,
          flat: rawFlat ? { flat_number: rawFlat.flat_number, building: rawFlat.buildings } : null,
        };
      });

      setState((prev) => ({
        ...prev,
        activeVisitors: visitors,
      }));
    } catch (err: unknown) {
      console.error("Error fetching active visitors:", err instanceof Error ? err.message : err);
    }
  }, []);

  /**
   * Check-in a pre-approved visitor (set entry_time to now)
   */
  const checkInVisitor = useCallback(
    async (
      visitorId: string,
      guardId?: string,
      locationId?: string
    ): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, isCheckingIn: visitorId }));

      try {
        const { data, error } = await supabase
          .from("visitors")
          .update({
            entry_time: new Date().toISOString(),
            entry_guard_id: guardId || null,
            entry_location_id: locationId || null,
          })
          .eq("id", visitorId)
          .select(`
            visitor_name,
            photo_url,
            flats ( flat_number ),
            residents ( auth_user_id )
          `)
          .single();

        if (error) throw error;

        // Refresh both lists
        await Promise.all([fetchExpectedVisitors(), fetchActiveVisitors()]);
        
        // Notify resident
        try {
          // Supabase returns FK joins — single FK returns object, multi FK returns array
          // visitors.resident_id → residents.id is a single FK, so it returns an object
          const residentData = data.residents as { auth_user_id: string | null } | null;
          const flatData = data.flats as { flat_number: string } | null;

          const residentAuthUserId = residentData?.auth_user_id;
          const flatNumber = flatData?.flat_number;
          const visitorName = data.visitor_name;
          const visitorPhotoUrl = (data as any).photo_url as string | null;

          if (residentAuthUserId && flatNumber && visitorName) {
            await sendVisitorArrivalNotification(residentAuthUserId, visitorName, flatNumber, visitorPhotoUrl ?? undefined);
          }
        } catch (notifErr) {
          console.error("Failed to send arrival notification", notifErr);
          // Non-blocking error
        }

        setState((prev) => ({ ...prev, isCheckingIn: null }));
        return { success: true };
      } catch (err) {
        console.error("Error checking in visitor:", err);
        setState((prev) => ({ ...prev, isCheckingIn: null }));
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to check in visitor",
        };
      }
    },
    [fetchExpectedVisitors, fetchActiveVisitors]
  );

  /**
   * Check-out a visitor (set exit_time to now)
   */
  const checkOutVisitor = useCallback(
    async (
      visitorId: string,
      guardId?: string,
      locationId?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("visitors")
          .update({
            exit_time: new Date().toISOString(),
            exit_guard_id: guardId || null,
          })
          .eq("id", visitorId);

        if (error) throw error;

        // Refresh the active visitors list
        await fetchActiveVisitors();

        return { success: true };
      } catch (err) {
        console.error("Error checking out visitor:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to check out visitor",
        };
      }
    },
    [fetchActiveVisitors]
  );

  /**
   * Refresh all visitor data
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await Promise.all([fetchExpectedVisitors(), fetchActiveVisitors()]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to refresh visitor data";
      console.error("Error refreshing visitor data:", message);
      setState((prev) => ({
        ...prev,
        error: message,
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [fetchExpectedVisitors, fetchActiveVisitors]);

  // Initialize data on mount
  useEffect(() => {
    fetchExpectedVisitors();
    fetchActiveVisitors();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchExpectedVisitors();
      fetchActiveVisitors();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchExpectedVisitors, fetchActiveVisitors]);

  return {
    ...state,
    checkInVisitor,
    checkOutVisitor,
    refresh,
  };
}

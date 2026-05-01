"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { resolveCurrentWorkforceActor } from "@/src/lib/workforce/boundary";

interface EmployeeProfile {
  employeeId: string | null;
  guardId: string | null;
  residentId: string | null;
  flatId: string | null;
  guardCode: string | null;
  employeeCode: string | null;
  fullName: string | null;
  role: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get the employee profile for the authenticated user.
 * This bridges the gap between Supabase auth (auth.users) and the application's
 * employees/security_guards tables.
 * 
 * Usage:
 * const { employeeId, guardId, isLoading, error } = useEmployeeProfile();
 * 
 * Then pass employeeId to useAttendance, usePanicAlert, etc.
 */
export function useEmployeeProfile() {
  const [profile, setProfile] = useState<EmployeeProfile>({
    employeeId: null,
    guardId: null,
    residentId: null,
    flatId: null,
    guardCode: null,
    employeeCode: null,
    fullName: null,
    role: null,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const actor = await resolveCurrentWorkforceActor();

      setProfile({
        employeeId: actor.employeeId,
        guardId: actor.guardId,
        residentId: actor.residentId,
        flatId: actor.flatId,
        guardCode: actor.guardCode,
        employeeCode: actor.employeeCode,
        fullName: actor.fullName,
        role: actor.roleName,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching employee profile:", err);
      setProfile((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load profile",
      }));
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile();
        } else {
          setProfile({
            employeeId: null,
            guardId: null,
            residentId: null,
            flatId: null,
            guardCode: null,
            employeeCode: null,
            fullName: null,
            role: null,
            isLoading: false,
            error: "Not authenticated",
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return {
    ...profile,
    refresh: fetchProfile,
  };
}


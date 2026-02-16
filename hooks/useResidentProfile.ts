"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface ResidentProfile {
  residentId: string | null;
  residentCode: string | null;
  fullName: string | null;
  flatId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to get the resident profile for the authenticated user.
 * This bridges the gap between Supabase auth (auth.users) and the application's
 * residents table.
 * 
 * Usage:
 * const { residentId, isLoading, error } = useResidentProfile();
 * 
 * Then pass residentId to useResident hook.
 */
export function useResidentProfile() {
  const [profile, setProfile] = useState<ResidentProfile>({
    residentId: null,
    residentCode: null,
    fullName: null,
    flatId: null,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async () => {
    try {
      // Step 1: Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setProfile((prev) => ({
          ...prev,
          isLoading: false,
          error: "Not authenticated",
        }));
        return;
      }

      // Step 2: Get resident record using auth_user_id (new schema)
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select("id, resident_code, full_name, flat_id")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .single();

      if (residentError) {
        if (residentError.code === "PGRST116") {
          // No resident found, fallback to email lookup for backward compatibility
          if (user.email) {
            const { data: emailData, error: emailError } = await supabase
              .from("residents")
              .select("id, resident_code, full_name, flat_id")
              .eq("email", user.email)
              .eq("is_active", true)
              .single();

            if (!emailError && emailData) {
              setProfile({
                residentId: emailData.id,
                residentCode: emailData.resident_code,
                fullName: emailData.full_name,
                flatId: emailData.flat_id,
                isLoading: false,
                error: null,
              });
              return;
            }
          }

          setProfile((prev) => ({
            ...prev,
            isLoading: false,
            error: "No resident profile found. Please contact support.",
          }));
        } else {
          throw residentError;
        }
        return;
      }

      setProfile({
        residentId: residentData.id,
        residentCode: residentData.resident_code,
        fullName: residentData.full_name,
        flatId: residentData.flat_id,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching resident profile:", err);
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
            residentId: null,
            residentCode: null,
            fullName: null,
            flatId: null,
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



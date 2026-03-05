"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

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

      // Step 2: Get user record from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          id,
          employee_id,
          role_id,
          full_name,
          roles (
            role_name
          )
        `)
        .eq("id", user.id)
        .single();

      if (userError) {
        // User might not have a record in users table yet
        // Try direct lookup via employees.auth_user_id (new schema)
        if (userError.code === "PGRST116") {
          // Fallback: Try to find employee directly via auth_user_id
          const { data: directEmployee, error: directError } = await supabase
            .from("employees")
            .select("id, employee_code, first_name, last_name")
            .eq("auth_user_id", user.id)
            .single();

          if (directEmployee && !directError) {
            // Found employee directly, check if they're a guard
            const { data: guardData } = await supabase
              .from("security_guards")
              .select("id, guard_code")
              .eq("employee_id", directEmployee.id)
              .single();

            const firstName = directEmployee.first_name || "";
            const lastName = directEmployee.last_name || "";
            const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

            setProfile({
              employeeId: directEmployee.id,
              guardId: guardData?.id || null,
              residentId: null,
              flatId: null,
              guardCode: guardData?.guard_code || null,
              employeeCode: directEmployee.employee_code,
              fullName,
              role: guardData ? "security_guard" : "employee",
              isLoading: false,
              error: null,
            });
            return;
          }

          // Also try residents.auth_user_id
          const { data: residentData, error: residentError } = await supabase
            .from("residents")
            .select("id, resident_code, full_name, flat_id")
            .eq("auth_user_id", user.id)
            .single();

          if (residentData && !residentError) {
            setProfile({
              employeeId: null,
              guardId: null,
              residentId: residentData.id,
              flatId: residentData.flat_id,
              guardCode: null,
              employeeCode: residentData.resident_code,
              fullName: residentData.full_name,
              role: "resident",
              isLoading: false,
              error: null,
            });
            return;
          }

          setProfile((prev) => ({
            ...prev,
            isLoading: false,
            error: "User profile not set up. Please contact admin.",
          }));
        } else {
          throw userError;
        }
        return;
      }

      if (!userData.employee_id) {
        setProfile((prev) => ({
          ...prev,
          isLoading: false,
          fullName: userData.full_name,
          role: (Array.isArray(userData.roles) ? userData.roles[0] : userData.roles)?.role_name || null,
          error: "No employee record linked",
        }));
        return;
      }

      // Step 3 & 4: Get employee details AND check if guard — in PARALLEL
      // L4 FIX: These queries are independent, so run them concurrently
      const [employeeResult, guardResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, employee_code, first_name, last_name")
          .eq("id", userData.employee_id)
          .single(),
        supabase
          .from("security_guards")
          .select("id, guard_code")
          .eq("employee_id", userData.employee_id)
          .single(),
      ]);

      const { data: employeeData, error: employeeError } = employeeResult;
      if (employeeError) throw employeeError;

      // Handle guard query errors explicitly
      let guardInfo: { id: string; guard_code: string } | null = null;
      if (guardResult.error) {
        if (guardResult.error.code === "PGRST116") {
          // No rows found - user is not a guard, this is okay
          guardInfo = null;
        } else {
          // Unexpected error - propagate it
          throw guardResult.error;
        }
      } else {
        guardInfo = guardResult.data;
      }

      // Safely construct fullName, handling null values
      const firstName = employeeData.first_name || "";
      const lastName = employeeData.last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

      setProfile({
        employeeId: userData.employee_id,
        guardId: guardInfo?.id || null,
        residentId: null,
        flatId: null,
        guardCode: guardInfo?.guard_code || null,
        employeeCode: employeeData.employee_code,
        fullName,
        role: (Array.isArray(userData.roles) ? userData.roles[0] : userData.roles)?.role_name || null,
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



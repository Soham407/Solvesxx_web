"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { assembleEmployeeDirectory } from "@/src/lib/workforce/boundary";

interface Employee {
  id: string;
  employee_code: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation_id: string | null;
  is_active: boolean;
  created_at: string;
  photo_url?: string | null;
  date_of_joining?: string | null;
  designation_name?: string | null;
  role?: string | null;
  role_name?: string | null;
  linked_user_id?: string | null;
  auth_user_id?: string | null;
  must_change_password?: boolean;
  assigned_location_id?: string | null;
  assigned_location_name?: string | null;
  guard_profile_id?: string | null;
  guard_code?: string | null;
  guard_is_active?: boolean;
  shift_id?: string | null;
  shift_name?: string | null;
}

interface UseEmployeesState {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
}

interface CreateEmployeePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation_id?: string | null;
}

interface UseEmployeesReturn extends UseEmployeesState {
  getEmployeeById: (id: string) => Employee | undefined;
  getEmployeeName: (id: string | null) => string;
  getEmployeeInitials: (id: string | null) => string;
  createEmployee: (payload: CreateEmployeePayload) => Promise<{ success: boolean; error?: string }>;
  refresh: () => void;
}

/**
 * Hook for fetching all employees
 * Used for employee selection dropdowns, assignment, etc.
 */
export function useEmployees(options?: { includeInactive?: boolean }): UseEmployeesReturn {
  const { role, userId } = useAuth();
  const [state, setState] = useState<UseEmployeesState>({
    employees: [],
    isLoading: true,
    error: null,
  });
  const includeInactive = options?.includeInactive ?? false;

  const fetchEmployees = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch managed societies for non-admin roles to enable explicit filtering
      let managedSocietyIds: string[] = [];
      const isAdmin = role === "admin" || role === "super_admin";
      
      if (!isAdmin && role) {
        const { data: societies } = await supabase.rpc("get_my_managed_societies");
        managedSocietyIds = societies || [];
      }

      let query = supabase
        .from("employees")
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          phone,
          department,
          designation_id,
          is_active,
          created_at,
          photo_url,
          date_of_joining,
          designations:designation_id(designation_name)
        `)
        .order("first_name");

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      // Explicit filtering for non-admins if society bridge is available.
      // Note: RLS handles the actual security (harden_security_guard_rls.sql).
      // We rely on RLS to filter the primary employees list based on the security_guards bridge.

      const { data, error } = await query;

      if (error) throw error;

      const employeeIds = (data || []).map((emp) => emp.id).filter(Boolean);

      const [usersResult, guardsResult, shiftsResult] = employeeIds.length
        ? await Promise.all([
            supabase
              .from("users")
              .select("id, employee_id, must_change_password, roles(role_name)")
              .in("employee_id", employeeIds),
            supabase
              .from("security_guards")
              .select(`
                id,
                employee_id,
                guard_code,
                assigned_location_id,
                is_active,
                assigned_location:company_locations(location_name)
              `)
              .in("employee_id", employeeIds),
            supabase
              .from("employee_shift_assignments")
              .select(`
                employee_id,
                shift_id,
                assigned_from,
                shifts(shift_name)
              `)
              .eq("is_active", true)
              .in("employee_id", employeeIds)
              .order("assigned_from", { ascending: false }),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

      if (usersResult.error) throw usersResult.error;
      if (guardsResult.error) throw guardsResult.error;
      if (shiftsResult.error) throw shiftsResult.error;

      const employeesWithFullName: Employee[] = assembleEmployeeDirectory({
        employees: data || [],
        users: usersResult.data || [],
        guards: guardsResult.data || [],
        shifts: shiftsResult.data || [],
      }) as Employee[];

      setState({
        employees: employeesWithFullName,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch employees";
      console.error("Error fetching employees:", err, typeof err === 'object' ? JSON.stringify(err) : '');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [includeInactive]);

  const getEmployeeById = useCallback(
    (id: string): Employee | undefined => {
      return state.employees.find((e) => e.id === id);
    },
    [state.employees]
  );

  const getEmployeeName = useCallback(
    (id: string | null): string => {
      if (!id) return "Unassigned";
      const employee = state.employees.find((e) => e.id === id);
      return employee?.full_name || "Unknown";
    },
    [state.employees]
  );

  const getEmployeeInitials = useCallback(
    (id: string | null): string => {
      if (!id) return "?";
      const employee = state.employees.find((e) => e.id === id);
      if (!employee?.full_name) return "?";
      return employee.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    },
    [state.employees]
  );

  const createEmployee = useCallback(async (payload: CreateEmployeePayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const employee_code = `EMP-${Date.now()}`;
      const { error } = await supabase.from("employees").insert({
        employee_code,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone || null,
        department: payload.department || null,
        designation_id: payload.designation_id || null,
        date_of_joining: new Date().toISOString().split("T")[0],
        is_active: true,
      } as any);
      if (error) throw error;
      await fetchEmployees();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create employee";
      return { success: false, error: message };
    }
  }, [fetchEmployees]);

  const refresh = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    ...state,
    getEmployeeById,
    getEmployeeName,
    getEmployeeInitials,
    createEmployee,
    refresh,
  };
}

export type { Employee };

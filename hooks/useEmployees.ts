"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

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

      const userMap = new Map<string, {
        linked_user_id: string | null;
        role_name: string | null;
        must_change_password: boolean;
      }>();
      (usersResult.data || []).forEach((record: any) => {
        if (!record.employee_id || userMap.has(record.employee_id)) return;
        const roleRecord = Array.isArray(record.roles) ? record.roles[0] : record.roles;
        userMap.set(record.employee_id, {
          linked_user_id: record.id ?? null,
          role_name: roleRecord?.role_name ?? null,
          must_change_password: Boolean(record.must_change_password),
        });
      });

      const guardMap = new Map<string, {
        guard_profile_id: string | null;
        guard_code: string | null;
        assigned_location_id: string | null;
        assigned_location_name: string | null;
        guard_is_active: boolean;
      }>();
      (guardsResult.data || []).forEach((record: any) => {
        if (!record.employee_id || guardMap.has(record.employee_id)) return;
        const assignedLocation = Array.isArray(record.assigned_location)
          ? record.assigned_location[0]
          : record.assigned_location;

        guardMap.set(record.employee_id, {
          guard_profile_id: record.id ?? null,
          guard_code: record.guard_code ?? null,
          assigned_location_id: record.assigned_location_id ?? null,
          assigned_location_name: assignedLocation?.location_name ?? null,
          guard_is_active: record.is_active !== false,
        });
      });

      const shiftMap = new Map<string, { shift_id: string | null; shift_name: string | null }>();
      (shiftsResult.data || []).forEach((record: any) => {
        if (!record.employee_id || shiftMap.has(record.employee_id)) return;
        const shiftRecord = Array.isArray(record.shifts) ? record.shifts[0] : record.shifts;
        shiftMap.set(record.employee_id, {
          shift_id: record.shift_id ?? null,
          shift_name: shiftRecord?.shift_name ?? null,
        });
      });

      // Transform data to include full_name
      const employeesWithFullName: Employee[] = (data || []).map((emp: any) => {
        // Handle relation returns
        const desigInfo = Array.isArray(emp.designations) ? emp.designations[0] : emp.designations;
        const linkedUser = userMap.get(emp.id);
        const linkedGuard = guardMap.get(emp.id);
        const activeShift = shiftMap.get(emp.id);
        
        return {
          ...emp,
          full_name: [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || "Unknown",
          designation_name: desigInfo?.designation_name || emp.department || "Employee",
          linked_user_id: linkedUser?.linked_user_id ?? null,
          role_name: linkedUser?.role_name ?? null,
          must_change_password: linkedUser?.must_change_password ?? false,
          guard_profile_id: linkedGuard?.guard_profile_id ?? null,
          guard_code: linkedGuard?.guard_code ?? null,
          assigned_location_id: linkedGuard?.assigned_location_id ?? null,
          assigned_location_name: linkedGuard?.assigned_location_name ?? null,
          guard_is_active: linkedGuard?.guard_is_active ?? false,
          shift_id: activeShift?.shift_id ?? null,
          shift_name: activeShift?.shift_name ?? null,
        };
      });

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

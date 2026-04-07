"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

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
export function useEmployees(): UseEmployeesReturn {
  const [state, setState] = useState<UseEmployeesState>({
    employees: [],
    isLoading: true,
    error: null,
  });

  const fetchEmployees = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
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
        .eq("is_active", true)
        .order("first_name");

      if (error) throw error;

      // Transform data to include full_name
      const employeesWithFullName: Employee[] = (data || []).map((emp: any) => {
        // Handle relation returns
        const desigInfo = Array.isArray(emp.designations) ? emp.designations[0] : emp.designations;
        
        return {
          ...emp,
          full_name: [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || "Unknown",
          designation_name: desigInfo?.designation_name || emp.department || "Employee",
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
  }, []);

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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface TechnicianProfile {
  id: string;
  employee_id: string;
  skills: string[];
  certifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  full_name?: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  photo_url?: string;
}

interface UseTechniciansState {
  technicians: TechnicianProfile[];
  isLoading: boolean;
  error: string | null;
}

interface UseTechniciansReturn extends UseTechniciansState {
  refresh: () => void;
  addTechnician: (profile: Omit<TechnicianProfile, "id" | "created_at" | "updated_at">) => Promise<{ success: boolean; error?: string }>;
  updateTechnician: (id: string, profile: Partial<TechnicianProfile>) => Promise<{ success: boolean; error?: string }>;
}

export function useTechnicians(): UseTechniciansReturn {
  const [state, setState] = useState<UseTechniciansState>({
    technicians: [],
    isLoading: true,
    error: null,
  });

  const fetchTechnicians = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("technician_profiles")
        .select(`
          *,
          employee:employees (
            id,
            first_name,
            last_name,
            employee_code,
            photo_url,
            designations (
                designation_name
            ),
            department
          )
        `)
        .eq("is_active", true);

      if (error) throw error;

      const transformedData: TechnicianProfile[] = (data || []).map((item: any) => ({
        ...item,
        full_name: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : "Unknown",
        employee_code: item.employee?.employee_code,
        designation: item.employee?.designations?.designation_name,
        department: item.employee?.department,
        photo_url: item.employee?.photo_url,
      }));

      setState({
        technicians: transformedData,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching technicians:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch technicians",
      }));
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const addTechnician = async (profile: any) => {
    try {
      const { error } = await supabase.from("technician_profiles").insert(profile);
      if (error) throw error;
      fetchTechnicians();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateTechnician = async (id: string, profile: any) => {
    try {
      const { error } = await supabase.from("technician_profiles").update(profile).eq("id", id);
      if (error) throw error;
      fetchTechnicians();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    ...state,
    refresh: fetchTechnicians,
    addTechnician,
    updateTechnician,
  };
}

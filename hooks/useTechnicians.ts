"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  mapTechnicianRow,
  mapTechnicianRows,
  type RawTechnicianRow,
  type TechnicianProfile,
} from "@/src/lib/technicians/technicianTransforms";

export type { TechnicianProfile } from "@/src/lib/technicians/technicianTransforms";

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

  function normalizeTechnicianRows(rows: unknown): RawTechnicianRow[] {
    return Array.isArray(rows) ? (rows as RawTechnicianRow[]) : [];
  }

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

      const transformedData: TechnicianProfile[] = mapTechnicianRows(normalizeTechnicianRows(data));

      setState({
        technicians: transformedData,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error("Error fetching technicians:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch technicians",
      }));
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const addTechnician = async (profile: Omit<TechnicianProfile, "id" | "created_at" | "updated_at">) => {
    try {
      const { error } = await supabase.from("technician_profiles").insert(profile);
      if (error) throw error;
      await fetchTechnicians();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Operation failed" };
    }
  };

  const updateTechnician = async (id: string, profile: Partial<TechnicianProfile>) => {
    try {
      const { error } = await supabase.from("technician_profiles").update(profile).eq("id", id);
      if (error) throw error;
      await fetchTechnicians();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Operation failed" };
    }
  };

  return {
    ...state,
    refresh: fetchTechnicians,
    addTechnician,
    updateTechnician,
  };
}

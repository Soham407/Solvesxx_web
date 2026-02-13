"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface Society {
  id: string;
  society_name: string;
  society_code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface UseSocietiesState {
  societies: Society[];
  isLoading: boolean;
  error: string | null;
}

interface UseSocietiesReturn extends UseSocietiesState {
  refresh: () => void;
  getSocietyById: (id: string | null) => Society | undefined;
  getSocietyName: (id: string | null) => string;
  getActiveSocieties: () => Society[];
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for fetching all societies
 * Used for society selection dropdowns in Sales Rates, Indents, etc.
 */
export function useSocieties(options?: { includeInactive?: boolean }): UseSocietiesReturn {
  const [state, setState] = useState<UseSocietiesState>({
    societies: [],
    isLoading: true,
    error: null,
  });

  const fetchSocieties = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("societies")
        .select(`
          id,
          society_name,
          society_code,
          address,
          city,
          state,
          pincode,
          contact_person,
          contact_phone,
          contact_email,
          is_active,
          created_at
        `)
        .order("society_name", { ascending: true });

      // Filter to active only unless includeInactive is true
      if (!options?.includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setState({
        societies: data || [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch societies";
      console.error("Error fetching societies:", err);
      setState({
        societies: [],
        isLoading: false,
        error: errorMessage,
      });
    }
  }, [options?.includeInactive]);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getSocietyById = useCallback(
    (id: string | null): Society | undefined => {
      if (!id) return undefined;
      return state.societies.find((s) => s.id === id);
    },
    [state.societies]
  );

  const getSocietyName = useCallback(
    (id: string | null): string => {
      if (!id) return "Global (All Societies)";
      const society = getSocietyById(id);
      return society?.society_name || "Unknown Society";
    },
    [getSocietyById]
  );

  const getActiveSocieties = useCallback((): Society[] => {
    return state.societies.filter((s) => s.is_active === true);
  }, [state.societies]);

  return {
    ...state,
    refresh: fetchSocieties,
    getSocietyById,
    getSocietyName,
    getActiveSocieties,
  };
}

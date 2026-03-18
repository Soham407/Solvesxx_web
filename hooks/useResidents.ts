"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface Flat {
  id: string;
  flat_number: string;
  building_id: string;
  is_active: boolean;
  buildings?: {
    id: string;
    building_name: string;
  };
}

export interface Resident {
  id: string;
  full_name: string;
  phone: string;
  relation: string;
  flat_id: string;
  resident_code: string;
  vehicles?: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  flats?: {
    id: string;
    flat_number: string;
    building_id: string;
    buildings?: {
      id: string;
      building_name: string;
    };
  };
}

interface UseResidentsState {
  residents: Resident[];
  flats: Flat[];
  isLoading: boolean;
  error: string | null;
}

export function useResidents() {
  const [state, setState] = useState<UseResidentsState>({
    residents: [],
    flats: [],
    isLoading: true,
    error: null,
  });
  const { toast } = useToast();

  // Fetch all active flats
  const fetchFlats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("flats")
        .select("id, flat_number, building_id, is_active, buildings(id, building_name)")
        .eq("is_active", true)
        .order("flat_number");

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        flats: (data as any) || [],
      }));
    } catch (err: any) {
      console.error("Error fetching flats:", err);
      setState((prev) => ({
        ...prev,
        error: err.message || "Failed to fetch flats",
      }));
    }
  }, []);

  // Fetch all active residents with flat details
  const fetchResidents = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("residents")
        .select(
          `id, full_name, phone, relation, flat_id, resident_code, vehicles, is_active, created_at, updated_at,
           flats(id, flat_number, building_id, buildings(id, building_name))`
        )
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        residents: (data as any) || [],
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching residents:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch residents",
      }));
    }
  }, []);

  // Create new resident
  const createResident = useCallback(
    async (data: {
      full_name: string;
      phone: string;
      relation: string;
      flat_id: string;
      resident_code: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("residents").insert({
          ...data,
          is_active: true,
        });

        if (error) throw error;

        toast({
          title: "Resident Created",
          description: `${data.full_name} has been added successfully.`,
        });
        await fetchResidents();
        return { success: true };
      } catch (err: any) {
        const msg = err.message || "Failed to create resident";
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        return { success: false, error: msg };
      }
    },
    [fetchResidents, toast]
  );

  // Update resident
  const updateResident = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Resident, "id" | "created_at" | "updated_at">>
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("residents")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Resident Updated",
          description: "Resident details have been updated successfully.",
        });
        await fetchResidents();
        return { success: true };
      } catch (err: any) {
        const msg = err.message || "Failed to update resident";
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        return { success: false, error: msg };
      }
    },
    [fetchResidents, toast]
  );

  // Soft delete resident (archive)
  const deleteResident = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("residents")
          .update({ is_active: false })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Resident Archived",
          description: "Resident has been archived successfully.",
        });
        await fetchResidents();
        return { success: true };
      } catch (err: any) {
        const msg = err.message || "Failed to archive resident";
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
        return { success: false, error: msg };
      }
    },
    [fetchResidents, toast]
  );

  const refresh = useCallback(() => {
    fetchFlats();
    fetchResidents();
  }, [fetchFlats, fetchResidents]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    createResident,
    updateResident,
    deleteResident,
    refresh,
  };
}

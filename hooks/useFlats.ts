"use client";

import { useMemo } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";

export interface FlatRow {
  id: string;
  flat_number: string;
  building_id: string;
  floor_number: number | null;
  flat_type: string | null;
  area_sqft: number | null;
  ownership_type: string | null;
  is_occupied: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface CreateFlatPayload {
  flat_number: string;
  floor_number?: number;
  flat_type?: "1bhk" | "2bhk" | "3bhk" | "penthouse";
  area_sqft?: number;
  ownership_type?: "owner" | "tenant";
}

export function useFlats(societyId: string | null, buildingId: string | null) {
  const query = useSupabaseQuery<FlatRow>(
    async () => {
      if (!buildingId) return [];
      const { data, error } = await supabase
        .from("flats")
        .select("*")
        .eq("building_id", buildingId)
        .order("flat_number");
      if (error) throw error;
      return data ?? [];
    },
    [buildingId],
  );

  const { execute: createFlat, isLoading: isCreating } = useSupabaseMutation<
    CreateFlatPayload,
    FlatRow
  >(
    async (payload) => {
      const res = await fetch(
        `/api/admin/societies/${societyId}/buildings/${buildingId}/flats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create flat");
      query.refresh();
      return json.data;
    },
    { successMessage: "Flat created" },
  );

  const { execute: updateFlat, isLoading: isUpdating } = useSupabaseMutation<
    { id: string } & Partial<CreateFlatPayload> & { is_occupied?: boolean; is_active?: boolean },
    FlatRow
  >(
    async ({ id, ...payload }) => {
      const res = await fetch(
        `/api/admin/societies/${societyId}/buildings/${buildingId}/flats/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update flat");
      query.refresh();
      return json.data;
    },
    { successMessage: "Flat updated" },
  );

  const { execute: deactivateFlat, isLoading: isDeactivating } = useSupabaseMutation<
    string,
    FlatRow
  >(
    async (id) => {
      const res = await fetch(
        `/api/admin/societies/${societyId}/buildings/${buildingId}/flats/${id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate flat");
      query.refresh();
      return json.data;
    },
    { successMessage: "Flat deactivated" },
  );

  const stats = useMemo(
    () => ({
      total: query.data.length,
      occupied: query.data.filter((f) => f.is_occupied).length,
      vacant: query.data.filter((f) => !f.is_occupied && f.is_active).length,
      active: query.data.filter((f) => f.is_active).length,
    }),
    [query.data],
  );

  return {
    flats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refresh,
    createFlat,
    updateFlat,
    deactivateFlat,
    isCreating,
    isUpdating,
    isDeactivating,
    stats,
  };
}

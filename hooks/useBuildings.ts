"use client";

import { useMemo } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";

export interface BuildingRow {
  id: string;
  building_code: string;
  building_name: string;
  society_id: string;
  total_floors: number | null;
  total_flats: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface CreateBuildingPayload {
  building_code: string;
  building_name: string;
  total_floors?: number;
  total_flats?: number;
}

export function useBuildings(societyId: string | null) {
  const query = useSupabaseQuery<BuildingRow>(
    async () => {
      if (!societyId) return [];
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("society_id", societyId)
        .order("building_name");
      if (error) throw error;
      return data ?? [];
    },
    [societyId],
  );

  const { execute: createBuilding, isLoading: isCreating } = useSupabaseMutation<
    CreateBuildingPayload,
    BuildingRow
  >(
    async (payload) => {
      const res = await fetch(`/api/admin/societies/${societyId}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create building");
      query.refresh();
      return json.data;
    },
    { successMessage: "Building created" },
  );

  const { execute: updateBuilding, isLoading: isUpdating } = useSupabaseMutation<
    { id: string } & Partial<CreateBuildingPayload> & { is_active?: boolean },
    BuildingRow
  >(
    async ({ id, ...payload }) => {
      const res = await fetch(`/api/admin/societies/${societyId}/buildings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update building");
      query.refresh();
      return json.data;
    },
    { successMessage: "Building updated" },
  );

  const { execute: deactivateBuilding, isLoading: isDeactivating } = useSupabaseMutation<
    string,
    BuildingRow
  >(
    async (id) => {
      const res = await fetch(`/api/admin/societies/${societyId}/buildings/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate building");
      query.refresh();
      return json.data;
    },
    { successMessage: "Building deactivated" },
  );

  const stats = useMemo(
    () => ({
      total: query.data.length,
      active: query.data.filter((b) => b.is_active).length,
      totalFlats: query.data.reduce((sum, b) => sum + (b.total_flats ?? 0), 0),
    }),
    [query.data],
  );

  return {
    buildings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refresh,
    createBuilding,
    updateBuilding,
    deactivateBuilding,
    isCreating,
    isUpdating,
    isDeactivating,
    stats,
  };
}

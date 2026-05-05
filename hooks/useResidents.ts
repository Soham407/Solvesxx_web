"use client";

import { useMemo } from "react";

import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";
import {
  mapResidentListRow,
  type CreateResidentPayload,
  type CreateResidentResult,
  type ResidentRow,
  type ResidentQueryRecord,
  type UpdateResidentPayload,
} from "@/src/lib/residents/residentListTransforms";

export type {
  CreateResidentPayload,
  CreateResidentResult,
  ResidentRow,
  UpdateResidentPayload,
} from "@/src/lib/residents/residentListTransforms";

export function useResidents() {
  const query = useSupabaseQuery<ResidentRow>(async () => {
    const { data, error } = await supabase
      .from("residents")
      .select(`
        id,
        resident_code,
        full_name,
        phone,
        email,
        is_active,
        auth_user_id,
        flat_id,
        created_at,
        flat:flats(
          flat_number,
          building:buildings(
            id,
            building_name,
            society_id,
            society:societies(
              id,
              society_name
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as ResidentQueryRecord[]).map(mapResidentListRow);
  });

  const { execute: createResident, isLoading: isCreating } = useSupabaseMutation<
    CreateResidentPayload,
    CreateResidentResult
  >(
    async (payload) => {
      const res = await fetch("/api/admin/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create resident");
      query.refresh();
      return { resident: json.data, temp_password: json.temp_password as string };
    },
    { successMessage: "Resident created" },
  );

  const { execute: updateResident, isLoading: isUpdating } = useSupabaseMutation<
    UpdateResidentPayload,
    ResidentRow
  >(
    async ({ id, ...payload }) => {
      const res = await fetch(`/api/admin/residents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update resident");
      query.refresh();
      return json.data;
    },
    { successMessage: "Resident updated" },
  );

  const { execute: deactivateResident, isLoading: isDeactivating } = useSupabaseMutation<
    string,
    ResidentRow
  >(
    async (id) => {
      const res = await fetch(`/api/admin/residents/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate resident");
      query.refresh();
      return json.data;
    },
    { successMessage: "Resident deactivated" },
  );

  const stats = useMemo(
    () => ({
      total: query.data.length,
      active: query.data.filter((resident) => resident.is_active).length,
    }),
    [query.data],
  );

  return {
    residents: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refresh,
    createResident,
    updateResident,
    deactivateResident,
    isCreating,
    isUpdating,
    isDeactivating,
    stats,
  };
}

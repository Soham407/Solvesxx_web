"use client";

import { useMemo } from "react";

import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";

export interface ResidentRow {
  id: string;
  resident_code: string | null;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  auth_user_id: string | null;
  flat_id: string | null;
  flat_number: string | null;
  building_id: string | null;
  building_name: string | null;
  society_id: string | null;
  society_name: string | null;
  created_at: string | null;
}

export interface CreateResidentPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  flat_id: string;
  society_id: string;
}

export interface UpdateResidentPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

function splitFullName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" ") || "",
  };
}

function getNestedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

interface ResidentQueryRecord {
  id: string;
  resident_code: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  auth_user_id: string | null;
  flat_id: string | null;
  created_at: string | null;
  flat:
    | {
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }
    | Array<{
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }>
    | null;
}

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

    return ((data ?? []) as ResidentQueryRecord[]).map((resident) => {
      const flat = getNestedRecord(resident.flat);
      const building = getNestedRecord(flat?.building);
      const society = getNestedRecord(building?.society);
      const names = splitFullName(resident.full_name);

      return {
        id: resident.id,
        resident_code: resident.resident_code ?? null,
        full_name: resident.full_name ?? "",
        first_name: names.first_name,
        last_name: names.last_name,
        phone: resident.phone ?? "",
        email: resident.email ?? "",
        is_active: resident.is_active !== false,
        auth_user_id: resident.auth_user_id ?? null,
        flat_id: resident.flat_id ?? null,
        flat_number: flat?.flat_number ?? null,
        building_id: building?.id ?? null,
        building_name: building?.building_name ?? null,
        society_id: building?.society_id ?? society?.id ?? null,
        society_name: society?.society_name ?? null,
        created_at: resident.created_at ?? null,
      } satisfies ResidentRow;
    });
  });

  const { execute: createResident, isLoading: isCreating } = useSupabaseMutation<
    CreateResidentPayload,
    ResidentRow
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
      return json.data;
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

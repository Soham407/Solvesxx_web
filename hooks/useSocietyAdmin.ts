"use client";

import { useMemo } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";

export interface SocietyRow {
  id: string;
  society_code: string;
  society_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  total_buildings: number | null;
  total_flats: number | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  society_manager_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface CreateSocietyPayload {
  society_code: string;
  society_name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  total_buildings?: number;
  total_flats?: number;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
}

export function useSocietyAdmin() {
  const query = useSupabaseQuery<SocietyRow>(async () => {
    const { data, error } = await supabase
      .from("societies")
      .select("*")
      .order("society_name");
    if (error) throw error;
    return data ?? [];
  });

  const { execute: createSociety, isLoading: isCreating } = useSupabaseMutation<
    CreateSocietyPayload,
    SocietyRow
  >(
    async (payload) => {
      const res = await fetch("/api/admin/societies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create society");
      query.refresh();
      return json.data;
    },
    { successMessage: "Society created" },
  );

  const { execute: updateSociety, isLoading: isUpdating } = useSupabaseMutation<
    { id: string } & Partial<CreateSocietyPayload> & { is_active?: boolean },
    SocietyRow
  >(
    async ({ id, ...payload }) => {
      const res = await fetch(`/api/admin/societies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update society");
      query.refresh();
      return json.data;
    },
    { successMessage: "Society updated" },
  );

  const { execute: deactivateSociety, isLoading: isDeactivating } = useSupabaseMutation<
    string,
    SocietyRow
  >(
    async (id) => {
      const res = await fetch(`/api/admin/societies/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate society");
      query.refresh();
      return json.data;
    },
    { successMessage: "Society deactivated" },
  );

  const stats = useMemo(
    () => ({
      total: query.data.length,
      active: query.data.filter((s) => s.is_active).length,
      totalFlats: query.data.reduce((sum, s) => sum + (s.total_flats ?? 0), 0),
    }),
    [query.data],
  );

  return {
    societies: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refresh,
    createSociety,
    updateSociety,
    deactivateSociety,
    isCreating,
    isUpdating,
    isDeactivating,
    stats,
  };
}

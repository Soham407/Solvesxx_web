import { useAuth } from "@/hooks/useAuth";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";
import {
  CompanyLocation,
  CompanyLocationInsert,
  CompanyLocationUpdate,
} from "@/src/types/company";

export function useCompanyLocations() {
  const { userId } = useAuth();

  const {
    data: locations,
    isLoading,
    error,
    refresh,
  } = useSupabaseQuery<CompanyLocation>(async () => {
    const { data, error: queryError } = await supabase
      .from("company_locations")
      .select("*")
      .order("location_name");

    if (queryError) {
      throw queryError;
    }

    return (data as CompanyLocation[] | null) ?? [];
  });

  const { execute: createLocation, isLoading: isCreating } = useSupabaseMutation<
    CompanyLocationInsert,
    CompanyLocation
  >(
    async (payload) => {
      const nextPayload: CompanyLocationInsert = {
        ...payload,
        created_by: payload.created_by ?? userId ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from("company_locations")
        .insert(nextPayload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      refresh();
      return data as CompanyLocation;
    },
    { successMessage: "Location created successfully" }
  );

  const { execute: updateLocation, isLoading: isUpdating } = useSupabaseMutation<
    { id: string; payload: CompanyLocationUpdate },
    CompanyLocation
  >(
    async ({ id, payload }) => {
      const nextPayload: CompanyLocationUpdate = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("company_locations")
        .update(nextPayload)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      refresh();
      return data as CompanyLocation;
    },
    { successMessage: "Location updated successfully" }
  );

  return {
    locations,
    isLoading,
    error,
    refresh,
    createLocation,
    updateLocation,
    isCreating,
    isUpdating,
  };
}

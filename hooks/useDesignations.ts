import { supabase } from "@/src/lib/supabaseClient";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { Designation, DesignationInsert, DesignationUpdate } from "@/src/types/company";

function normalizeDesignationKey(designation: Pick<Designation, "designation_name" | "department">) {
  const title = designation.designation_name?.trim().toLowerCase() || "";
  const department = designation.department?.trim().toLowerCase() || "";
  return `${title}::${department}`;
}

function dedupeDesignations(rows: Designation[]) {
  const seen = new Set<string>();
  const deduped: Designation[] = [];

  for (const designation of rows) {
    const key = normalizeDesignationKey(designation);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(designation);
  }

  return deduped;
}

/**
 * Hook for managing Designation Master data.
 */
export function useDesignations() {
  // READ: Fetch all designations
  const { 
    data: designations, 
    isLoading, 
    error, 
    refresh 
  } = useSupabaseQuery<Designation>(async () => {
    const { data, error } = await supabase
      .from("designations")
      .select("*")
      .order("is_active", { ascending: false })
      .order("designation_name");
    
    if (error) throw error;
    return dedupeDesignations((data as Designation[] | null) ?? []);
  });

  // WRITE: Create new designation
  const { execute: createDesignation, isLoading: isCreating } = useSupabaseMutation<
    DesignationInsert, 
    Designation
  >(
    async (payload) => {
      const { data, error } = await supabase
        .from("designations")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      refresh();
      return data as Designation;
    },
    { successMessage: "Designation created successfully" }
  );

  // WRITE: Update existing designation
  const { execute: updateDesignation, isLoading: isUpdating } = useSupabaseMutation<
    { id: string; payload: DesignationUpdate },
    Designation
  >(
    async ({ id, payload }) => {
      const { data, error } = await supabase
        .from("designations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      refresh();
      return data as Designation;
    },
    { successMessage: "Designation updated successfully" }
  );

  // WRITE: Delete designation
  const { execute: deleteDesignation, isLoading: isDeleting } = useSupabaseMutation<
    string,
    void
  >(
    async (id) => {
      const { error } = await supabase
        .from("designations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      refresh();
    },
    { successMessage: "Designation deleted successfully" }
  );

  return {
    designations,
    isLoading,
    error,
    refresh,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    isCreating,
    isUpdating,
    isDeleting,
  };
}

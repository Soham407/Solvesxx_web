import { supabase } from "@/src/lib/supabaseClient";

export async function getCurrentEmployeeId() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated. Please log in and try again.");
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.id) {
    throw new Error("Employee record not found for the authenticated user.");
  }

  return data.id;
}

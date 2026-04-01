import { supabase } from "@/src/lib/supabaseClient";

export async function getCurrentUserId() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated. Please log in and try again.");
  }

  return user.id;
}

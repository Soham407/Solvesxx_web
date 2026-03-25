import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

/** Returns residents that have no auth_user_id yet (not provisioned as a login account). */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("residents")
      .select("id, full_name, resident_code, flats(flat_number, buildings(building_name))")
      .is("auth_user_id", null)
      .eq("is_active", true)
      .order("full_name");

    if (error) throw error;

    return NextResponse.json({ residents: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch residents" }, { status: 500 });
  }
}

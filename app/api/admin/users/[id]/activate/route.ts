import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = ["admin", "super_admin"];
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { id: targetUserId } = params;
    const supabase = await createServerClient();
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Authorization check ---
    const { data: callerRecord } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", callerUser.id)
      .single();

    const callerRole = (callerRecord as any)?.roles?.role_name;

    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // --- Update public.users status ---
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ is_active: true })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    // --- Remove ban in auth.users ---
    // Setting ban_duration to "0s" removes the ban
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { ban_duration: "0s" }
    );

    if (authUpdateError) throw authUpdateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error activating user:", err);
    return NextResponse.json({ error: err.message || "Failed to activate user" }, { status: 500 });
  }
}

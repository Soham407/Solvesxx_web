import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = ["admin", "super_admin"];
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { id: targetUserId } = params;
    const { role_id } = await req.json();

    if (!role_id) {
      return NextResponse.json({ error: "role_id is required" }, { status: 400 });
    }

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

    // --- Get target role details ---
    const { data: targetRole, error: roleError } = await supabase
      .from("roles")
      .select("role_name")
      .eq("id", role_id)
      .single();

    if (roleError || !targetRole) {
      return NextResponse.json({ error: "Invalid role_id" }, { status: 400 });
    }

    const roleName = (targetRole as any).role_name;

    // --- Prevent changing role to admin-tier via this endpoint ---
    if (ALLOWED_ROLES.includes(roleName)) {
      return NextResponse.json({ error: "Cannot assign admin-tier roles via this endpoint" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // --- Update public.users ---
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ role_id })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    // --- Update auth.users metadata to keep JWT in sync ---
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { role: roleName } }
    );

    if (authUpdateError) {
      console.warn("Public role updated but auth metadata failed:", authUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating user role:", err);
    return NextResponse.json({ error: err.message || "Failed to update role" }, { status: 500 });
  }
}

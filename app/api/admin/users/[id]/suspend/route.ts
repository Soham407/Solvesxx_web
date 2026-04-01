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

    // --- Prevent suspending self ---
    if (callerUser.id === targetUserId) {
       return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // --- Check if target is admin tier ---
    const { data: targetUser } = await supabase
       .from("users")
       .select("roles(role_name)")
       .eq("id", targetUserId)
       .single();
    
    const targetRole = (targetUser as any)?.roles?.role_name;
    if (ALLOWED_ROLES.includes(targetRole)) {
       return NextResponse.json({ error: "Cannot suspend admin-tier accounts" }, { status: 403 });
    }

    // --- Update public.users status ---
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ is_active: false })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    // --- Set banned_until in auth.users to invalidate active sessions ---
    // 876600h = ~100 years
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { ban_duration: "876600h" }
    );

    if (authUpdateError) throw authUpdateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error suspending user:", err);
    return NextResponse.json({ error: err.message || "Failed to suspend user" }, { status: 500 });
  }
}

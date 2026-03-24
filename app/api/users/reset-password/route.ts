import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

/** Roles permitted to trigger password resets */
const ALLOWED_ROLES = ["admin", "super_admin"];
const ADMIN_ROLE_NAMES = new Set(["admin", "super_admin"]);

export async function POST(req: NextRequest) {
  try {
    // --- Authentication check ---
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Authorization check: resolve caller's role ---
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: "Forbidden — could not resolve user role" },
        { status: 403 }
      );
    }

    const roleName = (userRecord as any)?.roles?.role_name as string | undefined;

    if (!roleName || !ALLOWED_ROLES.includes(roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- Validated: proceed with password reset ---
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, email, roles!inner(role_name)")
      .eq("email", email)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const targetRole = Array.isArray((targetUser as any).roles)
      ? (targetUser as any).roles[0]
      : (targetUser as any).roles;

    if (
      ADMIN_ROLE_NAMES.has(targetRole?.role_name ?? "") &&
      roleName !== "super_admin"
    ) {
      return NextResponse.json(
        { error: "Only super admins can reset admin-tier accounts" },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send reset link" }, { status: 500 });
  }
}

import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "society_manager"]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeSecurityReset() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
    };
  }

  const { data: userRecord, error: userError } = await supabase
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !userRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  const roleRecord = Array.isArray((userRecord as any).roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any).roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !ALLOWED_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return {
    error: null,
    userId: user.id,
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await authorizeSecurityReset();
  if (auth.error) {
    return auth.error;
  }

  try {
    const params = await context.params;
    const supabaseAdmin = createAdminClient();

    const { data: employeeRecord, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, auth_user_id, email, first_name, last_name")
      .eq("id", params.id)
      .maybeSingle();

    if (employeeError || !employeeRecord) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (!employeeRecord.auth_user_id) {
      return NextResponse.json(
        { error: "This employee does not have a linked login account yet." },
        { status: 400 },
      );
    }

    const temporaryPassword = crypto.randomBytes(8).toString("hex");

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(employeeRecord.auth_user_id, {
      password: temporaryPassword,
    });

    if (authUpdateError) {
      throw authUpdateError;
    }

    const { error: publicUserError } = await supabaseAdmin
      .from("users")
      .update({ must_change_password: true, is_active: true })
      .eq("id", employeeRecord.auth_user_id);

    if (publicUserError) {
      throw publicUserError;
    }

    return NextResponse.json({
      success: true,
      temporary_password: temporaryPassword,
      email: employeeRecord.email,
      full_name: [employeeRecord.first_name, employeeRecord.last_name].filter(Boolean).join(" ").trim(),
    });
  } catch (error) {
    console.error("Failed to reset employee security credentials", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset security credentials" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const UNLINKED_RESIDENT_ROLES = new Set(["admin", "super_admin", "society_manager"]);
const ProvisionResidentAuthSchema = z.object({
  resident_id: z.string().uuid(),
  email: z.string().email(),
  temp_password: z.string().min(8, "Temporary password must be at least 8 characters"),
});

type UserLookupRecord = {
  is_active?: boolean | null;
  must_change_password?: boolean | null;
  roles?:
    | {
        role_name?: string | null;
      }
    | Array<{
        role_name?: string | null;
      }>
    | null;
};

type AuthorizedResidentManager =
  | {
      error: NextResponse;
      supabase?: never;
      supabaseAdmin?: never;
      roleName?: never;
    }
  | {
      error: null;
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      supabaseAdmin: ReturnType<typeof createServiceRoleClient>;
      roleName: string;
    };

async function getAuthorizedResidentManager(): Promise<AuthorizedResidentManager> {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // DB lookup for role — user_metadata is user-writable and must not be trusted for authorization.
  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("is_active, must_change_password, roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !userRecord) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const authRecord = userRecord as UserLookupRecord;
  const roleRecord = Array.isArray(authRecord.roles) ? authRecord.roles[0] : authRecord.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (authRecord.is_active === false || authRecord.must_change_password === true) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (!roleName || !UNLINKED_RESIDENT_ROLES.has(roleName)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    error: null,
    supabase,
    supabaseAdmin,
    roleName,
  };
}

/** Returns residents that have no auth_user_id yet (not provisioned as a login account). */
export async function GET() {
  try {
    const auth = await getAuthorizedResidentManager();
    if (auth.error) {
      return auth.error;
    }

    const { data, error } = await auth.supabase
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

/**
 * Provision a login account for an existing unlinked resident.
 * Restricted to admin, super_admin, and society_manager.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthorizedResidentManager();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const parsed = ProvisionResidentAuthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 }
      );
    }

    const { data: residentRecord, error: residentError } = await auth.supabaseAdmin
      .from("residents")
      .select("id, full_name, resident_code, is_active, auth_user_id")
      .eq("id", parsed.data.resident_id)
      .maybeSingle();

    if (residentError) {
      throw residentError;
    }

    if (!residentRecord || residentRecord.is_active === false) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    if (residentRecord.auth_user_id) {
      return NextResponse.json({ error: "Resident is already linked to a login account" }, { status: 409 });
    }

    const { data: residentRole, error: residentRoleError } = await auth.supabaseAdmin
      .from("roles")
      .select("id")
      .eq("role_name", "resident")
      .single();

    if (residentRoleError || !residentRole) {
      throw residentRoleError ?? new Error("Resident role not found");
    }

    const { data: authUser, error: createAuthError } = await auth.supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.temp_password,
      email_confirm: true,
      user_metadata: {
        full_name: residentRecord.full_name ?? undefined,
      },
    });

    if (createAuthError || !authUser.user) {
      if (
        createAuthError?.message?.includes("already registered") ||
        createAuthError?.message?.includes("already been registered")
      ) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }

      throw createAuthError ?? new Error("Failed to create auth user");
    }

    const newAuthUserId = authUser.user.id;
    const baseUsername = parsed.data.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
    const username = `${baseUsername}_${Date.now().toString(36)}`.slice(0, 64);

    try {
      const { error: userInsertError } = await auth.supabaseAdmin.from("users").insert({
        id: newAuthUserId,
        full_name: residentRecord.full_name,
        email: parsed.data.email,
        role_id: (residentRole as { id: string }).id,
        username,
        must_change_password: true,
        is_active: true,
      });

      if (userInsertError) {
        throw userInsertError;
      }

      const { data: linkedResident, error: linkError } = await auth.supabaseAdmin
        .from("residents")
        .update({
          auth_user_id: newAuthUserId,
          email: parsed.data.email,
        })
        .eq("id", residentRecord.id)
        .is("auth_user_id", null)
        .select("id, full_name, resident_code")
        .maybeSingle();

      if (linkError) {
        throw linkError;
      }

      if (!linkedResident) {
        throw new Error("Resident record could not be linked");
      }

      return NextResponse.json(
        {
          success: true,
          resident: linkedResident,
          user_id: newAuthUserId,
        },
        { status: 201 }
      );
    } catch (provisionError) {
      await auth.supabaseAdmin.from("users").delete().eq("id", newAuthUserId);
      await auth.supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
      throw provisionError;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to provision resident account" },
      { status: 500 }
    );
  }
}

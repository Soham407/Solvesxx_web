import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const CreateResidentSchema = z.object({
  flat_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(20).optional().default(""),
  relation: z.string().trim().min(1).max(50),
  // Optional login account creation
  email: z.string().email().optional().or(z.literal("")),
  temp_password: z.string().min(8).optional().or(z.literal("")),
});

const RESIDENT_MANAGEMENT_ROLES = new Set([
  "admin",
  "super_admin",
  "society_manager",
]);

async function getAuthorizedResidentManager() {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();
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

  const { data: userRecord, error: userError } = await supabaseAdmin
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

  const roleRecord = Array.isArray((userRecord as any)?.roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !RESIDENT_MANAGEMENT_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
      roleName: null as string | null,
    };
  }

  return { error: null, userId: user.id, roleName };
}

async function canManageFlat(flatId: string) {
  const supabase = await createServerClient();
  const { data: flatRecord, error: flatError } = await supabase
    .from("flats")
    .select("id")
    .eq("id", flatId)
    .maybeSingle();

  return !flatError && !!flatRecord;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedResidentManager();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = CreateResidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    if (
      auth.roleName === "society_manager" &&
      !(await canManageFlat(parsed.data.flat_id))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const residentCode = `RES-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()}`;

    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .from("residents")
      .insert({
        flat_id: parsed.data.flat_id,
        full_name: parsed.data.full_name,
        is_active: true,
        phone: parsed.data.phone || null,
        relation: parsed.data.relation,
        resident_code: residentCode,
      })
      .select("id, full_name, resident_code")
      .single();

    if (error) throw error;

    const newResidentId = (data as any).id;
    const { email, temp_password } = parsed.data;

    // Optionally create a login account for this resident
    if (email && temp_password) {
      let newAuthUserId: string | null = null;

      try {
        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: temp_password,
          email_confirm: true,
        });

        if (authError) {
          if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
            // Roll back resident record
            await supabaseAdmin.from("residents").delete().eq("id", newResidentId);
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
          }
          throw authError;
        }

        newAuthUserId = authUser.user.id;

        // Look up resident role_id
        const { data: roleRow, error: roleError } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("role_name", "resident")
          .single();

        if (roleError || !roleRow) throw new Error("Resident role not found");

        // Generate username from email
        const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
        const username = `${baseUsername}_${Date.now().toString(36)}`;

        // Insert users row
        const { error: userInsertError } = await supabaseAdmin.from("users").insert({
          id: newAuthUserId,
          full_name: parsed.data.full_name,
          email,
          role_id: (roleRow as any).id,
          username,
          must_change_password: true,
          is_active: true,
        });

        if (userInsertError) throw userInsertError;

        // Link auth_user_id on the resident record
        const { error: linkError } = await supabaseAdmin
          .from("residents")
          .update({ auth_user_id: newAuthUserId })
          .eq("id", newResidentId);

        if (linkError) throw linkError;

      } catch (accountError: unknown) {
        // Roll back: delete auth user and resident record
        if (newAuthUserId) await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
        await supabaseAdmin.from("residents").delete().eq("id", newResidentId);
        console.error("Account creation failed, rolled back resident:", accountError);
        return NextResponse.json(
          { error: accountError instanceof Error ? accountError.message : "Failed to create login account" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, resident: data });
  } catch (error: unknown) {
    console.error("Resident creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create resident" },
      { status: 500 },
    );
  }
}

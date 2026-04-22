import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";
import { insertAuditLog } from "@/src/lib/platform/audit";

const SOCIETY_ADMIN_ROLES = new Set(["admin", "super_admin", "society_manager"]);

async function getAuthorizedSocietyAdmin() {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  const { data: callerRecord, error: callerError } = await supabaseAdmin
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError || !callerRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  const roleRecord = Array.isArray((callerRecord as any).roles)
    ? (callerRecord as any).roles[0]
    : (callerRecord as any).roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !SOCIETY_ADMIN_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  return { error: null, supabaseAdmin, callerUserId: user.id };
}

const CreateSocietySchema = z.object({
  society_code: z.string().trim().min(1).max(20),
  society_name: z.string().trim().min(1).max(200),
  address: z.string().trim().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  total_buildings: z.number().int().nonnegative().optional(),
  total_flats: z.number().int().nonnegative().optional(),
  contact_person: z.string().trim().max(100).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    let query = auth.supabaseAdmin
      .from("societies")
      .select("*")
      .order("society_name");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch societies" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateSocietySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const { data: existing } = await auth.supabaseAdmin
      .from("societies")
      .select("id")
      .eq("society_code", payload.society_code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A society with this code already exists" },
        { status: 409 },
      );
    }

    const { data: row, error: insertError } = await auth.supabaseAdmin
      .from("societies")
      .insert({ ...payload, is_active: true })
      .select()
      .single();

    if (insertError || !row) throw insertError ?? new Error("Insert failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "societies",
      entityId: (row as any).id,
      action: "society.created",
      actorId: auth.callerUserId,
      newData: row,
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create society" },
      { status: 500 },
    );
  }
}

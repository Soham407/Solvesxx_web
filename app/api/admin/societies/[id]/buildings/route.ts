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

  const { data: callerRecord } = await supabaseAdmin
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  const roleRecord = Array.isArray((callerRecord as any)?.roles)
    ? (callerRecord as any).roles[0]
    : (callerRecord as any)?.roles;
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

const CreateBuildingSchema = z.object({
  building_code: z.string().trim().min(1).max(20),
  building_name: z.string().trim().min(1).max(100),
  total_floors: z.number().int().nonnegative().optional(),
  total_flats: z.number().int().nonnegative().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  const { id: societyId } = await params;

  try {
    const { data, error } = await auth.supabaseAdmin
      .from("buildings")
      .select("*")
      .eq("society_id", societyId)
      .order("building_name");

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch buildings" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id: societyId } = await params;

  try {
    const body = await request.json();
    const parsed = CreateBuildingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const { data: existing } = await auth.supabaseAdmin
      .from("buildings")
      .select("id")
      .eq("society_id", societyId)
      .eq("building_code", payload.building_code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A building with this code already exists in this society" },
        { status: 409 },
      );
    }

    const { data: row, error: insertError } = await auth.supabaseAdmin
      .from("buildings")
      .insert({ ...payload, society_id: societyId, is_active: true })
      .select()
      .single();

    if (insertError || !row) throw insertError ?? new Error("Insert failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "buildings",
      entityId: (row as any).id,
      action: "building.created",
      actorId: auth.callerUserId,
      newData: row,
      metadata: { society_id: societyId },
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create building" },
      { status: 500 },
    );
  }
}

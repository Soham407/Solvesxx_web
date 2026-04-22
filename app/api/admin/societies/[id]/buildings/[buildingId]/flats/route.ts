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

const CreateFlatSchema = z.object({
  flat_number: z.string().trim().min(1).max(20),
  floor_number: z.number().int().optional(),
  flat_type: z.enum(["1bhk", "2bhk", "3bhk", "penthouse"]).optional(),
  area_sqft: z.number().nonnegative().optional(),
  ownership_type: z.enum(["owner", "tenant"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  const { buildingId } = await params;

  try {
    const { data, error } = await auth.supabaseAdmin
      .from("flats")
      .select("*")
      .eq("building_id", buildingId)
      .order("flat_number");

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch flats" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id: societyId, buildingId } = await params;

  try {
    const body = await request.json();
    const parsed = CreateFlatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const { data: existing } = await auth.supabaseAdmin
      .from("flats")
      .select("id")
      .eq("building_id", buildingId)
      .eq("flat_number", payload.flat_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A flat with this number already exists in this building" },
        { status: 409 },
      );
    }

    const { data: row, error: insertError } = await auth.supabaseAdmin
      .from("flats")
      .insert({ ...payload, building_id: buildingId, is_occupied: false, is_active: true })
      .select()
      .single();

    if (insertError || !row) throw insertError ?? new Error("Insert failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "flats",
      entityId: (row as any).id,
      action: "flat.created",
      actorId: auth.callerUserId,
      newData: row,
      metadata: { building_id: buildingId, society_id: societyId },
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create flat" },
      { status: 500 },
    );
  }
}

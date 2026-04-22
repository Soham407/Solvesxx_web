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

const UpdateBuildingSchema = z.object({
  building_code: z.string().trim().min(1).max(20).optional(),
  building_name: z.string().trim().min(1).max(100).optional(),
  total_floors: z.number().int().nonnegative().optional(),
  total_flats: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  const { id: societyId, buildingId } = await params;

  try {
    const { data, error } = await auth.supabaseAdmin
      .from("buildings")
      .select("*, flats(id, flat_number, floor_number, flat_type, ownership_type, is_occupied, is_active, created_at)")
      .eq("id", buildingId)
      .eq("society_id", societyId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch building" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id: societyId, buildingId } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateBuildingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    if (payload.building_code) {
      const { data: conflict } = await auth.supabaseAdmin
        .from("buildings")
        .select("id")
        .eq("society_id", societyId)
        .eq("building_code", payload.building_code)
        .neq("id", buildingId)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "Another building in this society already uses this code" },
          { status: 409 },
        );
      }
    }

    const { data: oldRow } = await auth.supabaseAdmin
      .from("buildings")
      .select("*")
      .eq("id", buildingId)
      .single();

    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("buildings")
      .update(payload)
      .eq("id", buildingId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Update failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "buildings",
      entityId: buildingId,
      action: "building.updated",
      actorId: auth.callerUserId,
      oldData: oldRow,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update building" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id: societyId, buildingId } = await params;

  try {
    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("buildings")
      .update({ is_active: false })
      .eq("id", buildingId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Deactivate failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "buildings",
      entityId: buildingId,
      action: "building.deactivated",
      actorId: auth.callerUserId,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate building" },
      { status: 500 },
    );
  }
}

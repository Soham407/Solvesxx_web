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

const UpdateFlatSchema = z.object({
  flat_number: z.string().trim().min(1).max(20).optional(),
  floor_number: z.number().int().optional(),
  flat_type: z.enum(["1bhk", "2bhk", "3bhk", "penthouse"]).optional(),
  area_sqft: z.number().nonnegative().optional(),
  ownership_type: z.enum(["owner", "tenant"]).optional(),
  is_occupied: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string; flatId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { buildingId, flatId } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateFlatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    if (payload.flat_number) {
      const { data: conflict } = await auth.supabaseAdmin
        .from("flats")
        .select("id")
        .eq("building_id", buildingId)
        .eq("flat_number", payload.flat_number)
        .neq("id", flatId)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "Another flat in this building already uses this number" },
          { status: 409 },
        );
      }
    }

    const { data: oldRow } = await auth.supabaseAdmin
      .from("flats")
      .select("*")
      .eq("id", flatId)
      .single();

    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("flats")
      .update(payload)
      .eq("id", flatId)
      .eq("building_id", buildingId)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Update failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "flats",
      entityId: flatId,
      action: "flat.updated",
      actorId: auth.callerUserId,
      oldData: oldRow,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update flat" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; buildingId: string; flatId: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { buildingId, flatId } = await params;

  try {
    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("flats")
      .update({ is_active: false })
      .eq("id", flatId)
      .eq("building_id", buildingId)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Deactivate failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "flats",
      entityId: flatId,
      action: "flat.deactivated",
      actorId: auth.callerUserId,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate flat" },
      { status: 500 },
    );
  }
}

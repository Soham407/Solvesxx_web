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

const UpdateSocietySchema = z.object({
  society_code: z.string().trim().min(1).max(20).optional(),
  society_name: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
  total_buildings: z.number().int().nonnegative().optional(),
  total_flats: z.number().int().nonnegative().optional(),
  contact_person: z.string().trim().max(100).optional(),
  contact_phone: z.string().trim().max(20).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  const { id } = await params;

  try {
    const { data, error } = await auth.supabaseAdmin
      .from("societies")
      .select("*, buildings(id, building_name, building_code, total_floors, total_flats, is_active, created_at)")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Society not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch society" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateSocietySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    if (payload.society_code) {
      const { data: conflict } = await auth.supabaseAdmin
        .from("societies")
        .select("id")
        .eq("society_code", payload.society_code)
        .neq("id", id)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "Another society already uses this code" },
          { status: 409 },
        );
      }
    }

    const { data: oldRow } = await auth.supabaseAdmin
      .from("societies")
      .select("*")
      .eq("id", id)
      .single();

    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("societies")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Update failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "societies",
      entityId: id,
      action: "society.updated",
      actorId: auth.callerUserId,
      oldData: oldRow,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update society" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  const { id } = await params;

  try {
    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("societies")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !row) throw updateError ?? new Error("Deactivate failed");

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "societies",
      entityId: id,
      action: "society.deactivated",
      actorId: auth.callerUserId,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate society" },
      { status: 500 },
    );
  }
}

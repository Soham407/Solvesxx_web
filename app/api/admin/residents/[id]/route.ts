import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { insertAuditLog } from "@/src/lib/platform/audit";
import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const SOCIETY_ADMIN_ROLES = new Set(["admin", "super_admin", "society_manager"]);

interface RoleLookupRecord {
  roles:
    | {
        role_name?: string | null;
      }
    | Array<{
        role_name?: string | null;
      }>
    | null;
}

interface ResidentRecord {
  id: string;
  auth_user_id: string | null;
  flat_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  [key: string]: unknown;
}

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

  const typedCallerRecord = callerRecord as RoleLookupRecord;
  const roleRecord = Array.isArray(typedCallerRecord.roles)
    ? typedCallerRecord.roles[0]
    : typedCallerRecord.roles;
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

const UpdateResidentSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(1).max(20).optional(),
  email: z.string().trim().email().optional(),
});

function buildFullName(firstName?: string, lastName?: string, fallback?: string | null) {
  if (!firstName && !lastName) {
    return (fallback ?? "").trim();
  }

  return [firstName?.trim() ?? "", lastName?.trim() ?? ""].filter(Boolean).join(" ").trim();
}

async function syncLinkedAuthUser(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  authUserId: string,
  values: { email?: string; phone?: string; full_name?: string },
) {
  const authPayload: Record<string, unknown> = {};

  if (values.email) authPayload.email = values.email;
  if (values.phone) {
    authPayload.phone = values.phone;
    authPayload.phone_confirm = true;
  }
  if (values.full_name) {
    authPayload.user_metadata = { full_name: values.full_name, role: "resident" };
  }

  if (Object.keys(authPayload).length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, authPayload);

  if (error) {
    if (
      error.message?.includes("already registered") ||
      error.message?.includes("already been registered")
    ) {
      throw new Error("A user with this email or phone already exists");
    }

    throw error;
  }
}

async function syncFlatOccupancy(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  flatId: string | null,
) {
  if (!flatId) {
    return;
  }

  const { count, error: activeResidentsError } = await supabaseAdmin
    .from("residents")
    .select("id", { count: "exact", head: true })
    .eq("flat_id", flatId)
    .eq("is_active", true);

  if (activeResidentsError) {
    throw activeResidentsError;
  }

  const { error: occupancyError } = await supabaseAdmin
    .from("flats")
    .update({ is_occupied: (count ?? 0) > 0 })
    .eq("id", flatId);

  if (occupancyError) {
    throw occupancyError;
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
    const parsed = UpdateResidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const { data: oldRow, error: existingError } = await auth.supabaseAdmin
      .from("residents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!oldRow) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const typedOldRow = oldRow as ResidentRecord;
    const nextFullName = buildFullName(payload.first_name, payload.last_name, typedOldRow.full_name);
    const updatePayload: Record<string, unknown> = {};

    if (payload.first_name || payload.last_name) {
      updatePayload.full_name = nextFullName;
    }
    if (payload.phone) {
      updatePayload.phone = payload.phone;
    }
    if (payload.email) {
      updatePayload.email = payload.email;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ data: oldRow });
    }

    if (typedOldRow.auth_user_id) {
      await syncLinkedAuthUser(auth.supabaseAdmin, typedOldRow.auth_user_id, {
        email: payload.email,
        phone: payload.phone,
        full_name: payload.first_name || payload.last_name ? nextFullName : undefined,
      });

      const { error: userUpdateError } = await auth.supabaseAdmin
        .from("users")
        .update({
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          ...(payload.first_name || payload.last_name ? { full_name: nextFullName } : {}),
        })
        .eq("id", typedOldRow.auth_user_id);

      if (userUpdateError) {
        throw userUpdateError;
      }
    }

    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("residents")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !row) {
      throw updateError ?? new Error("Update failed");
    }

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "residents",
      entityId: id,
      action: "resident.updated",
      actorId: auth.callerUserId,
      oldData: oldRow,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update resident" },
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
    const { data: oldRow, error: existingError } = await auth.supabaseAdmin
      .from("residents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!oldRow) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const { data: row, error: updateError } = await auth.supabaseAdmin
      .from("residents")
      .update({ is_active: false })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !row) {
      throw updateError ?? new Error("Deactivate failed");
    }

    const typedOldRow = oldRow as ResidentRecord;

    if (typedOldRow.auth_user_id) {
      const { error: userDeactivateError } = await auth.supabaseAdmin
        .from("users")
        .update({ is_active: false })
        .eq("id", typedOldRow.auth_user_id);

      if (userDeactivateError) {
        throw userDeactivateError;
      }

      const { error: authDeactivateError } = await auth.supabaseAdmin.auth.admin.updateUserById(
        typedOldRow.auth_user_id,
        { ban_duration: "876600h" },
      );

      if (authDeactivateError) {
        throw authDeactivateError;
      }
    }

    await syncFlatOccupancy(auth.supabaseAdmin, typedOldRow.flat_id ?? null);

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "residents",
      entityId: id,
      action: "resident.deactivated",
      actorId: auth.callerUserId,
      oldData: oldRow,
      newData: row,
    });

    return NextResponse.json({ data: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate resident" },
      { status: 500 },
    );
  }
}

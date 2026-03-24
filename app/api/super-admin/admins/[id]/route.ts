import { NextRequest, NextResponse } from "next/server";

import { insertAuditLog } from "@/src/lib/platform/audit";
import { extractPlatformPermissions } from "@/src/lib/platform/permissions";
import { requirePlatformPermission } from "@/src/lib/platform/server";
import type { AdminAccount } from "@/src/types/platform";

const ADMIN_ROLE_NAMES = ["admin", "super_admin"] as const;

type AdminRoleName = (typeof ADMIN_ROLE_NAMES)[number];

function isAdminRoleName(value: string): value is AdminRoleName {
  return ADMIN_ROLE_NAMES.includes(value as AdminRoleName);
}

function mapAdmin(row: any): AdminAccount {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    roleName: role?.role_name ?? "admin",
    roleDisplayName: role?.role_display_name ?? "Administrator",
    isActive: row.is_active !== false,
    lastLogin: row.last_login ?? null,
    permissions: extractPlatformPermissions(role?.permissions),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requirePlatformPermission("platform.admin_accounts.manage");
  if ("error" in context) {
    return context.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const requestedRoleName = body.roleName ? String(body.roleName).trim() : null;

    const { data: existingUser, error: existingError } = await context.supabase
      .from("users")
      .select(
        "id, full_name, email, phone, is_active, last_login, role_id, roles!inner(role_name, role_display_name, permissions)"
      )
      .eq("id", id)
      .single();

    if (existingError || !existingUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const currentRole = Array.isArray((existingUser as any).roles)
      ? (existingUser as any).roles[0]
      : (existingUser as any).roles;

    if (!isAdminRoleName(currentRole?.role_name ?? "")) {
      return NextResponse.json(
        { error: "Only admin-tier accounts can be updated here" },
        { status: 400 }
      );
    }

    if (requestedRoleName && !isAdminRoleName(requestedRoleName)) {
      return NextResponse.json({ error: "Invalid target role" }, { status: 400 });
    }

    const nextRoleName = requestedRoleName as AdminRoleName | null;
    const resultingRoleName = nextRoleName ?? currentRole.role_name;
    const resultingActiveState =
      typeof body.isActive === "boolean" ? body.isActive : existingUser.is_active !== false;

    if (
      context.user.id === id &&
      (resultingRoleName !== "super_admin" || resultingActiveState === false)
    ) {
      return NextResponse.json(
        { error: "You cannot suspend or demote your own super admin account" },
        { status: 400 }
      );
    }

    if (
      currentRole.role_name === "super_admin" &&
      (resultingRoleName !== "super_admin" || resultingActiveState === false)
    ) {
      const { count } = await context.supabase
        .from("users")
        .select("id, roles!inner(role_name)", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("roles.role_name", "super_admin");

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "At least one active super admin account must remain" },
          { status: 400 }
        );
      }
    }

    let roleId = existingUser.role_id;
    if (nextRoleName && nextRoleName !== currentRole.role_name) {
      const { data: nextRole, error: roleError } = await context.supabase
        .from("roles")
        .select("id")
        .eq("role_name", nextRoleName)
        .single();

      if (roleError || !nextRole) {
        return NextResponse.json({ error: "Target role not found" }, { status: 404 });
      }

      roleId = nextRole.id;
    }

    const updatePayload: Record<string, unknown> = {};
    if (body.fullName !== undefined) updatePayload.full_name = String(body.fullName).trim();
    if (body.phone !== undefined) {
      updatePayload.phone = body.phone ? String(body.phone).trim() : null;
    }
    if (body.isActive !== undefined) updatePayload.is_active = Boolean(body.isActive);
    if (roleId !== existingUser.role_id) updatePayload.role_id = roleId;

    const { data: updatedUser, error: updateError } = await context.supabase
      .from("users")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "id, full_name, email, phone, is_active, last_login, roles!inner(role_name, role_display_name, permissions)"
      )
      .single();

    if (updateError || !updatedUser) {
      throw updateError ?? new Error("Failed to update admin account");
    }

    await insertAuditLog(context.supabase as any, {
      entityType: "users",
      entityId: id,
      action: "admin.updated",
      actorId: context.user.id,
      actorRole: context.roleName,
      oldData: mapAdmin(existingUser),
      newData: mapAdmin(updatedUser),
      metadata: {
        changed_fields: Object.keys(updatePayload),
      },
    });

    return NextResponse.json({ admin: mapAdmin(updatedUser) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update admin account" },
      { status: 500 }
    );
  }
}

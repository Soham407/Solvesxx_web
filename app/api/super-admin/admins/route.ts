import { NextRequest, NextResponse } from "next/server";

import { insertAuditLog } from "@/src/lib/platform/audit";
import {
  createServiceRoleClient,
  requirePlatformPermission,
} from "@/src/lib/platform/server";
import {
  generateUniqueAdminUsername,
  isAdminRoleName,
  mapAdminAccount,
  provisionAdminAccessLink,
} from "@/src/lib/platform/adminAccounts";
import type { InviteAdminResponse } from "@/src/types/platform";

export async function POST(request: NextRequest) {
  const context = await requirePlatformPermission("platform.admin_accounts.manage");
  if ("error" in context) {
    return context.error;
  }

  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const roleName = String(body.roleName ?? "").trim();

    if (!fullName || !email || !isAdminRoleName(roleName)) {
      return NextResponse.json({ error: "Invalid admin payload" }, { status: 400 });
    }

    const { data: roleRecord, error: roleError } = await context.supabase
      .from("roles")
      .select("id, role_name, role_display_name, permissions")
      .eq("role_name", roleName)
      .single();

    if (roleError || !roleRecord) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const { data: existingUser } = await context.supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 }
      );
    }

    const adminClient = createServiceRoleClient();
    const username = await generateUniqueAdminUsername(adminClient, email);
    const { authUserId, accessLink } = await provisionAdminAccessLink(adminClient, email);
    const { data: userRecord, error: upsertError } = await adminClient
      .from("users")
      .upsert(
        {
          id: authUserId,
          full_name: fullName,
          email,
          phone,
          role_id: roleRecord.id,
          username,
          is_active: true,
          must_change_password: true,
        },
        { onConflict: "id" }
      )
      .select(
        "id, full_name, email, phone, is_active, last_login, roles!inner(role_name, role_display_name, permissions)"
      )
      .single();

    if (upsertError || !userRecord) {
      throw upsertError ?? new Error("Failed to provision admin record");
    }

    await insertAuditLog(adminClient, {
      entityType: "users",
      entityId: userRecord.id,
      action: "admin.invited",
      actorId: context.user.id,
      actorRole: context.roleName,
      newData: {
        full_name: fullName,
        email,
        phone,
        role_name: roleRecord.role_name,
      },
      metadata: {
        target_role: roleRecord.role_name,
        username,
        delivery_method: accessLink.deliveryMethod,
        access_link_type: accessLink.type,
      },
    });

    const response: InviteAdminResponse = {
      admin: mapAdminAccount(userRecord),
      accessLink,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invite admin" },
      { status: 500 }
    );
  }
}

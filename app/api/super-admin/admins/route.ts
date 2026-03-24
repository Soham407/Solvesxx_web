import { NextRequest, NextResponse } from "next/server";

import { insertAuditLog } from "@/src/lib/platform/audit";
import { extractPlatformPermissions } from "@/src/lib/platform/permissions";
import {
  createServiceRoleClient,
  requirePlatformPermission,
} from "@/src/lib/platform/server";
import type {
  AdminAccount,
  AdminAccessLink,
  InviteAdminResponse,
} from "@/src/types/platform";

const ADMIN_ROLE_NAMES = ["admin", "super_admin"] as const;

type AdminRoleName = (typeof ADMIN_ROLE_NAMES)[number];

function isAdminRoleName(value: string): value is AdminRoleName {
  return ADMIN_ROLE_NAMES.includes(value as AdminRoleName);
}

async function generateUniqueUsername(
  supabaseClient: any,
  email: string
): Promise<string> {
  const baseUsername = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24) || "admin.user";

  for (let index = 0; index < 10; index += 1) {
    const candidate = index === 0 ? baseUsername : `${baseUsername}.${index + 1}`;
    const { data } = await supabaseClient
      .from("users")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  return `${baseUsername}.${Date.now()}`;
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

function createTemporaryPassword() {
  return `FacilityPro!${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

async function provisionAdminAccessLink(adminClient: any, email: string): Promise<{
  authUserId: string;
  accessLink: AdminAccessLink;
}> {
  const signupResult = await adminClient.auth.admin.generateLink({
    type: "signup",
    email,
    password: createTemporaryPassword(),
  });

  if (!signupResult.error && signupResult.data?.user?.id && signupResult.data?.properties?.action_link) {
    return {
      authUserId: signupResult.data.user.id,
      accessLink: {
        url: signupResult.data.properties.action_link,
        type: "signup",
        deliveryMethod: "generated_link",
      },
    };
  }

  const signupMessage = signupResult.error?.message?.toLowerCase() ?? "";
  const alreadyExists =
    signupMessage.includes("already registered") ||
    signupMessage.includes("already been registered");

  if (!alreadyExists) {
    throw signupResult.error ?? new Error("Failed to generate admin setup link");
  }

  const recoveryResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (
    recoveryResult.error ||
    !recoveryResult.data?.user?.id ||
    !recoveryResult.data?.properties?.action_link
  ) {
    throw recoveryResult.error ?? new Error("Failed to generate admin setup link");
  }

  return {
    authUserId: recoveryResult.data.user.id,
    accessLink: {
      url: recoveryResult.data.properties.action_link,
      type: "recovery",
      deliveryMethod: "generated_link",
    },
  };
}

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
    const username = await generateUniqueUsername(adminClient, email);
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
      admin: mapAdmin(userRecord),
      accessLink,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to invite admin" },
      { status: 500 }
    );
  }
}

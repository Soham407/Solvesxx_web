import { NextRequest, NextResponse } from "next/server";

import { insertAuditLog } from "@/src/lib/platform/audit";
import {
  createServiceRoleClient,
  requirePlatformPermission,
} from "@/src/lib/platform/server";
import type { ResetAdminPasswordResponse } from "@/src/types/platform";

const ADMIN_ROLE_NAMES = new Set(["admin", "super_admin"]);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requirePlatformPermission("platform.admin_accounts.manage");
  if ("error" in context) {
    return context.error;
  }

  try {
    const { id } = await params;
    const { data: targetUser, error: targetError } = await context.supabase
      .from("users")
      .select("id, email, full_name, roles!inner(role_name)")
      .eq("id", id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const targetRole = Array.isArray((targetUser as any).roles)
      ? (targetUser as any).roles[0]
      : (targetUser as any).roles;

    if (!ADMIN_ROLE_NAMES.has(targetRole?.role_name ?? "")) {
      return NextResponse.json(
        { error: "Only admin-tier accounts can be managed here" },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();
    const resetLink = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: targetUser.email,
    });

    if (resetLink.error) {
      throw resetLink.error;
    }

    const accessLink = resetLink.data?.properties?.action_link;
    if (!accessLink) {
      throw new Error("Failed to generate password reset link");
    }

    await insertAuditLog(adminClient, {
      entityType: "users",
      entityId: targetUser.id,
      action: "admin.password_reset_requested",
      actorId: context.user.id,
      actorRole: context.roleName,
      metadata: {
        email: targetUser.email,
      },
    });

    const response: ResetAdminPasswordResponse = {
      success: true,
      accessLink: {
        url: accessLink,
        type: "recovery",
        deliveryMethod: "generated_link",
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send password reset" },
      { status: 500 }
    );
  }
}

import { extractPlatformPermissions } from "@/src/lib/platform/permissions";
import { createServiceRoleClient } from "@/src/lib/platform/server";
import type {
  AdminAccessLink,
  AdminAccount,
} from "@/src/types/platform";

export const ADMIN_ROLE_NAMES = ["admin", "super_admin"] as const;

export type AdminRoleName = (typeof ADMIN_ROLE_NAMES)[number];

export type AdminRoleRow = {
  role_name: string | null;
  role_display_name: string | null;
  permissions: unknown;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  last_login: string | null;
  role_id?: string | null;
  roles?: AdminRoleRow | AdminRoleRow[] | null;
};

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export function isAdminRoleName(value: string): value is AdminRoleName {
  return ADMIN_ROLE_NAMES.includes(value as AdminRoleName);
}

export function mapAdminAccount(row: AdminUserRow): AdminAccount {
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? null,
    roleName: role?.role_name ?? "admin",
    roleDisplayName: role?.role_display_name ?? "Administrator",
    isActive: row.is_active !== false,
    lastLogin: row.last_login ?? null,
    permissions: extractPlatformPermissions(role?.permissions),
  };
}

export function getAdminRole(row: AdminUserRow): AdminRoleRow | null {
  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles ?? null;
}

export function isAdminTierAccount(row: AdminUserRow): boolean {
  return isAdminRoleName(getAdminRole(row)?.role_name ?? "");
}

function createTemporaryPassword() {
  return `Solvesxx!${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function generateUniqueAdminUsername(
  supabaseClient: ServiceRoleClient,
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

export async function provisionAdminAccessLink(
  adminClient: ServiceRoleClient,
  email: string
): Promise<{
  authUserId: string;
  accessLink: AdminAccessLink;
}> {
  const temporaryPassword = createTemporaryPassword();

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      must_change_password: true,
    },
  });

  if (!createError && userData?.user?.id) {
    const recoveryResult = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    return {
      authUserId: userData.user.id,
      accessLink: {
        url:
          recoveryResult.data?.properties?.action_link ||
          `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`,
        type: "signup",
        deliveryMethod: "generated_link",
        temporaryPassword,
      },
    };
  }

  const signupMessage = createError?.message?.toLowerCase() ?? "";
  const alreadyExists =
    signupMessage.includes("already registered") ||
    signupMessage.includes("already been registered") ||
    createError?.status === 422;

  if (!alreadyExists) {
    throw createError ?? new Error("Failed to generate admin setup link");
  }

  const recoveryResult = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (recoveryResult.error || !recoveryResult.data?.user?.id) {
    throw recoveryResult.error ?? new Error("Failed to generate admin setup link");
  }

  await adminClient.auth.admin.updateUserById(recoveryResult.data.user.id, {
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });

  return {
    authUserId: recoveryResult.data.user.id,
    accessLink: {
      url: recoveryResult.data.properties?.action_link ?? `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`,
      type: "recovery",
      deliveryMethod: "generated_link",
      temporaryPassword,
    },
  };
}

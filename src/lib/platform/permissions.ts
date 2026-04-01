import { hasAccess, type AppRole } from "@/src/lib/auth/roles";
import {
  PLATFORM_PERMISSION_KEYS,
  type PermissionKey,
} from "@/src/types/platform";

const PLATFORM_PERMISSION_SET = new Set<string>(PLATFORM_PERMISSION_KEYS);

export const DEFAULT_PLATFORM_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  super_admin: [...PLATFORM_PERMISSION_KEYS],
  admin: [],
};

export const SETTINGS_PERMISSION_ROUTE_ORDER: Array<{
  href: string;
  permission: PermissionKey;
}> = [
  { href: "/settings/admins", permission: "platform.admin_accounts.manage" },
  { href: "/settings/permissions", permission: "platform.rbac.manage" },
  { href: "/settings/audit-logs", permission: "platform.audit_logs.view" },
  { href: "/admin/audit-logs", permission: "platform.audit_logs.view" },
  { href: "/settings/company", permission: "platform.config.manage" },
];

export const PLATFORM_ROUTE_PERMISSION_MAP: Array<{
  prefix: string;
  permission: PermissionKey;
}> = [
  ...SETTINGS_PERMISSION_ROUTE_ORDER.map(({ href, permission }) => ({
    prefix: href,
    permission,
  })),
  { prefix: "/api/super-admin/admins", permission: "platform.admin_accounts.manage" },
];

export function normalizePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.filter((entry): entry is string => typeof entry === "string"))
    );
  }

  if (value && typeof value === "object") {
    return Array.from(
      new Set(
        Object.entries(value as Record<string, unknown>)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([permission]) => permission)
      )
    );
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

export function extractPlatformPermissions(value: unknown): PermissionKey[] {
  return normalizePermissions(value).filter(
    (permission): permission is PermissionKey => PLATFORM_PERMISSION_SET.has(permission)
  );
}

export function hasPermission(
  permissions: string[] | undefined | null,
  permission: PermissionKey
): boolean {
  return Boolean(permissions?.includes(permission));
}

export function hasAnySettingsPermission(
  permissions: string[] | undefined | null
): boolean {
  return SETTINGS_PERMISSION_ROUTE_ORDER.some(({ permission }) =>
    hasPermission(permissions, permission)
  );
}

export function getRequiredPlatformPermission(
  pathname: string
): PermissionKey | null {
  const match = PLATFORM_ROUTE_PERMISSION_MAP
    .sort((left, right) => right.prefix.length - left.prefix.length)
    .find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return match?.permission ?? null;
}

export function getDefaultSettingsRoute(
  permissions: string[] | undefined | null
): string {
  const permittedRoute = SETTINGS_PERMISSION_ROUTE_ORDER.find(({ permission }) =>
    hasPermission(permissions, permission)
  );

  return permittedRoute?.href ?? "/dashboard";
}

export function canAccessPath(
  role: AppRole | null | undefined,
  permissions: string[] | undefined | null,
  pathname: string
): boolean {
  if (!role) {
    return false;
  }

  if (
    pathname.startsWith("/settings/notifications") ||
    pathname.startsWith("/settings/branding")
  ) {
    return false;
  }

  if (pathname === "/settings") {
    return hasAnySettingsPermission(permissions);
  }

  const requiredPermission = getRequiredPlatformPermission(pathname);
  if (requiredPermission) {
    return hasPermission(permissions, requiredPermission);
  }

  return hasAccess(role, pathname);
}

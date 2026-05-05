import type { AppRole } from "@/src/lib/auth/roles";
import { normalizePermissions } from "@/src/lib/platform/permissions";

export interface AuthRoleRow {
  role_name?: string | null;
  permissions?: unknown;
}

export interface AuthUserRoleRow {
  is_active: boolean | null;
  must_change_password?: boolean | null;
  roles?: AuthRoleRow | AuthRoleRow[] | null;
}

export interface AuthSessionProfile {
  role: AppRole | null;
  permissions: string[];
  isActive: boolean;
  mustChangePassword: boolean;
}

export function getAuthRoleRow(row?: AuthUserRoleRow | null): AuthRoleRow | null {
  if (!row?.roles) {
    return null;
  }

  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles;
}

export function mapAuthSessionProfile(row?: AuthUserRoleRow | null): AuthSessionProfile {
  const roleRow = getAuthRoleRow(row);

  return {
    role: (roleRow?.role_name ?? null) as AppRole | null,
    permissions: normalizePermissions(roleRow?.permissions),
    isActive: row?.is_active !== false,
    mustChangePassword: row?.must_change_password === true,
  };
}

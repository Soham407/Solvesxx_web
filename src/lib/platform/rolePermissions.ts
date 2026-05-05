import { extractPlatformPermissions, normalizePermissions } from "@/src/lib/platform/permissions";
import type { PermissionKey, RolePermissionRecord } from "@/src/types/platform";

export type RolePermissionRow = {
  id: string;
  role_name: string;
  role_display_name: string;
  description: string | null;
  is_active: boolean | null;
  permissions: unknown;
};

export function mapRolePermissionRecord(row: RolePermissionRow): RolePermissionRecord {
  const rawPermissions = normalizePermissions(row.permissions);

  return {
    id: row.id,
    roleName: row.role_name,
    roleDisplayName: row.role_display_name,
    description: row.description,
    isActive: row.is_active !== false,
    userCount: 0,
    permissions: extractPlatformPermissions(row.permissions),
    rawPermissions,
  };
}

export function buildPermissionCoverage(
  roles: RolePermissionRecord[]
): Record<PermissionKey, number> {
  return roles.reduce<Record<PermissionKey, number>>(
    (coverage, roleRecord) => {
      roleRecord.permissions.forEach((permission) => {
        coverage[permission] += 1;
      });
      return coverage;
    },
    {
      "platform.dashboard.view": 0,
      "platform.admin_accounts.manage": 0,
      "platform.rbac.manage": 0,
      "platform.audit_logs.view": 0,
      "platform.config.manage": 0,
    }
  );
}

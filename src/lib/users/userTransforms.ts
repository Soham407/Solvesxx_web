type RoleRow =
  | {
      role_name?: string | null;
      role_display_name?: string | null;
    }
  | Array<{
      role_name?: string | null;
      role_display_name?: string | null;
    }>
  | null;

export interface UserMaster {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  role_key: string | null;
  last_login: string | null;
  is_active: boolean;
  is_admin_tier: boolean;
  must_change_password: boolean;
  status: "Active" | "Locked" | "Pending";
}

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  last_login: string | null;
  is_active: boolean;
  must_change_password: boolean;
  roles: RoleRow;
};

export const ADMIN_TIER_ROLES = new Set(["admin", "super_admin"]);

function getRoleRow(roles: RoleRow) {
  return Array.isArray(roles) ? roles[0] ?? null : roles;
}

export function mapUserRow(row: UserRow): UserMaster {
  const roleData = getRoleRow(row.roles);

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role_name: roleData?.role_display_name || "Unknown Role",
    role_key: roleData?.role_name || null,
    last_login: row.last_login,
    is_active: row.is_active,
    is_admin_tier: ADMIN_TIER_ROLES.has(roleData?.role_name || ""),
    must_change_password: row.must_change_password ?? false,
    status: !row.is_active ? "Locked" : row.must_change_password ? "Pending" : "Active",
  };
}

export const PLATFORM_PERMISSION_KEYS = [
  "platform.dashboard.view",
  "platform.admin_accounts.manage",
  "platform.rbac.manage",
  "platform.audit_logs.view",
  "platform.config.manage",
] as const;

export type PermissionKey = (typeof PLATFORM_PERMISSION_KEYS)[number];

export const SYSTEM_CONFIG_KEYS = [
  "guard_inactivity_threshold_minutes",
  "default_geo_fence_radius_meters",
  "geo_breach_auto_punch_out_minutes",
  "checklist_completion_alert_threshold_percent",
] as const;

export type SystemConfigKey = (typeof SYSTEM_CONFIG_KEYS)[number];

export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleName: string;
  roleDisplayName: string;
  isActive: boolean;
  lastLogin: string | null;
  permissions: PermissionKey[];
}

export interface AdminAccessLink {
  url: string;
  type: "signup" | "recovery";
  deliveryMethod: "generated_link" | "supabase_email";
}

export interface InviteAdminResponse {
  admin: AdminAccount;
  accessLink: AdminAccessLink | null;
}

export interface ResetAdminPasswordResponse {
  success: boolean;
  accessLink: AdminAccessLink | null;
}

export interface RolePermissionRecord {
  id: string;
  roleName: string;
  roleDisplayName: string;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissions: PermissionKey[];
  rawPermissions: string[];
}

export interface SystemConfigEntry {
  key: SystemConfigKey;
  value: string;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PlatformAuditLog {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  oldData: unknown;
  newData: unknown;
  metadata: unknown;
  evidenceUrl: string | null;
  createdAt: string;
}

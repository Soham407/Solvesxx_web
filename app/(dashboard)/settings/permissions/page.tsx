"use client";

import { useEffect, useState } from "react";

import { usePlatformRolePermissions } from "@/hooks/usePlatformRolePermissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PermissionCoverageCards } from "@/components/settings/PermissionCoverageCards";
import { RolePermissionsCard } from "@/components/settings/RolePermissionsCard";
import type { PermissionKey } from "@/src/types/platform";

const PLATFORM_PERMISSION_COPY: Record<
  PermissionKey,
  { label: string; description: string }
> = {
  "platform.dashboard.view": {
    label: "Platform Dashboard",
    description: "Access the dedicated super admin dashboard.",
  },
  "platform.admin_accounts.manage": {
    label: "Admin Management",
    description: "Invite, suspend, and update admin-tier accounts.",
  },
  "platform.rbac.manage": {
    label: "RBAC Management",
    description: "Edit the platform permission keys for this slice.",
  },
  "platform.audit_logs.view": {
    label: "Audit Logs",
    description: "Review platform change history.",
  },
  "platform.config.manage": {
    label: "System Configuration",
    description: "Update platform thresholds and operational settings.",
  },
};

const PERMISSION_KEYS = Object.keys(PLATFORM_PERMISSION_COPY) as PermissionKey[];

function buildRolePermissionDrafts(
  roles: Array<{ id: string; permissions: PermissionKey[] }>
): Record<string, PermissionKey[]> {
  return roles.reduce<Record<string, PermissionKey[]>>((accumulator, roleRecord) => {
    accumulator[roleRecord.id] = roleRecord.permissions;
    return accumulator;
  }, {});
}

function toggleRolePermission(
  current: Record<string, PermissionKey[]>,
  roleId: string,
  permission: PermissionKey,
  enabled: boolean,
): Record<string, PermissionKey[]> {
  const rolePermissions = current[roleId] ?? [];
  const nextPermissions = enabled
    ? Array.from(new Set([...rolePermissions, permission]))
    : rolePermissions.filter((entry) => entry !== permission);

  return {
    ...current,
    [roleId]: nextPermissions,
  };
}

export default function PermissionsSettingsPage() {
  const {
    roles,
    permissionCoverage,
    isLoading,
    error,
    updateRolePermissions,
    isSaving,
  } = usePlatformRolePermissions();

  const [drafts, setDrafts] = useState<Record<string, PermissionKey[]>>({});

  useEffect(() => {
    setDrafts(buildRolePermissionDrafts(roles));
  }, [roles]);

  const togglePermission = (roleId: string, permission: PermissionKey, enabled: boolean) => {
    setDrafts((current) => toggleRolePermission(current, roleId, permission, enabled));
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Role & Permissions"
        description="Assign the platform permission keys that govern the Super Admin 11.1 slice."
      />

      <PermissionCoverageCards
        permissionKeys={PERMISSION_KEYS}
        permissionLabels={PLATFORM_PERMISSION_COPY}
        permissionCoverage={permissionCoverage}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {roles.map((roleRecord) => (
          <RolePermissionsCard
            key={roleRecord.id}
            role={roleRecord}
            permissionKeys={PERMISSION_KEYS}
            permissionLabels={PLATFORM_PERMISSION_COPY}
            enabledPermissions={drafts[roleRecord.id] ?? []}
            isSaving={isSaving}
            isLoading={isLoading}
            onToggle={(permission, enabled) =>
              togglePermission(roleRecord.id, permission, enabled)
            }
            onSave={() =>
              updateRolePermissions({
                roleId: roleRecord.id,
                permissions: drafts[roleRecord.id] ?? [],
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

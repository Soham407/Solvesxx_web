"use client";

import { useEffect, useMemo, useState } from "react";

import { usePlatformRolePermissions } from "@/hooks/usePlatformRolePermissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck } from "lucide-react";
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
    const nextDrafts: Record<string, PermissionKey[]> = {};
    roles.forEach((roleRecord) => {
      nextDrafts[roleRecord.id] = roleRecord.permissions;
    });
    setDrafts(nextDrafts);
  }, [roles]);

  const permissionKeys = useMemo(
    () => Object.keys(PLATFORM_PERMISSION_COPY) as PermissionKey[],
    []
  );

  const togglePermission = (roleId: string, permission: PermissionKey, enabled: boolean) => {
    setDrafts((current) => {
      const rolePermissions = current[roleId] ?? [];
      const nextPermissions = enabled
        ? Array.from(new Set([...rolePermissions, permission]))
        : rolePermissions.filter((entry) => entry !== permission);

      return {
        ...current,
        [roleId]: nextPermissions,
      };
    });
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Role & Permissions"
        description="Assign the platform permission keys that govern the Super Admin 11.1 slice."
      />

      <div className="grid gap-4 md:grid-cols-5">
        {permissionKeys.map((permission) => (
          <Card key={permission} className="border-none shadow-card ring-1 ring-border">
            <CardContent className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                {PLATFORM_PERMISSION_COPY[permission].label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {permissionCoverage[permission]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {roles.map((roleRecord) => (
          <Card key={roleRecord.id} className="border-none shadow-card ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{roleRecord.roleDisplayName}</CardTitle>
                  <CardDescription>
                    {roleRecord.description || "No description available."}
                  </CardDescription>
                </div>
                <Badge variant="outline">{roleRecord.userCount} users</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {permissionKeys.map((permission) => {
                const enabled = (drafts[roleRecord.id] ?? []).includes(permission);
                return (
                  <div
                    key={permission}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {PLATFORM_PERMISSION_COPY[permission].label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PLATFORM_PERMISSION_COPY[permission].description}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        togglePermission(roleRecord.id, permission, checked)
                      }
                    />
                  </div>
                );
              })}

              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={() =>
                    updateRolePermissions({
                      roleId: roleRecord.id,
                      permissions: drafts[roleRecord.id] ?? [],
                    })
                  }
                  disabled={isLoading || isSaving}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Save Role Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

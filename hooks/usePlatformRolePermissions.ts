"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { insertAuditLog } from "@/src/lib/platform/audit";
import {
  extractPlatformPermissions,
  normalizePermissions,
} from "@/src/lib/platform/permissions";
import { supabase } from "@/src/lib/supabaseClient";
import type { PermissionKey, RolePermissionRecord } from "@/src/types/platform";

interface UpdateRolePermissionsInput {
  roleId: string;
  permissions: PermissionKey[];
}

export function usePlatformRolePermissions() {
  const { role } = useAuth();

  const roleQuery = useSupabaseQuery<RolePermissionRecord>(
    async () => {
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, role_name, role_display_name, description, is_active, permissions")
        .order("role_display_name");

      if (rolesError) throw rolesError;

      const roleIds = (rolesData || []).map((roleRecord) => roleRecord.id);
      const { data: userCounts, error: countError } = await supabase
        .from("users")
        .select("role_id")
        .in("role_id", roleIds);

      if (countError) throw countError;

      const countMap: Record<string, number> = {};
      (userCounts || []).forEach((user: any) => {
        countMap[user.role_id] = (countMap[user.role_id] || 0) + 1;
      });

      return (rolesData || []).map((roleRecord: any) => {
        const rawPermissions = normalizePermissions(roleRecord.permissions);

        return {
          id: roleRecord.id,
          roleName: roleRecord.role_name,
          roleDisplayName: roleRecord.role_display_name,
          description: roleRecord.description,
          isActive: roleRecord.is_active !== false,
          userCount: countMap[roleRecord.id] || 0,
          permissions: extractPlatformPermissions(roleRecord.permissions),
          rawPermissions,
        } satisfies RolePermissionRecord;
      });
    },
    []
  );

  const { execute: updateRolePermissions, isLoading: isSaving } =
    useSupabaseMutation<UpdateRolePermissionsInput, RolePermissionRecord>(
      async ({ roleId, permissions }) => {
        const existingRole = roleQuery.data.find((record) => record.id === roleId);
        if (!existingRole) {
          throw new Error("Role not found");
        }

        const preservedPermissions = existingRole.rawPermissions.filter(
          (permission) => !permission.startsWith("platform.")
        );
        const nextPermissions = Array.from(
          new Set([...preservedPermissions, ...permissions])
        );

        const { data: updatedRole, error } = await supabase
          .from("roles")
          .update({ permissions: nextPermissions, updated_at: new Date().toISOString() })
          .eq("id", roleId)
          .select("id, role_name, role_display_name, description, is_active, permissions")
          .single();

        if (error) throw error;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        await insertAuditLog(supabase as any, {
          entityType: "roles",
          entityId: roleId,
          action: "role.permissions_updated",
          actorId: user?.id ?? null,
          actorRole: role ?? null,
          oldData: { permissions: existingRole.rawPermissions },
          newData: { permissions: nextPermissions },
          metadata: { role_name: existingRole.roleName },
        });

        roleQuery.refresh();

        return {
          id: updatedRole.id,
          roleName: updatedRole.role_name,
          roleDisplayName: updatedRole.role_display_name,
          description: updatedRole.description,
          isActive: updatedRole.is_active !== false,
          userCount: existingRole.userCount,
          permissions: extractPlatformPermissions(updatedRole.permissions),
          rawPermissions: normalizePermissions(updatedRole.permissions),
        };
      },
      { successMessage: "Role permissions updated" }
    );

  const permissionCoverage = useMemo(
    () =>
      roleQuery.data.reduce<Record<PermissionKey, number>>(
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
      ),
    [roleQuery.data]
  );

  return {
    roles: roleQuery.data,
    permissionCoverage,
    isLoading: roleQuery.isLoading,
    error: roleQuery.error,
    refresh: roleQuery.refresh,
    updateRolePermissions,
    isSaving,
  };
}

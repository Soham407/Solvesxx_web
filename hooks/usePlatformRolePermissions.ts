"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { insertAuditLog } from "@/src/lib/platform/audit";
import {
  buildPermissionCoverage,
  mapRolePermissionRecord,
  type RolePermissionRow,
} from "@/src/lib/platform/rolePermissions";
import { supabase } from "@/src/lib/supabaseClient";
import type { PermissionKey, RolePermissionRecord } from "@/src/types/platform";

interface UpdateRolePermissionsInput {
  roleId: string;
  permissions: PermissionKey[];
}

type UserCountRow = {
  role_id: string;
};

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
      (userCounts || []).forEach((user: UserCountRow) => {
        countMap[user.role_id] = (countMap[user.role_id] || 0) + 1;
      });

      return (rolesData || []).map((roleRecord: RolePermissionRow) => ({
        ...mapRolePermissionRecord(roleRecord),
        userCount: countMap[roleRecord.id] || 0,
      }));
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

        await insertAuditLog(supabase, {
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

        const mappedUpdatedRole = mapRolePermissionRecord({
          id: updatedRole.id,
          role_name: updatedRole.role_name,
          role_display_name: updatedRole.role_display_name,
          description: updatedRole.description,
          is_active: updatedRole.is_active,
          permissions: updatedRole.permissions,
        });

        return {
          ...mappedUpdatedRole,
          userCount: existingRole.userCount,
        };
      },
      { successMessage: "Role permissions updated" }
    );

  const permissionCoverage = useMemo(
    () => buildPermissionCoverage(roleQuery.data),
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

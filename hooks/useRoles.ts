"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface Role {
  id: string;
  name: string;
  roleKey: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseRolesState {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

interface RoleMutationInput {
  name: string;
  description?: string | null;
}

const ROLE_NAME_OPTIONS = new Set([
  "admin",
  "company_md",
  "company_hod",
  "account",
  "delivery_boy",
  "buyer",
  "supplier",
  "vendor",
  "security_guard",
  "security_supervisor",
  "society_manager",
  "service_boy",
  "resident",
  "storekeeper",
  "site_supervisor",
  "super_admin",
  "ac_technician",
  "pest_control_technician",
]);

function normalizeRoleKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Hook to fetch and manage system roles with permissions
 */
export function useRoles() {
  const [state, setState] = useState<UseRolesState>({
    roles: [],
    isLoading: true,
    error: null,
    isSubmitting: false,
  });

  const fetchRoles = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, role_name, role_display_name, description, permissions, is_active, created_at, updated_at")
        .order("role_display_name");

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setState((prev) => ({
          ...prev,
          roles: [],
          isLoading: false,
          error: null,
        }));
        return;
      }

      // Count users per role
      const roleIds = rolesData.map((r) => r.id);
      const { data: userCounts, error: countError } = await supabase
        .from("users")
        .select("role_id")
        .in("role_id", roleIds);

      if (countError) throw countError;

      // Aggregate user counts
      const countMap: Record<string, number> = {};
      (userCounts || []).forEach((u: any) => {
        countMap[u.role_id] = (countMap[u.role_id] || 0) + 1;
      });

      // Transform data
      const roles: Role[] = rolesData.map((role: any) => ({
        id: role.id,
        name: role.role_display_name,
        roleKey: role.role_name,
        description: role.description,
        permissions: (role.permissions as string[]) || [],
        isActive: role.is_active ?? true,
        userCount: countMap[role.id] || 0,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      }));

      setState((prev) => ({
        ...prev,
        roles,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      console.error("Error fetching roles:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch roles",
      }));
    }
  }, []);

  const createRole = useCallback(async (input: RoleMutationInput): Promise<Role | null> => {
    const roleKey = normalizeRoleKey(input.name);

    if (!ROLE_NAME_OPTIONS.has(roleKey)) {
      throw new Error(
        "Role name must match an existing system role, for example Company MD, Site Supervisor, or Security Guard."
      );
    }

    try {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      const { data, error } = await supabase
        .from("roles")
        .insert({
          role_name: roleKey as any,
          role_display_name: input.name.trim(),
          description: input.description?.trim() || null,
          permissions: [],
          is_active: true,
        })
        .select("id, role_name, role_display_name, description, permissions, is_active, created_at, updated_at")
        .single();

      if (error) throw error;

      await fetchRoles();

      return {
        id: data.id,
        name: data.role_display_name,
        roleKey: data.role_name,
        description: data.description,
        permissions: (data.permissions as string[]) || [],
        isActive: data.is_active ?? true,
        userCount: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error("Error creating role:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create role";
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: string, input: RoleMutationInput): Promise<Role | null> => {
    try {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      const { data, error } = await supabase
        .from("roles")
        .update({
          role_display_name: input.name.trim(),
          description: input.description?.trim() || null,
        })
        .eq("id", id)
        .select("id, role_name, role_display_name, description, permissions, is_active, created_at, updated_at")
        .single();

      if (error) throw error;

      await fetchRoles();

      const existingRole = state.roles.find((role) => role.id === id);

      return {
        id: data.id,
        name: data.role_display_name,
        roleKey: data.role_name,
        description: data.description,
        permissions: (data.permissions as string[]) || [],
        isActive: data.is_active ?? true,
        userCount: existingRole?.userCount || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error("Error updating role:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update role";
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [fetchRoles, state.roles]);

  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchRoles();
      return true;
    } catch (err) {
      console.error("Error deleting role:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete role";
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [fetchRoles]);

  const refresh = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    ...state,
    createRole,
    updateRole,
    deleteRole,
    refresh,
  };
}

export default useRoles;

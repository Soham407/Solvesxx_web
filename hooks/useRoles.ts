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
}

/**
 * Hook to fetch and manage system roles with permissions
 */
export function useRoles() {
  const [state, setState] = useState<UseRolesState>({
    roles: [],
    isLoading: true,
    error: null,
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
        setState({
          roles: [],
          isLoading: false,
          error: null,
        });
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

      setState({
        roles,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching roles:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch roles",
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    ...state,
    refresh,
  };
}

export default useRoles;

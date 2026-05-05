"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import {
  ADMIN_TIER_ROLES,
  mapUserRow,
  type UserMaster,
  type UserRow,
} from "@/src/lib/users/userTransforms";

export type { UserMaster } from "@/src/lib/users/userTransforms";

export function useUsers() {
  const [users, setUsers] = useState<UserMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          last_login,
          is_active,
          must_change_password,
          roles (
            role_name,
            role_display_name
          )
        `)
        .order("full_name");

      if (fetchError) throw fetchError;

      const formatted: UserMaster[] = ((data || []) as UserRow[]).map(mapUserRow);

      setUsers(formatted);
    } catch (err: unknown) {
      console.error("Error fetching users:", err);
      setError("Failed to load users list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create user");
      toast.success("User provisioned successfully");
      fetchUsers();
      return result; // return password to show once
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
      throw err;
    }
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update role");
      toast.success("Role updated successfully");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
      throw err;
    }
  };

  const suspendUser = async (user: UserMaster) => {
    try {
      if (user.is_admin_tier) {
        toast.error("Manage admin accounts from Platform Settings");
        return;
      }

      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to suspend user");
      toast.success("User suspended and sessions invalidated");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend user");
    }
  };

  const activateUser = async (user: UserMaster) => {
    try {
      if (user.is_admin_tier) {
        toast.error("Manage admin accounts from Platform Settings");
        return;
      }

      const res = await fetch(`/api/admin/users/${user.id}/activate`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to activate user");
      toast.success("User access restored");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to activate user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { 
    users, 
    isLoading, 
    error, 
    createUser,
    updateUserRole,
    suspendUser, 
    activateUser, 
    refresh: fetchUsers 
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

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

const ADMIN_TIER_ROLES = new Set(["admin", "super_admin"]);

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

      const formatted: UserMaster[] = ((data || []) as any[]).map((u: {
        id: string;
        full_name: string;
        email: string;
        last_login: string | null;
        is_active: boolean;
        must_change_password: boolean;
        roles:
          | {
              role_name?: string | null;
              role_display_name?: string | null;
            }
          | Array<{
              role_name?: string | null;
              role_display_name?: string | null;
            }>
          | null;
      }) => {
        const roleData = Array.isArray(u.roles) ? u.roles[0] : u.roles;
        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role_name: roleData?.role_display_name || "Unknown Role",
          role_key: roleData?.role_name || null,
          last_login: u.last_login,
          is_active: u.is_active,
          is_admin_tier: ADMIN_TIER_ROLES.has(roleData?.role_name),
          must_change_password: u.must_change_password ?? false,
          status: !u.is_active ? "Locked" : (u.must_change_password ? "Pending" : "Active"),
        };
      });

      setUsers(formatted);
    } catch (err: unknown) {
      console.error("Error fetching users:", err);
      setError("Failed to load users list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = async (payload: any) => {
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
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      toast.error(err.message);
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
    } catch (err: any) {
      toast.error(err.message);
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

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

  const deactivateUser = async (user: UserMaster) => {
    try {
      if (user.is_admin_tier) {
        toast.error("Manage admin accounts from Platform Settings");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("User deactivated");
      fetchUsers();
    } catch (_err: unknown) {
      toast.error("Failed to deactivate user");
    }
  };

  const activateUser = async (user: UserMaster) => {
    try {
      if (user.is_admin_tier) {
        toast.error("Manage admin accounts from Platform Settings");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ is_active: true })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("User activated");
      fetchUsers();
    } catch (_err: unknown) {
      toast.error("Failed to activate user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, isLoading, error, deactivateUser, activateUser, refresh: fetchUsers };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

export interface UserMaster {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  last_login: string | null;
  is_active: boolean;
  status: "Active" | "Locked" | "Pending";
}

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
          roles (
            role_display_name
          )
        `)
        .order("full_name");

      if (fetchError) throw fetchError;

      const formatted: UserMaster[] = (data || []).map((u: any) => {
        const roleData = Array.isArray(u.roles) ? u.roles[0] : u.roles;
        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role_name: roleData?.role_display_name || "Unknown Role",
          last_login: u.last_login,
          is_active: u.is_active,
          status: u.is_active ? "Active" : "Locked",
        };
      });

      setUsers(formatted);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load users list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", userId);
      if (error) throw error;
      toast.success("User deactivated");
      fetchUsers();
    } catch (err: any) {
      toast.error("Failed to deactivate user");
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: true })
        .eq("id", userId);
      if (error) throw error;
      toast.success("User activated");
      fetchUsers();
    } catch (err: any) {
      toast.error("Failed to activate user");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, isLoading, error, deactivateUser, activateUser, refresh: fetchUsers };
}

"use client";

import { useMemo } from "react";

import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { mapAdminAccount, type AdminUserRow } from "@/src/lib/platform/adminAccounts";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  AdminAccount,
  InviteAdminResponse,
  ResetAdminPasswordResponse,
} from "@/src/types/platform";

interface InviteAdminInput {
  fullName: string;
  email: string;
  phone?: string | null;
  roleName: "admin" | "super_admin";
}

interface UpdateAdminInput {
  id: string;
  fullName?: string;
  phone?: string | null;
  roleName?: "admin" | "super_admin";
  isActive?: boolean;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

function normalizeAdminRows(rows: unknown): AdminUserRow[] {
  return Array.isArray(rows) ? (rows as AdminUserRow[]) : [];
}

export function usePlatformAdminAccounts() {
  const adminQuery = useSupabaseQuery<AdminAccount>(
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, full_name, email, phone, is_active, last_login, roles!inner(role_name, role_display_name, permissions)"
        )
        .in("roles.role_name", ["admin", "super_admin"])
        .order("full_name");

      if (error) throw error;

      return normalizeAdminRows(data).map(mapAdminAccount);
    },
    []
  );

  const { execute: inviteAdmin, isLoading: isInviting } = useSupabaseMutation<
    InviteAdminInput,
    InviteAdminResponse
  >(
    async (payload) => {
      const response = await requestJson<InviteAdminResponse>("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      adminQuery.refresh();
      return response;
    },
    { successMessage: "Admin account created" }
  );

  const { execute: updateAdmin, isLoading: isUpdating } = useSupabaseMutation<
    UpdateAdminInput,
    { admin: Partial<AdminAccount> }
  >(
    async ({ id, ...payload }) => {
      const response = await requestJson<{ admin: Partial<AdminAccount> }>(
        `/api/super-admin/admins/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      adminQuery.refresh();
      return response;
    },
    { successMessage: "Admin account updated" }
  );

  const { execute: resetAdminPassword, isLoading: isResettingPassword } =
    useSupabaseMutation<string, ResetAdminPasswordResponse>(
      async (id) => {
        const response = await requestJson<ResetAdminPasswordResponse>(
          `/api/super-admin/admins/${id}/reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        return response;
      },
      { successMessage: "Reset link generated" }
    );

  const stats = useMemo(() => {
    const total = adminQuery.data.length;
    const active = adminQuery.data.filter((account) => account.isActive).length;
    const superAdmins = adminQuery.data.filter(
      (account) => account.roleName === "super_admin"
    ).length;

    return { total, active, superAdmins };
  }, [adminQuery.data]);

  return {
    admins: adminQuery.data,
    stats,
    isLoading: adminQuery.isLoading,
    error: adminQuery.error,
    refresh: adminQuery.refresh,
    inviteAdmin,
    updateAdmin,
    resetAdminPassword,
    isInviting,
    isUpdating,
    isResettingPassword,
  };
}

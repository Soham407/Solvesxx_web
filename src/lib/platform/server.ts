import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";
import { normalizePermissions, hasPermission } from "@/src/lib/platform/permissions";
import type { PermissionKey } from "@/src/types/platform";

export async function requirePlatformPermission(permission: PermissionKey) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, roles!inner(role_name, role_display_name, permissions)")
    .eq("id", user.id)
    .single();

  if (error || !data || data.is_active === false) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const role = Array.isArray((data as any).roles)
    ? (data as any).roles[0]
    : (data as any).roles;
  const permissions = normalizePermissions(role?.permissions);

  if (!hasPermission(permissions, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase,
    user,
    profile: data,
    roleName: role?.role_name as string,
    permissions,
  };
}

export function createServiceRoleClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

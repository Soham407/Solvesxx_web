import { redirect } from "next/navigation";

import { getDefaultSettingsRoute, normalizePermissions } from "@/src/lib/platform/permissions";
import { createClient } from "@/src/lib/supabase/server";

type UserRoleRecord = {
  permissions?: unknown;
};

type UserSettingsRow = {
  roles?: UserRoleRecord | UserRoleRecord[] | null;
};

export default async function SettingsIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("users")
    .select("roles!inner(permissions)")
    .eq("id", user.id)
    .single();

  const userRow = data as UserSettingsRow | null;
  const role = Array.isArray(userRow?.roles)
    ? userRow.roles[0]
    : userRow?.roles;
  const permissions = normalizePermissions(role?.permissions);

  redirect(getDefaultSettingsRoute(permissions));
}

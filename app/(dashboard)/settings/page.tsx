import { redirect } from "next/navigation";

import { getDefaultSettingsRoute, normalizePermissions } from "@/src/lib/platform/permissions";
import { createClient } from "@/src/lib/supabase/server";

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

  const role = Array.isArray((data as any)?.roles)
    ? (data as any)?.roles[0]
    : (data as any)?.roles;
  const permissions = normalizePermissions(role?.permissions);

  redirect(getDefaultSettingsRoute(permissions));
}

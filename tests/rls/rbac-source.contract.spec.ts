import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("RLS contract: role and policy source", () => {
  it("keeps the runtime role list aligned with the 18-role app model", async () => {
    const source = await readRepoFile("src/lib/auth/roles.ts");

    expect(
      sourceContainsAll(source, [
        '"admin"',
        '"company_md"',
        '"company_hod"',
        '"account"',
        '"delivery_boy"',
        '"buyer"',
        '"supplier"',
        '"vendor"',
        '"security_guard"',
        '"security_supervisor"',
        '"society_manager"',
        '"service_boy"',
        '"resident"',
        '"storekeeper"',
        '"site_supervisor"',
        '"super_admin"',
        '"ac_technician"',
        '"pest_control_technician"',
      ])
    ).toBe(true);
  });

  it("keeps the RLS helper and hardening policies in place", async () => {
    const source = await readRepoFile("supabase/migrations/20260317000001_fix_rtv_tickets_rls.sql");

    expect(
      sourceContainsAll(source, [
        "create or replace function public.get_my_app_role()",
        "rtv_tickets_select",
        "rtv_tickets_insert",
        "rtv_tickets_update",
        "rtv_tickets_delete",
        "get_my_app_role() IN ('admin', 'super_admin')",
      ])
    ).toBe(true);
  });

  it("keeps the platform alignment migration and super-admin policies in place", async () => {
    const source = await readRepoFile("supabase/migrations/20260322000004_super_admin_platform_alignment.sql");

    expect(
      sourceContainsAll(source, [
        "super_admin",
        "platform.admin_accounts.manage",
        "platform.rbac.manage",
        "platform.audit_logs.view",
        "platform.config.manage",
        "system_config_super_admin_full",
        "audit_logs_super_admin_select",
      ])
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("RLS contract: platform master master data", () => {
  it("keeps designation and company location access aligned with platform master workflows", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260406050000_platform_master_master_data_rls_truth.sql"
    );

    expect(
      sourceContainsAll(source, [
        'CREATE POLICY "designations_admin_full"',
        'CREATE POLICY "designations_authenticated_read"',
        'CREATE POLICY "company_locations_admin_full"',
        'CREATE POLICY "company_locations_authenticated_read"',
        "COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT)",
        "'admin'",
        "'super_admin'",
        "'company_hod'",
        "auth.uid() IS NOT NULL",
      ])
    ).toBe(true);
  });
});

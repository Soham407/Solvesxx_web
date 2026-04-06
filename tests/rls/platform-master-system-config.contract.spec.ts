import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("RLS contract: platform master system configuration", () => {
  it("keeps system_config aligned to platform.config.manage permission", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260406040000_platform_master_system_config_permission_truth.sql"
    );

    expect(
      sourceContainsAll(source, [
        'DROP POLICY IF EXISTS "system_config_admin_full"',
        'CREATE POLICY "system_config_permission_manage"',
        'platform.config.manage',
        "COALESCE(r.permissions, '[]'::jsonb)",
      ])
    ).toBe(true);
  });
});

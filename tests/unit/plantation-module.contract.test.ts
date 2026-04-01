import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("plantation module contracts", () => {
  it("provisions the service-evidence storage bucket and object policies in the plantation migration", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260330000011_plantation_001_module.sql"
    );

    expect(
      sourceContainsAll(source, [
        "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)",
        "'service-evidence'",
        "CREATE POLICY \"Authenticated users can upload service evidence\"",
        "CREATE POLICY \"Authenticated users can read service evidence\"",
        "CREATE POLICY \"Authenticated users can delete service evidence\"",
        "bucket_id = 'service-evidence'",
      ])
    ).toBe(true);
  });

  it("keeps generated horticulture types aligned with the normalized plantation schema", async () => {
    const source = await readRepoFile("supabase-types.ts");

    expect(
      sourceContainsAll(source, [
        "horticulture_seasonal_plans: {",
        "created_by: string | null",
        "plan_description: string | null",
        "start_date: string | null",
        "end_date: string | null",
        "zone_id: string | null",
        "horticulture_tasks: {",
        "completed_date: string | null",
        "photo_evidence: string[] | null",
        "plan_id: string | null",
        "task_name: string | null",
        "horticulture_zones: {",
        "location_id: string | null",
        "name: string | null",
        "plant_types: string[] | null",
      ])
    ).toBe(true);
  });
});

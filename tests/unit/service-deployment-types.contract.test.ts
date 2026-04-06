import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("service deployment type contracts", () => {
  it("keeps both generated Supabase type snapshots aligned to the service deployment schema", async () => {
    const rootTypesSource = await readRepoFile("supabase-types.ts");
    const clientTypesSource = await readRepoFile("src/types/supabase.ts");

    expect(
      sourceContainsAll(rootTypesSource, [
        "service_grade: string | null",
        "service_type: string | null",
        "site_location_id: string | null",
        "start_date: string | null",
        'foreignKeyName: "requests_site_location_id_fkey"',
        "service_request_id: string | null",
        'foreignKeyName: "indents_service_request_id_fkey"',
        'foreignKeyName: "indents_supplier_id_fkey"',
      ])
    ).toBe(true);

    expect(clientTypesSource.includes("export * from '../../supabase-types';")).toBe(true);
  });
});

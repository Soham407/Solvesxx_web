import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("company module contracts", () => {
  it("keeps the designations page behind the data hook layer", async () => {
    const pageSource = await readRepoFile(
      "app/(dashboard)/company/designations/page.tsx"
    );
    const hookSource = await readRepoFile("hooks/useDesignations.ts");

    // Page should use the hook
    expect(
      sourceContainsAll(pageSource, [
        "useDesignations",
        "DesignationDialog",
        "DataTable",
      ])
    ).toBe(true);

    // Page should NOT use direct Supabase client
    expect(
      sourceContainsNone(pageSource, [
        'import { supabase }',
        '.from("designations")',
      ])
    ).toBe(true);

    // Hook should use the standardized patterns
    expect(
      sourceContainsAll(hookSource, [
        "useSupabaseQuery",
        "useSupabaseMutation",
        '.from("designations")',
        "createDesignation",
        "updateDesignation",
        "deleteDesignation",
      ])
    ).toBe(true);
  });
});

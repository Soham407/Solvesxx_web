import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("backend readiness contract: issue 27 supabase local audit", () => {
  it("tracks local reset status, RLS smoke run, storage coverage, and edge env contracts", async () => {
    const source = await readRepoFile("docs/release/supabase-local-readiness-audit.md");

    expect(
      sourceContainsAll(source, [
        "supabase db reset --local",
        "supabase: command not found",
        "npm run test:rls",
        "bill-documents",
        "employee-documents",
        "visitor-photos",
        "checklist-evidence",
        "service-evidence",
        "send-notification",
        "check-checklist",
        "check-guard-inactivity",
        "check-document-expiry",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "CRON_SECRET",
      ])
    ).toBe(true);
  });
});

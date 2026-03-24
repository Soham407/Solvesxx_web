import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("API contract: waitlist route", () => {
  it("keeps the public insert and duplicate handling flow intact", async () => {
    const source = await readRepoFile("app/api/waitlist/route.ts");

    expect(
      sourceContainsAll(source, [
        "A valid email is required.",
        "email.toLowerCase().trim()",
        "EMAIL_REGEX",
        "SUPABASE_SERVICE_ROLE_KEY",
        'error.code === "23505"',
        "You're already on the waitlist! We'll be in touch soon.",
        "You're on the waitlist! We'll notify you at launch.",
      ])
    ).toBe(true);
  });
});

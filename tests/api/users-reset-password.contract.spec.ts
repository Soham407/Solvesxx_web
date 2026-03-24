import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("API contract: user reset password route", () => {
  it("keeps auth, role resolution, and admin-tier protection in place", async () => {
    const source = await readRepoFile("app/api/users/reset-password/route.ts");

    expect(
      sourceContainsAll(source, [
        "Unauthorized",
        "roles(role_name)",
        "Forbidden",
        "could not resolve user role",
        "Only super admins can reset admin-tier accounts",
        "generateLink({",
        "Failed to send reset link",
      ])
    ).toBe(true);
  });
});

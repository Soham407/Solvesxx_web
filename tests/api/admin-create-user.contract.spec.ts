import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("API contract: admin create user route", () => {
  it("keeps employee-link validation and role boundary safeguards intact", async () => {
    const source = await readRepoFile("app/api/admin/create-user/route.ts");

    expect(
      sourceContainsAll(source, [
        "full_name, email, and role_id are required",
        "Cannot provision admin-tier accounts via this endpoint",
        "Resident accounts cannot be linked to employee records",
        "Invalid employee_id",
        "Employee is already linked to another login",
        "resident_id is required for resident role",
      ])
    ).toBe(true);
  });
});

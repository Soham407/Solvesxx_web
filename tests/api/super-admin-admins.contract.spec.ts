import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("API contract: super-admin admin lifecycle", () => {
  it("keeps permission gating, validation, and audit logging intact", async () => {
    const source = await readRepoFile("app/api/super-admin/admins/route.ts");

    expect(
      sourceContainsAll(source, [
        'requirePlatformPermission("platform.admin_accounts.manage")',
        "Invalid admin payload",
        "Role not found",
        "A user with that email already exists",
        "generateLink({",
        "admin.invited",
        "insertAuditLog",
      ])
    ).toBe(true);
  });

  it("keeps the admin update and reset-password safeguards intact", async () => {
    const updateRoute = await readRepoFile("app/api/super-admin/admins/[id]/route.ts");
    const resetRoute = await readRepoFile("app/api/super-admin/admins/[id]/reset-password/route.ts");

    expect(
      sourceContainsAll(updateRoute, [
        "Only admin-tier accounts can be updated here",
        "Invalid target role",
        "At least one active super admin account must remain",
        "You cannot suspend or demote your own super admin account",
        "admin.updated",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(resetRoute, [
        "Only admin-tier accounts can be managed here",
        "admin.password_reset_requested",
        "generateLink({",
        "Failed to send password reset",
      ])
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("platform master contracts", () => {
  it("keeps system configuration aligned with the platform permission model", async () => {
    const hookSource = await readRepoFile("hooks/useSystemConfig.ts");
    const pageSource = await readRepoFile("app/(dashboard)/settings/company/page.tsx");

    expect(
      sourceContainsAll(hookSource, [
        'hasPermission',
        'platform.config.manage',
        'canManage',
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(hookSource, [
        'role !== "admin"',
        'role === "admin"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(pageSource, [
        "platform configuration permission",
        "platform.config.manage",
      ])
    ).toBe(true);
  });

  it("keeps employee onboarding aligned with the persisted company master data", async () => {
    const pageSource = await readRepoFile("app/(dashboard)/company/employees/create/page.tsx");
    const hookSource = await readRepoFile("hooks/useEmployees.ts");

    expect(
      sourceContainsAll(pageSource, [
        "useDesignations",
        "designationId",
        "User provisioning, role assignment, and operational location mapping still happen separately.",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(pageSource, [
        "Select Role",
        "Base Location",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(hookSource, [
        "designation_id: payload.designation_id || null",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(hookSource, [
        '.ilike("designation_name"',
      ])
    ).toBe(true);
  });

  it("keeps company locations on a real hook-backed maintenance flow", async () => {
    const pageSource = await readRepoFile("app/(dashboard)/company/locations/page.tsx");
    const hookSource = await readRepoFile("hooks/useCompanyLocations.ts");

    expect(
      sourceContainsAll(pageSource, [
        "useCompanyLocations",
        "CompanyLocationDialog",
        "Register Site",
        "Edit Site",
        "Deactivate Site",
        "Activate Site",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(pageSource, [
        "View Map Layout",
        "View Guard Logs",
        "Test Geo-Fence",
        "Adjust Radius",
        'import { supabase }',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(hookSource, [
        "useSupabaseQuery",
        "useSupabaseMutation",
        '.from("company_locations")',
        "createLocation",
        "updateLocation",
      ])
    ).toBe(true);
  });

  it("keeps user provisioning refreshing the parent master list after create", async () => {
    const source = await readRepoFile("components/dialogs/ProvisionUserDialog.tsx");

    expect(
      sourceContainsAll(source, [
        "onSuccess();",
        "if (result.password)",
        "setGeneratedPassword(result.password);",
        "CREATE_NEW_EMPLOYEE_VALUE",
      ])
    ).toBe(true);

    expect(sourceContainsNone(source, ['SelectItem value=""'])).toBe(true);
  });
});

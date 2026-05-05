import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("company admin onboarding contracts", () => {
  it("keeps employee onboarding aligned to live department data", async () => {
    const source = await readRepoFile("app/(dashboard)/company/employees/create/page.tsx");

    expect(
      sourceContainsAll(source, [
        "const departmentOptions = useMemo(",
        "designations.map((designation) => designation.department)",
        "employees.map((employee) => employee.department)",
        "SelectItem key={department} value={department}",
      ])
    ).toBe(true);
  });

  it("keeps user provisioning limited to unlinked employees", async () => {
    const source = await readRepoFile("components/dialogs/ProvisionUserDialog.tsx");

    expect(
      sourceContainsAll(source, [
        "const availableEmployees = employees.filter((employee) => !employee.linked_user_id);",
        "No unlinked employees found",
        "Link Existing Employee (Optional)",
      ])
    ).toBe(true);
  });
});

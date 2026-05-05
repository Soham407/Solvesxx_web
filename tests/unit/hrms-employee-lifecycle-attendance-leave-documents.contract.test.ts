import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("issue #14 hrms workflow contracts", () => {
  it("keeps employee conversion linkage atomic and issue-specific workflow coverage in place", async () => {
    const candidatesHookSource = await readRepoFile("hooks/useCandidates.ts");
    const documentsPageSource = await readRepoFile("app/(dashboard)/hrms/documents/page.tsx");
    const attendancePageSource = await readRepoFile("app/(dashboard)/hrms/attendance/page.tsx");
    const leavePageSource = await readRepoFile("app/(dashboard)/hrms/leave/page.tsx");
    const workflowSpecSource = await readRepoFile(
      "e2e/hrms-employee-lifecycle-attendance-leave-documents.spec.ts"
    );

    expect(
      sourceContainsAll(candidatesHookSource, [
        "Conversion aborted to prevent partial employee linkage state.",
        "await supabase.from(\"employees\").delete().eq(\"id\", newEmployee.id)",
        "await supabase\n            .from(\"users\")\n            .update({ employee_id: null })",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(documentsPageSource, [
        "Expiring Soon",
        "Verify Document",
        "Reject Document",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(attendancePageSource, ["Smart Attendance", "Shift Compliance"])
    ).toBe(true);

    expect(sourceContainsAll(leavePageSource, ["Leave Management", "Apply for Leave"])).toBe(true);

    expect(
      sourceContainsAll(workflowSpecSource, [
        "HRMS Employee Lifecycle → Attendance → Leave → Documents",
        "/hrms/recruitment",
        "/hrms/attendance",
        "/hrms/leave",
        "/hrms/documents",
        "candidates",
        "employees",
        "attendance_logs",
        "leave_applications",
        "employee_documents",
      ])
    ).toBe(true);
  });
});

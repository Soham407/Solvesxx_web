import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("security guard module contracts", () => {
  it("keeps the SEC-001 migration hardening in place", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260330000001_sec_001_guard_security_fixes.sql"
    );

    expect(
      sourceContainsAll(source, [
        "resolved_by = get_employee_id()",
        "gps coordinates are required to validate the geo-fence boundary",
        "where gt.employee_id = r.guard_id",
        "check-stationary-guards",
        "select public.detect_stationary_guards();",
      ])
    ).toBe(true);
  });

  it("resolves panic alerts with employee ids instead of auth user ids", async () => {
    const historySource = await readRepoFile("hooks/usePanicAlertHistory.ts");
    const subscriptionSource = await readRepoFile("hooks/usePanicAlertSubscription.ts");
    const fkRepairSource = await readRepoFile(
      "supabase/migrations/20260406014000_panic_alerts_resolved_by_fk_repair.sql"
    );

    expect(
      sourceContainsAll(historySource, [
        'import { getCurrentEmployeeId }',
        "resolved_by: resolvedBy",
      ])
    ).toBe(true);
    expect(
      sourceContainsNone(historySource, [
        "resolved_by: userData?.user?.id",
        "resolver:employees!panic_alerts_resolved_by_fkey",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(subscriptionSource, [
        'import { getCurrentEmployeeId }',
        "const resolvedBy = await getCurrentEmployeeId()",
        "resolved_by: resolvedBy",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(fkRepairSource, [
        "drop constraint if exists panic_alerts_resolved_by_fkey",
        "set resolved_by = e.id",
        "pa.resolved_by = e.auth_user_id",
        "references public.employees(id)",
      ])
    ).toBe(true);
  });

  it("keeps the guard station wired to the shift console entry point", async () => {
    const source = await readRepoFile("app/(dashboard)/guard/page.tsx");

    expect(
      sourceContainsAll(source, [
        "shift console",
        'href="/dashboard"',
        "open shift console to clock in",
      ])
    ).toBe(true);
  });
});

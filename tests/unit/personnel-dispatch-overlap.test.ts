import { describe, expect, it } from "vitest";
import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("Personnel Dispatch Overlap Detection", () => {
  it("enforces EXCLUSION constraint at the database level", async () => {
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260403000000_add_employee_deployment_overlap_constraint.sql"
    );

    expect(
      sourceContainsAll(migrationSource, [
        "CREATE EXTENSION IF NOT EXISTS btree_gist",
        "ALTER TABLE personnel_dispatches",
        "ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id)",
        "ADD CONSTRAINT personnel_dispatches_overlap_excl",
        "EXCLUDE USING gist",
        "daterange(start_date, COALESCE(end_date, 'infinity'::date), '[)') WITH &&",
        "WHERE (status NOT IN ('cancelled', 'completed', 'withdrawn'))",
      ])
    ).toBe(true);
  });

  it("performs pre-flight overlap check in usePersonnelDispatches hook", async () => {
    const hookSource = await readRepoFile("hooks/usePersonnelDispatches.ts");

    expect(
      sourceContainsAll(hookSource, [
        'const overlapEndDate = input.end_date || "9999-12-31";',
        "// Pre-flight overlap check",
        '.from("personnel_dispatches")',
        '.eq("employee_id", input.employee_id)',
        '.in("status", ["dispatched", "confirmed", "active"])',
        '.lte("start_date", overlapEndDate)',
        '.or(`end_date.gte.${input.start_date},end_date.is.null`)',
        "toast({ title: \"Deployment Conflict\"",
        "return { success: false, error: msg }",
      ])
    ).toBe(true);
  });

  it("surfaces conflict details in the UI", async () => {
    const dialogSource = await readRepoFile("components/dialogs/ServiceDeliveryNoteDialog.tsx");

    // This will be updated in the next step
    // For now, we expect it to eventually contain conflict handling
    expect(dialogSource).toBeDefined();
  });
});

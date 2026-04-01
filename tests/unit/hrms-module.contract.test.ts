import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("hrms module contracts", () => {
  it("keeps the attendance page behind the attendance data layer", async () => {
    const attendancePageSource = await readRepoFile(
      "app/(dashboard)/hrms/attendance/page.tsx"
    );
    const attendanceHookSource = await readRepoFile("hooks/useAttendance.ts");

    expect(
      sourceContainsAll(attendancePageSource, [
        "getAdminAttendanceOverview",
        "getEmployeeAttendanceHistory",
        "type AttendanceRecord = AdminAttendanceOverviewRecord;",
        "type PersonalRecord = PersonalAttendanceHistoryRecord;",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(attendancePageSource, ['import { supabase }'])
    ).toBe(true);

    expect(
      sourceContainsAll(attendanceHookSource, [
        "export async function getEmployeeAttendanceHistory",
        "export async function getAdminAttendanceOverview",
        "location: `Off-Site (${Math.round(distance)}m away)`",
        'verification: "Location Not Configured"',
      ])
    ).toBe(true);
  });

  it("keeps payroll generation delegated to the database and fixes attendance summaries", async () => {
    const payrollSource = await readRepoFile("hooks/usePayroll.ts");

    expect(
      sourceContainsAll(payrollSource, [
        "supabase.rpc('generate_payroll_cycle' as any",
        '.gte("log_date", startDate)',
        '.lte("log_date", endDate)',
        '.select("employee_id, status, overtime_hours")',
        "summarizeAttendanceLogs",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(payrollSource, [
        "export function calculateSalary",
        '"get_attendance_summary"',
        '"get_batch_attendance_summary"',
        '.gte("date", startDate)',
        '.lte("date", endDate)',
      ])
    ).toBe(true);
  });

  it("keeps recruitment wired to background verifications and hardens the auto punch-out cron", async () => {
    const recruitmentPageSource = await readRepoFile(
      "app/(dashboard)/hrms/recruitment/page.tsx"
    );
    const bgvHookSource = await readRepoFile(
      "hooks/useBackgroundVerifications.ts"
    );
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260330000006_hr_001_hrms_audit_fixes.sql"
    );

    expect(
      sourceContainsAll(recruitmentPageSource, [
        "useBackgroundVerifications",
        "Background Verification Checklist",
        "ShieldCheck",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(bgvHookSource, [
        '.from("background_verifications")',
        "initiateVerification",
        "updateStatus",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(migrationSource, [
        "CREATE EXTENSION IF NOT EXISTS pg_cron;",
        "ADD COLUMN IF NOT EXISTS notes TEXT;",
        "is_auto_punch_out = TRUE",
        "status = 'absent_breach'",
        "total_hours = CASE",
        "cron.schedule(",
        "'auto-punch-out-daily'",
        "SELECT public.auto_punch_out_idle_employees();",
      ])
    ).toBe(true);
  });
});

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
    const payrollPageSource = await readRepoFile("app/(dashboard)/hrms/payroll/page.tsx");
    const leavePageSource = await readRepoFile("app/(dashboard)/hrms/leave/page.tsx");
    const attendancePageSource = await readRepoFile("app/(dashboard)/hrms/attendance/page.tsx");
    const employeeDetailPageSource = await readRepoFile(
      "app/(dashboard)/company/employees/[id]/page.tsx"
    );
    const employeeCompensationPanelSource = await readRepoFile(
      "components/forms/EmployeeCompensationPanel.tsx"
    );
    const employeeSalaryStructureHookSource = await readRepoFile(
      "hooks/useEmployeeSalaryStructure.ts"
    );
    const rolesSource = await readRepoFile("src/lib/auth/roles.ts");
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260406020000_hrms_workflow_truth_repairs.sql"
    );
    const employeeVisibilityMigrationSource = await readRepoFile(
      "supabase/migrations/20260406023000_hrms_payroll_employee_visibility.sql"
    );
    const salaryStructureUiMigrationSource = await readRepoFile(
      "supabase/migrations/20260406030000_hrms_salary_structure_ui_support.sql"
    );

    expect(
      sourceContainsAll(payrollSource, [
        "supabase.rpc('generate_payroll_cycle' as any",
        '.gte("log_date", startDate)',
        '.lte("log_date", endDate)',
        '.select("status, total_hours")',
        '.select("employee_id, status, total_hours")',
        "summarizeAttendanceLogs",
        '"paid_leave"',
        '"unpaid_leave"',
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

    expect(
      sourceContainsAll(payrollPageSource, [
        "const canManagePayroll = role === \"admin\" || role === \"super_admin\";",
        "{canManagePayroll && selectedCycle?.status === \"draft\"",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(leavePageSource, [
        "\"security_supervisor\"",
        "\"super_admin\"",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(attendancePageSource, [
        "\"security_supervisor\"",
        "\"super_admin\"",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(rolesSource, [
        "society_manager: [\"/dashboard\", \"/society\", \"/resident\", \"/test-resident\", \"/tickets\", \"/finance/compliance\", \"/service-requests\", \"/hrms/attendance\", \"/hrms/leave\"]",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(employeeDetailPageSource, [
        "TabsTrigger value=\"compensation\"",
        "EmployeeCompensationPanel",
        "Manage Payroll Setup",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(employeeCompensationPanelSource, [
        "Payroll Compensation",
        "Save Compensation",
        "Payroll is blocked until compensation is configured.",
        "No active payroll compensation is configured for this employee yet.",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(employeeSalaryStructureHookSource, [
        "PAYROLL_SUPPORTED_COMPONENT_ABBRS = [\"B\", \"HRA\", \"SA\", \"TA\", \"MA\"]",
        "supabase.rpc(\"upsert_employee_salary_component\" as any",
        "Payroll compensation updated.",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(migrationSource, [
        "create policy \"leave_applications_insert_own\"",
        "create or replace function public.sync_leave_application_attendance",
        "create or replace function public.validate_clock_in_geofence",
        "employee salary structure is not configured",
        "only admins can generate payroll cycles",
        "paid_leave",
        "unpaid_leave",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(employeeVisibilityMigrationSource, [
        'has_role(\'super_admin\')',
        'has_role(\'account\')',
        'create policy "Higher roles view employees"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(salaryStructureUiMigrationSource, [
        "create policy \"salary_components_select\"",
        "create policy \"employee_salary_structure_manage\"",
        "create or replace function public.upsert_employee_salary_component",
        "cannot backdate before the current active component start date",
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

import crypto from "node:crypto";

import { expect, test } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

async function runMutation<T>(operation: PromiseLike<{ data: T; error: { message?: string } | Error | null }>) {
  const { data, error } = await operation;
  if (error) {
    throw new Error(error instanceof Error ? error.message : error.message ?? "Supabase mutation failed");
  }
  return data;
}

type SeededCandidate = {
  candidateId: string;
  candidateCode: string;
  email: string;
  firstName: string;
  lastName: string;
};

async function seedOfferedCandidate(): Promise<SeededCandidate> {
  const client = createServiceRoleClient();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const candidateId = crypto.randomUUID();
  const candidateCode = `CAND-${token}`;
  const email = `issue14.${token.toLowerCase()}@example.com`;
  const firstName = `Issue14${token.slice(0, 4)}`;
  const lastName = `Candidate${token.slice(4)}`;

  await runMutation(
    client.from("candidates").insert({
      id: candidateId,
      candidate_code: candidateCode,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: "9999999999",
      applied_position: "Security Guard",
      department: "Security",
      status: "offered",
      offer_date: new Date().toISOString().slice(0, 10),
      offer_accepted_at: new Date().toISOString(),
    })
  );

  return { candidateId, candidateCode, email, firstName, lastName };
}

async function seedAttendanceLeaveAndDocuments(employeeId: string, employeeCode: string) {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = nextWeekDate.toISOString().slice(0, 10);

  await runMutation(
    client.from("attendance_logs").insert({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      log_date: today,
      check_in_time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      check_out_time: new Date().toISOString(),
      check_in_location_id: ids.locationId,
      status: "present",
      total_hours: 8,
    })
  );

  await runMutation(
    client.from("leave_applications").insert({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      leave_type_id: ids.leaveTypeId,
      from_date: tomorrow,
      to_date: tomorrow,
      number_of_days: 1,
      reason: `Issue #14 workflow ${employeeCode}`,
      status: "approved",
    })
  );

  await runMutation(
    client.from("employee_documents").insert({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      document_type: "aadhar_card",
      document_name: `Issue 14 compliance ${employeeCode}`,
      document_number: `${employeeCode}-AADHAR`,
      file_path: `${employeeId}/aadhar_card/${crypto.randomUUID()}.pdf`,
      file_name: `${employeeCode}.pdf`,
      file_size: 1024,
      mime_type: "application/pdf",
      issue_date: today,
      expiry_date: nextWeek,
      status: "verified",
    })
  );
}

test.describe("HRMS Employee Lifecycle → Attendance → Leave → Documents", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("converts offered candidates to employees and keeps attendance, leave, and document surfaces truthful", async ({ page }) => {
    const seededCandidate = await seedOfferedCandidate();
    const client = createServiceRoleClient();

    await page.goto("/hrms/recruitment");
    const candidateRow = page.locator("tr", { hasText: seededCandidate.candidateCode }).first();
    await expect(candidateRow).toBeVisible({ timeout: 20_000 });

    await candidateRow.getByRole("button").last().click();
    await page.getByRole("menuitem", { name: /convert to employee/i }).click();

    const employeeCode = `EMP-I14-${seededCandidate.candidateCode.slice(-4)}`;
    const convertDialog = page.getByRole("dialog", { name: /convert to employee/i });
    await expect(convertDialog).toBeVisible({ timeout: 15_000 });
    await convertDialog.getByLabel(/employee code/i).fill(employeeCode);
    await convertDialog.getByLabel(/date of joining/i).fill(new Date().toISOString().slice(0, 10));
    await convertDialog.getByRole("button", { name: /convert to employee/i }).click();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("candidates")
            .select("id, status, converted_employee_id")
            .eq("id", seededCandidate.candidateId)
            .single();

          if (error) throw error;
          return data;
        },
        { timeout: 20_000 }
      )
      .toMatchObject({ status: "hired" });

    const { data: convertedCandidate, error: convertedCandidateError } = await client
      .from("candidates")
      .select("converted_employee_id")
      .eq("id", seededCandidate.candidateId)
      .single();

    if (convertedCandidateError) throw convertedCandidateError;
    if (!convertedCandidate.converted_employee_id) {
      throw new Error("Expected converted employee link to be persisted");
    }

    const employeeId = convertedCandidate.converted_employee_id;

    const { data: employeeRow, error: employeeRowError } = await client
      .from("employees")
      .select("id, email, employee_code")
      .eq("id", employeeId)
      .single();

    if (employeeRowError) throw employeeRowError;
    expect(employeeRow.email).toBe(seededCandidate.email);
    expect(employeeRow.employee_code).toBe(employeeCode);

    await seedAttendanceLeaveAndDocuments(employeeId, employeeCode);

    await page.goto("/hrms/attendance");
    await expect(page.getByText(/smart attendance/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(seededCandidate.firstName, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/hrms/leave");
    await expect(page.getByText(/leave management/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(employeeCode, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/hrms/documents");
    await expect(page.getByText(/document governance/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(seededCandidate.firstName, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/expiring soon/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

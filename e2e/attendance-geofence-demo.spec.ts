import path from "node:path";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

const selfiePath = path.join(process.cwd(), "public", "icons", "icon-192x192.png");

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function loginAndOpen(page: Page, role: Parameters<typeof loginAsRole>[1], route: string) {
  await loginAsRole(page, role);
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
}

async function getGuardFixture() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const [{ data: employee, error: employeeError }, { data: location, error: locationError }] = await Promise.all([
    client
      .from("employees")
      .select("id, first_name, last_name")
      .eq("id", ids.guardEmployeeId)
      .single(),
    client
      .from("company_locations")
      .select("id, latitude, longitude, geo_fence_radius, location_name")
      .eq("id", ids.locationId)
      .single(),
  ]);

  if (employeeError) throw employeeError;
  if (locationError) throw locationError;

  return {
    employeeId: employee.id as string,
    fullName: `${(employee as any).first_name || ""} ${(employee as any).last_name || ""}`.trim(),
    location: {
      id: location.id as string,
      latitude: Number((location as any).latitude),
      longitude: Number((location as any).longitude),
      radius: Number((location as any).geo_fence_radius || 50),
      name: (location as any).location_name as string,
    },
  };
}

async function resetTodayAttendance(employeeId: string) {
  const client = createServiceRoleClient();
  const today = todayIsoDate();

  const { error } = await client
    .from("attendance_logs")
    .delete()
    .eq("employee_id", employeeId)
    .eq("log_date", today);

  if (error) throw error;
}

async function widenGuardShiftWindow(employeeId: string) {
  const client = createServiceRoleClient();
  const { data: assignment, error: assignmentError } = await client
    .from("employee_shift_assignments")
    .select("shift_id, assigned_from")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .order("assigned_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment?.shift_id) return;

  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const toTime = (value: Date) => value.toTimeString().slice(0, 8);

  const { error: shiftError } = await client
    .from("shifts")
    .update({
      start_time: toTime(start),
      end_time: toTime(end),
      grace_time_minutes: 120,
      is_night_shift: false,
    })
    .eq("id", assignment.shift_id);

  if (shiftError) throw shiftError;
}

async function waitForAttendanceRecord(
  employeeId: string,
  predicate: (row: Record<string, unknown> | null) => boolean,
  timeout = 30_000,
) {
  const client = createServiceRoleClient();
  const today = todayIsoDate();

  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("attendance_logs")
          .select(
            "employee_id, log_date, check_in_time, check_out_time, check_in_latitude, check_in_longitude, check_in_selfie_url, check_out_latitude, check_out_longitude",
          )
          .eq("employee_id", employeeId)
          .eq("log_date", today)
          .maybeSingle();

        if (error) throw error;
        return predicate(data as Record<string, unknown> | null);
      },
      { timeout },
    )
    .toBe(true);
}

function makeGuardContext(browser: Browser, latitude: number, longitude: number) {
  return browser.newContext({
    geolocation: { latitude, longitude },
    permissions: ["geolocation"],
  });
}

test.describe("Attendance Geofence Demo Pack", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("guard cannot start shift when outside the assigned geo-fence", async ({ browser }) => {
    const guard = await getGuardFixture();
    await resetTodayAttendance(guard.employeeId);
    await widenGuardShiftWindow(guard.employeeId);

    const farContext = await makeGuardContext(
      browser,
      guard.location.latitude + 0.2,
      guard.location.longitude + 0.2,
    );

    try {
      const page = await farContext.newPage();
      await loginAndOpen(page, "security_guard", "/dashboard");

      await page.getByRole("button", { name: /start shift \(clock in\)/i }).click();
      await expect(page.getByText(/identity verification/i)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /close shift \(clock out\)/i })).toHaveCount(0);
      await expect(page.getByText(/outside range \(\d+m away\)/i)).toBeVisible({ timeout: 10_000 });

      await waitForAttendanceRecord(guard.employeeId, (row) => row === null, 5_000);
    } finally {
      await farContext.close();
    }
  });

  test("guard can clock in with selfie + gps, clock out, and admin can verify the attendance record", async ({ browser, page }) => {
    const guard = await getGuardFixture();
    await resetTodayAttendance(guard.employeeId);
    await widenGuardShiftWindow(guard.employeeId);

    const guardContext = await makeGuardContext(
      browser,
      guard.location.latitude,
      guard.location.longitude,
    );

    try {
      const guardPage = await guardContext.newPage();
      await loginAndOpen(guardPage, "security_guard", "/dashboard");

      await guardPage.getByRole("button", { name: /start shift \(clock in\)/i }).click();
      await expect(guardPage.getByText(/identity verification/i)).toBeVisible({ timeout: 10_000 });
      await guardPage.locator('input[type="file"][capture="user"]').setInputFiles(selfiePath);
      await guardPage.getByRole("button", { name: /confirm & clock in/i }).click();
      await expect(guardPage.getByText(/shift started/i)).toBeVisible({ timeout: 20_000 });
      await expect(guardPage.getByRole("button", { name: /close shift \(clock out\)/i })).toBeVisible({
        timeout: 20_000,
      });

      await waitForAttendanceRecord(
        guard.employeeId,
        (row) =>
          Boolean(
            row?.check_in_time &&
              row?.check_in_latitude &&
              row?.check_in_longitude &&
              row?.check_in_selfie_url,
          ),
      );

      await guardPage.getByRole("button", { name: /close shift \(clock out\)/i }).click();
      await expect(guardPage.getByText(/shift ended/i)).toBeVisible({ timeout: 20_000 });

      await waitForAttendanceRecord(
        guard.employeeId,
        (row) =>
          Boolean(
            row?.check_in_time &&
              row?.check_out_time &&
              row?.check_out_latitude &&
              row?.check_out_longitude,
          ),
      );
    } finally {
      await guardContext.close();
    }

    await loginAndOpen(page, "admin", "/hrms/attendance");
    await expect(page.getByText(guard.fullName).first()).toBeVisible({ timeout: 20_000 });

    const row = page.locator("tr").filter({ hasText: guard.fullName }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText(/gps verified/i)).toBeVisible();
    await expect(row.getByText(/selfie \+ gps/i)).toBeVisible();
    await expect(row.getByText(/present/i)).toBeVisible();
  });
});

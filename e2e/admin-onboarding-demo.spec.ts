import crypto from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient } from "./helpers/db";

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function selectOption(page: Page, root: Page | Locator, index: number, optionText: string) {
  await root.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: optionText }).click();
}

test.describe("Admin onboarding demo", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("admin can onboard a guard from the security page", async ({ page }) => {
    const client = createServiceRoleClient();
    const guardName = `Guard ${token("demo")}`;
    const guardPhone = `9${Date.now().toString().slice(-9)}`;
    const guardEmail = `${token("guard")}@example.com`;

    const [{ data: location }, { data: shift }] = await Promise.all([
      client
        .from("company_locations")
        .select("id, location_name")
        .eq("is_active", true)
        .order("location_name")
        .limit(1)
        .single(),
      client
        .from("shifts")
        .select("id, shift_name")
        .eq("is_active", true)
        .order("shift_name")
        .limit(1)
        .maybeSingle(),
    ]);

    expect(location).toBeTruthy();

    await loginAsRole(page, "admin");
    await page.goto("/services/security");
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("button", { name: /onboard guard/i }).click();
    const dialog = page.getByRole("dialog", { name: /onboard security guard/i });
    await expect(dialog).toBeVisible();
    await dialog.locator("#guard_onboard_full_name").fill(guardName);
    await dialog.locator("#guard_onboard_phone").fill(guardPhone);
    await dialog.locator("#guard_onboard_email").fill(guardEmail);
    await selectOption(page, dialog, 0, location!.location_name);

    if (shift?.shift_name) {
      await selectOption(page, dialog, 1, shift.shift_name);
    }

    await dialog.getByRole("button", { name: /create guard/i }).click();

    await expect(dialog.getByText(/temporary password/i)).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText(guardEmail)).toBeVisible();

    const authUsers = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = ((authUsers.data?.users ?? []) as Array<{ id: string; email?: string | null }>).find(
      (user) => user.email?.toLowerCase() === guardEmail.toLowerCase(),
    );
    expect(authUser?.id).toBeTruthy();

    const { data: publicUser } = await client
      .from("users")
      .select("id, phone, employee_id, roles(role_name)")
      .eq("email", guardEmail)
      .single();

    expect(publicUser?.phone).toBe(guardPhone);
    expect(publicUser?.employee_id).toBeTruthy();

    const roleRecord = Array.isArray((publicUser as any)?.roles) ? (publicUser as any).roles[0] : (publicUser as any)?.roles;
    expect(roleRecord?.role_name).toBe("security_guard");

    const { data: employee } = await client
      .from("employees")
      .select("id, auth_user_id, phone")
      .eq("id", (publicUser as any).employee_id)
      .single();

    expect(employee?.phone).toBe(guardPhone);
    expect(employee?.auth_user_id).toBe(authUser?.id);

    const { data: guard } = await client
      .from("security_guards")
      .select("id, employee_id, assigned_location_id")
      .eq("employee_id", employee!.id)
      .single();

    expect(guard?.assigned_location_id).toBe(location!.id);

    if (shift?.id) {
      const { data: assignment } = await client
        .from("employee_shift_assignments")
        .select("shift_id, is_active")
        .eq("employee_id", employee!.id)
        .eq("is_active", true)
        .single();

      expect(assignment?.shift_id).toBe(shift.id);
    }

    const { data: alternateLocation } = await client
      .from("company_locations")
      .select("id, location_name")
      .neq("id", location!.id)
      .eq("is_active", true)
      .order("location_name")
      .limit(1)
      .maybeSingle();

    if (alternateLocation) {
      await dialog.getByRole("button", { name: /^close$/i }).first().click();
      const guardRow = page.locator("tr").filter({ hasText: guardName }).first();
      await guardRow.getByRole("button").last().click();
      await page.getByRole("menuitem", { name: /edit assignment/i }).click();
      const editDialog = page.getByRole("dialog", { name: /edit guard assignment/i });
      await selectOption(page, editDialog, 0, alternateLocation.location_name);
      await selectOption(page, editDialog, 2, "Inactive");
      const updateResponse = page.waitForResponse((response) =>
        response.url().includes(`/api/admin/guards/${guard!.id}`) && response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /save changes/i }).click();
      await expect(editDialog).toBeHidden({ timeout: 20_000 });
      const response = await updateResponse;
      expect(response.ok()).toBeTruthy();

      const { data: updatedGuard } = await client
        .from("security_guards")
        .select("assigned_location_id, is_active")
        .eq("id", guard!.id)
        .single();

      expect(updatedGuard?.assigned_location_id).toBe(alternateLocation.id);
      expect(updatedGuard?.is_active).toBe(false);
    }
  });

  test("admin can create a resident with linked login and status badges", async ({ page }) => {
    const client = createServiceRoleClient();
    const residentName = `Resident ${token("demo")}`;
    const residentPhone = `8${Date.now().toString().slice(-9)}`;
    const residentEmail = `${token("resident")}@example.com`;
    const tempPassword = "Resident@123";

    const { data: flat } = await client
      .from("flats")
      .select("id, flat_number, buildings(building_name)")
      .eq("is_active", true)
      .order("flat_number")
      .limit(1)
      .single();

    expect(flat).toBeTruthy();

    const buildingRecord = Array.isArray((flat as any).buildings) ? (flat as any).buildings[0] : (flat as any).buildings;
    const flatOptionLabel = `${buildingRecord?.building_name ? `${buildingRecord.building_name} - ` : ""}Flat ${(flat as any).flat_number}`;

    await loginAsRole(page, "admin");
    await page.goto("/society/residents");
    await expect(page.locator("main")).toBeVisible();

    await page.getByRole("button", { name: /register family/i }).click();
    const dialog = page.getByRole("dialog", { name: /register family/i });
    await dialog.getByLabel(/full name/i).fill(residentName);
    await dialog.getByLabel(/phone number/i).fill(residentPhone);
    await selectOption(page, dialog, 0, flatOptionLabel);
    await dialog.getByLabel(/^email$/i).fill(residentEmail);
    await dialog.getByLabel(/temporary password/i).fill(tempPassword);
    const createResidentResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/society/residents") &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    const refreshResidentsResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/society/residents") &&
        response.request().method() === "GET" &&
        response.ok(),
    );
    await dialog.getByRole("button", { name: /^register$/i }).click();
    await createResidentResponse;
    await expect(dialog).toHaveCount(0, { timeout: 20_000 });
    await refreshResidentsResponse;
    await page.getByPlaceholder(/search full_name/i).fill(residentName);

    await expect(page.getByText(residentName)).toBeVisible({ timeout: 20_000 });
    const residentRow = page.locator("tr").filter({ hasText: residentName }).first();
    await expect(residentRow.getByText(/auth linked/i)).toBeVisible();
    await expect(residentRow.getByText(/flat linked/i)).toBeVisible();
    await expect(residentRow.getByText(/^resident$/i)).toBeVisible();
    await expect(residentRow.getByText(/push token|no push token/i)).toBeVisible();
    await expect(residentRow.getByText(/unread alerts/i)).toBeVisible();
    await expect(residentRow.getByText(/pending visitors/i)).toBeVisible();

    const { data: resident } = await client
      .from("residents")
      .select("id, phone, auth_user_id, flat_id")
      .eq("full_name", residentName)
      .single();

    expect(resident?.phone).toBe(residentPhone);
    expect(resident?.auth_user_id).toBeTruthy();
    expect(resident?.flat_id).toBe((flat as any).id);

    const { data: linkedUser } = await client
      .from("users")
      .select("id, phone, must_change_password, roles(role_name)")
      .eq("id", resident!.auth_user_id)
      .single();

    expect(linkedUser?.phone).toBeNull();
    expect(linkedUser?.must_change_password).toBe(true);
    const roleRecord = Array.isArray((linkedUser as any)?.roles) ? (linkedUser as any).roles[0] : (linkedUser as any)?.roles;
    expect(roleRecord?.role_name).toBe("resident");
  });
});

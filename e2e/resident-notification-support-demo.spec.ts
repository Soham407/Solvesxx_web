import { expect, test, type Page } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

async function loginAndOpen(page: Page, role: Parameters<typeof loginAsRole>[1], route: string) {
  await loginAsRole(page, role);
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
}

async function getResidentFixture() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const { data, error } = await client
    .from("residents")
    .select("id, full_name, auth_user_id")
    .eq("id", ids.residentId)
    .single();

  if (error) throw error;
  if (!data?.auth_user_id) throw new Error("Resident fixture is missing auth_user_id.");

  return {
    residentId: data.id as string,
    fullName: data.full_name as string,
    authUserId: data.auth_user_id as string,
  };
}

async function resetResidentSupportState(userId: string, token: string) {
  const client = createServiceRoleClient();

  const [{ error: markReadError }, { error: notificationError }, { error: pushTokenError }] = await Promise.all([
    client
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false),
    client
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .ilike("title", "E2E Resident Alert %"),
    client
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token),
  ]);

  if (markReadError) throw markReadError;
  if (notificationError) throw notificationError;
  if (pushTokenError) throw pushTokenError;
}

async function getActivePushTokenCount(userId: string) {
  const client = createServiceRoleClient();
  const { count, error } = await client
    .from("push_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("is_active", false);

  if (error) throw error;
  return count ?? 0;
}

async function seedResidentSupportState(userId: string, token: string, runKey: string) {
  const client = createServiceRoleClient();
  const createdAt = new Date().toISOString();

  const [{ error: notificationError }, { error: pushTokenError }] = await Promise.all([
    client.from("notifications").insert([
      {
        user_id: userId,
        notification_type: "resident_support_demo",
        title: `E2E Resident Alert ${runKey} A`,
        message: "Package arrived at the gate and is waiting for confirmation.",
        priority: "high",
        is_read: false,
        created_at: createdAt,
      },
      {
        user_id: userId,
        notification_type: "resident_support_demo",
        title: `E2E Resident Alert ${runKey} B`,
        message: "Security shared a visitor update for your flat.",
        priority: "normal",
        is_read: false,
        created_at: new Date(Date.now() + 1000).toISOString(),
      },
    ]),
    client.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        token_type: "fcm",
        device_type: "web",
        is_active: true,
        last_used: createdAt,
      },
      { onConflict: "user_id,token" },
    ),
  ]);

  if (notificationError) throw notificationError;
  if (pushTokenError) throw pushTokenError;
}

async function waitForUnreadCount(userId: string, expected: number, timeout = 30_000) {
  const client = createServiceRoleClient();

  await expect
    .poll(
      async () => {
        const { count, error } = await client
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (error) throw error;
        return count ?? 0;
      },
      { timeout },
    )
    .toBe(expected);
}

async function waitForAllResidentAlertsRead(userId: string, runKey: string, timeout = 30_000) {
  const client = createServiceRoleClient();

  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("notifications")
          .select("is_read")
          .eq("user_id", userId)
          .ilike("title", `E2E Resident Alert ${runKey}%`);

        if (error) throw error;
        return (data ?? []).length > 0 && (data ?? []).every((row: any) => row.is_read === true);
      },
      { timeout },
    )
    .toBe(true);
}

async function expectResidentSupportRow(
  page: Page,
  residentName: string,
  expectedUnread: number,
  expectedPushCount: number,
) {
  await page.reload();
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

  const residentRow = page.locator("tr").filter({ hasText: residentName }).first();
  await expect(residentRow).toBeVisible({ timeout: 20_000 });
  await expect(residentRow.getByText(`${expectedPushCount} Push Token`, { exact: true })).toBeVisible();
  await expect(residentRow.getByText(`${expectedUnread} Unread Alerts`, { exact: true })).toBeVisible();
}

test.describe("Resident Notification Support Demo Pack", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("resident can clear unread notifications and admin support signals reflect the change", async ({
    page,
    browser,
  }) => {
    const resident = await getResidentFixture();
    const runKey = `${Date.now()}`;
    const pushToken = `e2e-resident-support-${runKey}`;

    await resetResidentSupportState(resident.authUserId, pushToken);
    const baselinePushTokens = await getActivePushTokenCount(resident.authUserId);
    await seedResidentSupportState(resident.authUserId, pushToken, runKey);
    await waitForUnreadCount(resident.authUserId, 2);

    const adminContext = await browser.newContext();

    try {
      const adminPage = await adminContext.newPage();
      await loginAndOpen(adminPage, "admin", "/society/residents");
      await expectResidentSupportRow(adminPage, resident.fullName, 2, baselinePushTokens + 1);

      await loginAndOpen(page, "resident", "/resident");
      const notificationsButton = page.getByRole("button", { name: /^notifications$/i });
      await notificationsButton.click();

      await expect(page.getByText(`E2E Resident Alert ${runKey} B`, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(`E2E Resident Alert ${runKey} A`, { exact: true })).toBeVisible();
      await expect(page.getByText(/2 unread/i)).toBeVisible();

      await page.getByRole("button", { name: /mark all read/i }).click();
      await waitForAllResidentAlertsRead(resident.authUserId, runKey);
      await expect(page.getByRole("button", { name: /mark all read/i })).toHaveCount(0, { timeout: 10_000 });
      await page.keyboard.press("Escape");

      await expectResidentSupportRow(adminPage, resident.fullName, 0, baselinePushTokens + 1);
    } finally {
      await adminContext.close();
      await resetResidentSupportState(resident.authUserId, pushToken);
    }
  });
});

import { expect, test, type Page } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

const CHECKLIST_TASK = "Emergency exit paths clear and unobstructed";
const CHECKLIST_ITEM_ID = "task-4";

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

async function getGuardIdentity() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const { data, error } = await client
    .from("employees")
    .select("id, first_name, last_name")
    .eq("id", ids.guardEmployeeId)
    .single();

  if (error) throw error;

  return {
    employeeId: data.id as string,
    fullName: `${(data as any).first_name || ""} ${(data as any).last_name || ""}`.trim(),
  };
}

async function getSecurityChecklistId() {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("daily_checklists")
    .select("id")
    .eq("department", "security")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Active security checklist not found.");
  return data.id as string;
}

async function resetTodayChecklistResponse(employeeId: string, checklistId: string) {
  const client = createServiceRoleClient();
  const { error } = await client
    .from("checklist_responses")
    .delete()
    .eq("employee_id", employeeId)
    .eq("checklist_id", checklistId)
    .eq("response_date", todayIsoDate());

  if (error) throw error;
}

async function waitForChecklistCompletion(employeeId: string, checklistId: string, timeout = 30_000) {
  const client = createServiceRoleClient();

  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("checklist_responses")
          .select("responses, is_complete, employee_id, response_date")
          .eq("employee_id", employeeId)
          .eq("checklist_id", checklistId)
          .eq("response_date", todayIsoDate())
          .maybeSingle();

        if (error) throw error;

        const responses = (data?.responses as Record<string, { completed?: boolean; completedAt?: string }> | null) || {};
        const item = responses[CHECKLIST_ITEM_ID];

        return Boolean(item?.completed && item?.completedAt);
      },
      { timeout },
    )
    .toBe(true);
}

test.describe("Checklist Reporting Demo Pack", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("guard can complete a checklist task and society reporting shows the completed task", async ({ page, browser }) => {
    const guard = await getGuardIdentity();
    const checklistId = await getSecurityChecklistId();
    await resetTodayChecklistResponse(guard.employeeId, checklistId);

    await loginAndOpen(page, "security_guard", "/dashboard");

    await expect(page.getByText(CHECKLIST_TASK)).toBeVisible({ timeout: 20_000 });
    const taskRow = page.getByText(CHECKLIST_TASK).first();
    await taskRow.click();

    await expect(page.getByText(/task completed/i)).toBeVisible({ timeout: 20_000 });
    await waitForChecklistCompletion(guard.employeeId, checklistId);

    const managerContext = await browser.newContext();

    try {
      const managerPage = await managerContext.newPage();
      await loginAndOpen(managerPage, "society_manager", "/society/checklists");

      const reportingRow = managerPage.locator("tr").filter({ hasText: CHECKLIST_TASK }).first();
      await expect(reportingRow).toBeVisible({ timeout: 20_000 });
      await expect(reportingRow.getByText(/completed/i)).toBeVisible();
      await expect(reportingRow.getByText(new RegExp(guard.fullName, "i"))).toBeVisible();
    } finally {
      await managerContext.close();
    }
  });
});

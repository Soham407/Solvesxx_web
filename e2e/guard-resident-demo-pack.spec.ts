import crypto from "node:crypto";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

const visitorPhotoPath = path.join(process.cwd(), "e2e", "fixtures", "visitor-photo.svg");

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

async function loginAndOpen(page: Page, role: Parameters<typeof loginAsRole>[1], route: string) {
  await loginAsRole(page, role);
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
}

function visitorRow(page: Page, visitorName: string) {
  return page.locator("tr").filter({ hasText: visitorName }).first();
}

async function waitForVisitorCreated(
  visitorName: string,
  timeout = 30_000,
): Promise<{ id: string; approved_by_resident: boolean | null; resident_id: string | null }> {
  const client = createServiceRoleClient();
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const { data, error } = await client
      .from("visitors")
      .select("id, approved_by_resident, resident_id")
      .eq("visitor_name", visitorName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data as { id: string; approved_by_resident: boolean | null; resident_id: string | null };
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for visitor ${visitorName} to be created.`);
}

async function pollVisitorById(
  visitorId: string,
  selector: string,
  predicate: (row: Record<string, unknown>) => boolean,
  timeout = 30_000,
) {
  const client = createServiceRoleClient();

  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("visitors")
          .select(selector)
          .eq("id", visitorId)
          .single();

        if (error) {
          throw error;
        }

        return predicate(data as unknown as Record<string, unknown>);
      },
      { timeout },
    )
    .toBe(true);
}

async function insertPanicAlert() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const { data, error } = await client
    .from("panic_alerts")
    .insert({
      id: crypto.randomUUID(),
      guard_id: ids.guardRecordId,
      location_id: ids.locationId,
      alert_type: "panic",
      latitude: 18.5194,
      longitude: 73.8519,
      alert_time: new Date().toISOString(),
      description: `Demo pack alert ${token("panic")}`,
      is_resolved: false,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function waitForPanicResolution(alertId: string, timeout = 30_000) {
  const client = createServiceRoleClient();

  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("panic_alerts")
          .select("is_resolved, resolution_notes, resolved_by")
          .eq("id", alertId)
          .single();

        if (error) {
          throw error;
        }

        return data;
      },
      { timeout },
    )
    .toMatchObject({
      is_resolved: true,
    });
}

test.describe("Guard + Resident Demo Pack", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("admin can export the resident directory and inspect operational badges", async ({ page }) => {
    await loginAndOpen(page, "admin", "/society/residents");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("residents_export.csv");

    const residentTable = page.locator("table");
    await expect(residentTable).toBeVisible();

    const firstResidentRow = page.locator("tbody tr").first();
    await expect(firstResidentRow).toBeVisible();
    await expect(firstResidentRow.getByText(/auth linked|no login/i)).toBeVisible();
    await expect(firstResidentRow.getByText(/flat linked|flat missing/i)).toBeVisible();
    await expect(firstResidentRow.getByText(/push token|no push token/i)).toBeVisible();
    await expect(firstResidentRow.getByText(/unread alerts/i)).toBeVisible();
    await expect(firstResidentRow.getByText(/pending visitors/i)).toBeVisible();
  });

  test("guard visitor entry flows through resident approval and society pass issuance", async ({ page, browser }) => {
    const visitorName = `Demo Visitor ${token("visitor")}`;
    const flatSearch = readFeatureFixtureState().slugs.residentFlatSearch;

    const guardContext = await browser.newContext();
    const residentContext = await browser.newContext();
    const societyContext = await browser.newContext();

    const guardPage = await guardContext.newPage();
    const residentPage = await residentContext.newPage();
    const societyPage = await societyContext.newPage();

    try {
      await loginAndOpen(guardPage, "security_guard", "/guard");

      await guardPage.getByRole("button", { name: /register new visitor/i }).click();
      const registerDialog = guardPage.getByRole("dialog", { name: /register visitor/i });
      await expect(registerDialog).toBeVisible();
      await registerDialog.locator('input[type="file"]').setInputFiles(visitorPhotoPath);
      await registerDialog.getByLabel(/visitor full name/i).fill(visitorName);
      await registerDialog.getByLabel(/phone number/i).fill("9999999999");
      await registerDialog.getByRole("button", { name: /next: select destination/i }).click();
      await registerDialog.getByPlaceholder(/search flat number/i).fill(flatSearch);
      await registerDialog.getByRole("button", { name: /^search$/i }).click();
      await registerDialog.getByRole("button", { name: /wing a - 101/i }).click();
      const submitVisitorButton = registerDialog.getByRole("button", {
        name: /verify & send alert|instant check-in/i,
      });
      await expect(submitVisitorButton).toBeEnabled({ timeout: 15_000 });
      await submitVisitorButton.click();
      await expect(registerDialog).toHaveCount(0, { timeout: 20_000 });

      const createdVisitor = await waitForVisitorCreated(visitorName);

      expect(createdVisitor.approved_by_resident).toBeNull();
      expect(createdVisitor.resident_id).toBeTruthy();

      await loginAndOpen(residentPage, "resident", "/resident");
      const approvalCard = residentPage
        .getByRole("heading", { name: visitorName })
        .locator('xpath=ancestor::div[contains(@class,"shadow-premium")][1]');
      await expect(approvalCard).toBeVisible({ timeout: 20_000 });
      await approvalCard.getByRole("button", { name: /^confirm entry$/i }).click();

      await pollVisitorById(
        createdVisitor.id,
        "approved_by_resident, rejection_reason",
        (row) => row.approved_by_resident === true && row.rejection_reason === null,
      );

      await loginAndOpen(societyPage, "society_manager", "/society/visitors");
      await societyPage.getByPlaceholder(/search visitors by name or phone/i).fill(visitorName);
      await societyPage.getByRole("button", { name: /^search$/i }).click();

      const row = visitorRow(societyPage, visitorName);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row.getByText(/^approved(?: • pass .+)?$/i)).toBeVisible();

      const issuePassResponse = societyPage.waitForResponse((response) =>
        response.url().includes(`/api/society/visitors/${createdVisitor.id}`) && response.request().method() === "PATCH",
      );
      await row.getByRole("button", { name: /issue pass/i }).click();
      const response = await issuePassResponse;
      expect(response.ok()).toBeTruthy();

      await pollVisitorById(
        createdVisitor.id,
        "visitor_pass_number, approved_by_resident",
        (record) =>
          typeof record.visitor_pass_number === "string" &&
          record.visitor_pass_number.length > 0 &&
          record.approved_by_resident === true,
      );

      await expect(row.getByText(/^approved(?: • pass .+)?$/i)).toBeVisible({ timeout: 20_000 });
    } finally {
      await Promise.all([guardContext.close(), residentContext.close(), societyContext.close()]);
    }
  });

  test("security supervisor can resolve a panic alert from the response center", async ({ page }) => {
    const alertId = await insertPanicAlert();

    await loginAndOpen(page, "security_supervisor", "/society/panic-alerts");

    const alertCard = page.locator(".shadow-premium").filter({ hasText: alertId.slice(0, 8) }).first();
    await expect(alertCard).toBeVisible({ timeout: 20_000 });
    await alertCard.getByRole("button", { name: /resolve incident/i }).click();

    const resolveDialog = page.getByRole("dialog", { name: /resolve incident/i });
    await expect(resolveDialog).toBeVisible();
    await resolveDialog.locator("textarea").fill("Resolved during demo pack validation.");
    await resolveDialog.getByRole("button", { name: /mark as resolved/i }).click();
    await expect(resolveDialog).toBeHidden({ timeout: 20_000 });

    await waitForPanicResolution(alertId);
  });
});

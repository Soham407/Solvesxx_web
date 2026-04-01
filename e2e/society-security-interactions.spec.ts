import { test, expect, type Page } from "@playwright/test";
import crypto from "node:crypto";
import path from "node:path";

import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";
import { loginAsRole } from "./helpers/auth";

const visitorPhotoPath = path.join(process.cwd(), "e2e", "fixtures", "visitor-photo.svg");

type FixtureIds = ReturnType<typeof readFeatureFixtureState>["ids"];

function ids(): FixtureIds {
  return readFeatureFixtureState().ids;
}

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function insertVisitor(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<{ id: string; visitor_name: string }> {
  const client = createServiceRoleClient();
  const fixtureIds = ids();
  const visitorName =
    typeof overrides.visitor_name === "string"
      ? overrides.visitor_name
      : `UI Visitor ${token("society")}`;

  const payload = {
    id: crypto.randomUUID(),
    visitor_name: visitorName,
    visitor_type: "guest",
    phone: "9876543210",
    purpose: "Interaction test",
    flat_id: fixtureIds.flatId,
    resident_id: fixtureIds.residentId,
    entry_guard_id: fixtureIds.guardRecordId,
    entry_location_id: fixtureIds.locationId,
    entry_time: new Date().toISOString(),
    approved_by_resident: null,
    is_frequent_visitor: false,
    ...overrides,
  };

  const { data, error } = await client.from("visitors").insert(payload).select("id, visitor_name").single();
  if (error) {
    throw error;
  }

  return data as { id: string; visitor_name: string };
}

async function insertPanicAlert() {
  const client = createServiceRoleClient();
  const fixtureIds = ids();

  const { data, error } = await client
    .from("panic_alerts")
    .insert({
      id: crypto.randomUUID(),
      guard_id: fixtureIds.guardRecordId,
      location_id: fixtureIds.locationId,
      alert_type: "panic",
      latitude: 18.5194,
      longitude: 73.8519,
      alert_time: new Date().toISOString(),
      description: `Interaction alert ${token("panic")}`,
      is_resolved: false,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function waitForVisitorField(
  visitorId: string,
  selector: string,
  predicate: (value: any) => boolean,
  timeout = 20_000,
) {
  const client = createServiceRoleClient();
  await expect
    .poll(async () => {
      const { data, error } = await client.from("visitors").select(selector).eq("id", visitorId).single();
      if (error) {
        throw error;
      }

      const key = selector.split(",")[0].trim();
      return { ok: predicate((data as unknown as Record<string, unknown>)[key]), value: (data as unknown as Record<string, unknown>)[key] };
    }, { timeout })
    .toMatchObject({ ok: true });
}

async function waitForPanicAlertResolved(alertId: string, timeout = 20_000) {
  const client = createServiceRoleClient();
  await expect
    .poll(async () => {
      const { data, error } = await client
        .from("panic_alerts")
        .select("is_resolved, resolution_notes, resolved_by")
        .eq("id", alertId)
        .single();

      if (error) {
        throw error;
      }

      return {
        is_resolved: data.is_resolved,
        has_resolved_by:
          typeof data.resolved_by === "string" && data.resolved_by.length > 0,
      };
    }, { timeout })
    .toMatchObject({ is_resolved: true, has_resolved_by: true });
}

async function waitForResidentExists(fullName: string, timeout = 20_000) {
  const client = createServiceRoleClient();
  await expect
    .poll(async () => {
      const { count, error } = await client
        .from("residents")
        .select("*", { count: "exact", head: true })
        .eq("full_name", fullName);
      if (error) {
        throw error;
      }
      return count ?? 0;
    }, { timeout })
    .toBeGreaterThan(0);
}

async function waitForServiceRequestTitle(title: string, timeout = 20_000) {
  const client = createServiceRoleClient();
  await expect
    .poll(
      async () => {
        const { count, error } = await client
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("title", title);

        if (error) {
          return { count: 0, ok: false };
        }

        return { count: count ?? 0, ok: true };
      },
      { timeout },
    )
    .toMatchObject({ ok: true });

  await expect
    .poll(
      async () => {
        const { count } = await client
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("title", title);
        return count ?? 0;
      },
      { timeout },
    )
    .toBeGreaterThan(0);
}

async function loginAndOpen(page: Page, role: Parameters<typeof loginAsRole>[1], route: string) {
  await loginAsRole(page, role);
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
}

function visitorRow(page: Page, visitorName: string) {
  return page.locator("tr").filter({ hasText: visitorName }).first();
}

function residentApprovalCard(page: Page, visitorName: string) {
  return page
    .getByRole("heading", { name: visitorName })
    .locator('xpath=ancestor::div[contains(@class,"shadow-premium")][1]');
}

async function openRowMenu(row: ReturnType<typeof visitorRow>) {
  await row.locator("button").last().click();
}

test.describe("Society Security Interaction Pack", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("guard station quick actions and resident lookup work", async ({ page }) => {
    await loginAndOpen(page, "security_guard", "/guard");

    await expect(page.getByRole("button", { name: /register new visitor/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sos .*hold 3s to trigger/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /open shift console/i })).toBeVisible();

    await page.getByRole("link", { name: /daily checklist/i }).click();
    await expect(page).toHaveURL(/\/society\/checklists$/);

    await page.goto("/guard");
    await page.getByRole("link", { name: "Emergency Quick Dial" }).click();
    await expect(page).toHaveURL(/\/society\/emergency$/);

    await page.goto("/guard");
    await page.getByRole("button", { name: /register new visitor/i }).click();
    await expect(page.getByRole("dialog", { name: /register visitor/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /register visitor/i })).toHaveCount(0);

    await page.getByPlaceholder(/search by name or flat number/i).fill(
      readFeatureFixtureState().slugs.residentFlatSearch,
    );
    await expect(page.getByRole("button", { name: /log visitor entry/i }).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /log visitor entry/i }).first().click();
    await expect(page.getByRole("dialog", { name: /register visitor/i })).toBeVisible();
  });

  test("guard can register a visitor from the guard station dialog", async ({ page }) => {
    const visitorName = `Guard Flow ${token("visitor")}`;

    await loginAndOpen(page, "security_guard", "/guard");

    await page.getByRole("button", { name: /register new visitor/i }).click();
    await page.locator('input[type="file"]').setInputFiles(visitorPhotoPath);
    await page.getByLabel(/visitor full name/i).fill(visitorName);
    await page.getByLabel(/phone number/i).fill("9999999999");
    await page.getByRole("button", { name: /next: select destination/i }).click();
    await page.getByPlaceholder(/search flat number/i).fill(readFeatureFixtureState().slugs.residentFlatSearch);
    await page.getByRole("button", { name: /^search$/i }).click();
    await page.getByText(new RegExp(readFeatureFixtureState().slugs.residentFlatSearch, "i")).first().click();
    await page.getByRole("button", { name: /verify & send alert|instant check-in/i }).click();

    await expect(page.getByRole("dialog", { name: /register visitor/i })).toHaveCount(0, { timeout: 20_000 });

    const client = createServiceRoleClient();
    await expect
      .poll(async () => {
        const { data, error } = await client
          .from("visitors")
          .select("id")
          .eq("visitor_name", visitorName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return data?.id ?? null;
      })
      .not.toBeNull();
  });

  test("guard station can log visitor exit from the active visitor panel", async ({ page }) => {
    const activeVisitor = await insertVisitor({
      visitor_name: `Guard Exit ${token("visitor")}`,
      approved_by_resident: true,
      exit_time: null,
    });

    await loginAndOpen(page, "security_guard", "/guard");

    await expect(page.getByText(activeVisitor.visitor_name).first()).toBeVisible({ timeout: 20_000 });
    await page.getByLabel(`Log Exit for ${activeVisitor.visitor_name}`).click();
    await waitForVisitorField(
      activeVisitor.id,
      "exit_time",
      (value) => typeof value === "string" && value.length > 0,
      30_000,
    );
  });

  test("resident quick actions support invite, notifications, and complaints", async ({ page }) => {
    const inviteName = `Resident Invite ${token("resident")}`;
    const complaintTitle = `Complaint ${token("issue")}`;

    await loginAndOpen(page, "resident", "/resident");

    await page.getByText("Invite Visitor").first().click();
    const inviteDialog = page.getByRole("dialog", { name: /invite a visitor/i });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.locator("#visitor_name").fill(inviteName);
    await inviteDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: /guest/i }).click();
    await inviteDialog.locator("#phone").fill("9000000001");
    await inviteDialog.locator("#purpose").fill("Dinner");
    await inviteDialog.getByRole("button", { name: /send invite/i }).click();
    await expect(page.getByRole("dialog", { name: /invite a visitor/i })).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(inviteName).first()).toBeVisible({ timeout: 20_000 });

    await page.getByText("Notifications").first().click();
    await expect(page.getByRole("dialog", { name: /notifications/i })).toBeVisible();
    const markAllRead = page.getByRole("button", { name: /mark all read/i });
    if (await markAllRead.isVisible().catch(() => false)) {
      await markAllRead.click();
    }
    await page.keyboard.press("Escape");

    await page.getByText("Raise Complaint").first().click();
    const complaintDialog = page.getByRole("dialog", { name: /raise a complaint/i });
    await expect(complaintDialog).toBeVisible();
    await complaintDialog.locator("#complaint_title").fill(complaintTitle);
    await complaintDialog.locator("#complaint_desc").fill("Water seepage near the lobby wall.");
    await complaintDialog.getByRole("button", { name: /submit complaint/i }).click();
    await expect(page.getByRole("dialog", { name: /raise a complaint/i })).toHaveCount(0, { timeout: 20_000 });
    await waitForServiceRequestTitle(complaintTitle, 20_000);
  });

  test("resident can approve and deny pending visitor cards", async ({ page }) => {
    const approvedVisitor = await insertVisitor({ approved_by_resident: null, visitor_name: `Approve ${token("visitor")}` });
    const deniedVisitor = await insertVisitor({ approved_by_resident: null, visitor_name: `Deny ${token("visitor")}` });

    await loginAndOpen(page, "resident", "/resident");

    const approveCard = residentApprovalCard(page, approvedVisitor.visitor_name);
    await expect(approveCard).toBeVisible({ timeout: 20_000 });
    await approveCard.getByRole("button", { name: /^confirm entry$/i }).click();
    await waitForVisitorField(approvedVisitor.id, "approved_by_resident", (value) => value === true);

    const denyCard = residentApprovalCard(page, deniedVisitor.visitor_name);
    await expect(denyCard).toBeVisible({ timeout: 20_000 });
    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("prompt");
      void dialog.accept("Denied in interaction pack");
    });
    await denyCard.getByRole("button", { name: /^deny$/i }).click();
    await expect
      .poll(async () => {
        const client = createServiceRoleClient();
        const { data, error } = await client
          .from("visitors")
          .select("approved_by_resident, rejection_reason")
          .eq("id", deniedVisitor.id)
          .single();
        if (error) {
          throw error;
        }
        return data;
      })
      .toMatchObject({
        approved_by_resident: false,
        rejection_reason: "Denied in interaction pack",
      });
  });

  test("society visitors tabs and row-level actions work", async ({ page }) => {
    const issuePassVisitor = await insertVisitor({
      visitor_name: `Issue Pass ${token("visitor")}`,
      approved_by_resident: true,
      visitor_pass_number: null,
    });
    const outVisitor = await insertVisitor({
      visitor_name: `Check Out ${token("visitor")}`,
      approved_by_resident: true,
      visitor_pass_number: null,
    });
    await loginAndOpen(page, "society_manager", "/society/visitors");

    await page.getByRole("button", { name: /quick entry/i }).click();
    await expect(page.getByRole("dialog", { name: /register visitor/i })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByPlaceholder(/search visitors by name or phone/i).fill(issuePassVisitor.visitor_name);
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(visitorRow(page, issuePassVisitor.visitor_name)).toBeVisible({ timeout: 20_000 });

    await visitorRow(page, issuePassVisitor.visitor_name).getByRole("button", { name: /issue pass/i }).click();
    await waitForVisitorField(
      issuePassVisitor.id,
      "visitor_pass_number",
      (value) => typeof value === "string" && value.length > 0,
      30_000,
    );

    const passRow = visitorRow(page, issuePassVisitor.visitor_name);
    await openRowMenu(passRow);
    await page.getByRole("menuitem", { name: /print pass/i }).click();
    await expect(page.getByText(/visitor pass preview/i)).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).last().click();

    await openRowMenu(passRow);
    await page.getByRole("menuitem", { name: /add to daily helpers|remove from daily helpers/i }).click();
    await waitForVisitorField(issuePassVisitor.id, "is_frequent_visitor", (value) => value === true, 20_000);

    await page.getByRole("tab", { name: /daily helpers/i }).click();
    await expect(page.getByText(issuePassVisitor.visitor_name).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: /in the building/i }).click();
    await page.getByPlaceholder(/search visitors by name or phone/i).fill(outVisitor.visitor_name);
    await page.getByRole("button", { name: /^search$/i }).click();
    const checkOutRow = visitorRow(page, outVisitor.visitor_name);
    await expect(checkOutRow).toBeVisible({ timeout: 20_000 });
    await checkOutRow.getByRole("button", { name: /\bout\b/i }).click();
    await waitForVisitorField(outVisitor.id, "exit_time", (value) => typeof value === "string" && value.length > 0);

    await page.getByRole("tab", { name: /family directory/i }).click();
    await expect(page.getByText(/society resident directory/i)).toBeVisible();
  });

  test("panic alerts page filters and resolve action work", async ({ page }) => {
    const alertId = await insertPanicAlert();

    await loginAndOpen(page, "society_manager", "/society/panic-alerts");

    const comboboxes = page.getByRole("combobox");
    await comboboxes.nth(0).click();
    await page.getByRole("option", { name: /active only/i }).click();
    await comboboxes.nth(1).click();
    await page.getByRole("option", { name: /panic\/sos/i }).click();
    await page.getByRole("button", { name: /refresh/i }).click();

    await expect(page.getByRole("button", { name: /resolve incident/i }).first()).toBeVisible({ timeout: 20_000 });
    const alertCard = page.locator('.shadow-premium').filter({ hasText: alertId.slice(0, 8) }).first();
    await expect(alertCard).toBeVisible({ timeout: 20_000 });
    await alertCard.getByRole("button", { name: /resolve incident/i }).click();
    const resolveDialog = page.getByRole("dialog", { name: /resolve incident/i });
    await expect(resolveDialog).toBeVisible();
    await resolveDialog.locator("textarea").fill("Resolved by interaction pack");
    await resolveDialog.getByRole("button", { name: /mark as resolved/i }).click();

    await waitForPanicAlertResolved(alertId, 30_000);
  });

  test("checklists page toolbar and row menus are interactive", async ({ page }) => {
    await loginAndOpen(page, "society_manager", "/society/checklists");

    await page.getByRole("button", { name: /refresh/i }).click();
    await expect(page.locator("table")).toBeVisible({ timeout: 20_000 });

    const firstDataRow = page.locator("tbody tr").first();
    await expect(firstDataRow).toBeVisible();

    await firstDataRow.locator("button").last().click();
    await expect(page.getByRole("menuitem", { name: /view guard notes/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /reschedule task/i })).toBeVisible();
    await page.getByRole("menuitem", { name: /reschedule task/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("table")).toBeVisible({ timeout: 5_000 });
  });

  test("emergency directory supports add, call, and delete contact actions", async ({ page }) => {
    const contactName = `Interaction Contact ${token("contact")}`;

    await loginAndOpen(page, "society_manager", "/society/emergency");

    await page.getByRole("button", { name: /add emergency contact/i }).click();
    await expect(page.getByRole("dialog", { name: /add new emergency contact/i })).toBeVisible();
    await page.getByLabel(/^name$/i).fill(contactName);
    const addContactDialog = page.getByRole("dialog", { name: /add new emergency contact/i });
    await addContactDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: /other/i }).click();
    await addContactDialog.getByLabel(/^phone number$/i).fill("+91 9090909090");
    await addContactDialog.getByLabel(/description/i).fill("Created by interaction pack");
    await addContactDialog.getByRole("button", { name: /save contact/i }).click();

    const row = page.locator("tr").filter({ hasText: contactName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByRole("link", { name: /call now/i })).toHaveAttribute("href", /tel:/);

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });
    await row.getByRole("button").click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });
  });

  // KNOWN BUG: society_manager lacks INSERT permission on residents table — RLS returns Forbidden.
  // The Register button is visible in the UI but the write is rejected. Tracked as product_bug.
  test.fixme("residents directory supports csv export and registration dialog", async ({ page }) => {
    const residentName = `Family Member ${token("resident")}`;

    await loginAndOpen(page, "society_manager", "/society/residents");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("residents_export.csv");

    await page.getByRole("button", { name: /register family/i }).click();
    const registerDialog = page.getByRole("dialog", { name: /register family \/ resident/i });
    await expect(registerDialog).toBeVisible();
    await registerDialog.locator("#name").fill(residentName);
    await registerDialog.locator("#phone").fill("8080808080");
    await registerDialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option").filter({ hasText: /flat/i }).first().click();
    await registerDialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /family member/i }).click();
    await registerDialog.getByRole("button", { name: /^register$/i }).click();

    await waitForResidentExists(residentName, 30_000);
    await expect(page.getByText(residentName).first()).toBeVisible({ timeout: 20_000 });
  });

  test("security supervisor dashboard buttons are present and safe to click", async ({ page }) => {
    await loginAndOpen(page, "security_supervisor", "/dashboard");

    await expect(page.getByRole("button", { name: /personnel audit/i })).toBeVisible();
    await page.getByRole("button", { name: /personnel audit/i }).click();
    await page.getByRole("button", { name: /check late comers/i }).click();
    await page.getByRole("button", { name: /view shift roster/i }).click();

    await expect(page.getByText(/security operations control/i)).toBeVisible();
  });

  test("society manager dashboard sync and misconduct navigation work", async ({ page }) => {
    await loginAndOpen(page, "society_manager", "/dashboard");

    await page.getByRole("button", { name: /sync now/i }).click();
    await expect(page.getByRole("heading", { name: /society management hub/i })).toBeVisible();

    await page.getByRole("button", { name: /view misconduct logs/i }).click();
    await expect(page).toHaveURL(/\/tickets\/behavior$/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("resident my-flat page renders the resident portal", async ({ page }) => {
    await loginAndOpen(page, "resident", "/society/my-flat");

    await expect(page.getByRole("heading", { name: /resident portal/i })).toBeVisible();
    await expect(page.getByText(/manage your flat/i).first()).toBeVisible();
  });

  test("security supervisor can resolve a panic alert", async ({ page }) => {
    const alertId = await insertPanicAlert();

    await loginAndOpen(page, "security_supervisor", "/society/panic-alerts");

    const alertCard = page.locator('.shadow-premium').filter({ hasText: alertId.slice(0, 8) }).first();
    await expect(alertCard).toBeVisible({ timeout: 20_000 });
    await alertCard.getByRole("button", { name: /resolve incident/i }).click();
    const resolveDialog = page.getByRole("dialog", { name: /resolve incident/i });
    await expect(resolveDialog).toBeVisible();
    await resolveDialog.locator("textarea").fill("Resolved by supervisor in interaction pack");
    await resolveDialog.getByRole("button", { name: /mark as resolved/i }).click();

    await waitForPanicAlertResolved(alertId, 30_000);
  });

  test("society visitors phone search locates visitor by phone number", async ({ page }) => {
    const phoneVisitor = await insertVisitor({
      visitor_name: `Phone Search ${token("visitor")}`,
      phone: "7777777777",
      approved_by_resident: true,
    });

    await loginAndOpen(page, "society_manager", "/society/visitors");

    await page.getByPlaceholder(/search visitors by name or phone/i).fill("7777777777");
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(visitorRow(page, phoneVisitor.visitor_name)).toBeVisible({ timeout: 20_000 });
  });

  test("vendors and contractors tab shows visitors of vendor type", async ({ page }) => {
    const vendorVisitor = await insertVisitor({
      visitor_name: `Vendor Visit ${token("visitor")}`,
      visitor_type: "vendor",
      approved_by_resident: true,
    });

    await loginAndOpen(page, "society_manager", "/society/visitors");

    await page.getByRole("tab", { name: /vendors.*contractors/i }).click();
    await expect(visitorRow(page, vendorVisitor.visitor_name)).toBeVisible({ timeout: 20_000 });
  });
});

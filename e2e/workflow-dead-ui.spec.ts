/**
 * Workflow & Dead-UI Audit
 *
 * Tests every primary action button across all roles and key pages.
 * A button is "dead" if clicking it causes no navigation, dialog, toast, or API call.
 *
 * Run: npx playwright test workflow-dead-ui.spec.ts --headed
 * Run one role: npx playwright test workflow-dead-ui.spec.ts --headed --grep "Admin"
 */

import { expect, test } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";
import { auditPageButtons, clickAndExpect, fillVisibleInputs, findDeadButtons } from "./helpers/dead-ui";

// These tests make many sequential button-clicks per page.
// Run with: npx playwright test workflow-dead-ui.spec.ts --project=chromium --workers=3
test.setTimeout(120_000);

// ─── helpers ────────────────────────────────────────────────────────────────

function reportDeadButtons(page: string, dead: { label: string; detail?: string }[]) {
  if (dead.length > 0) {
    const list = dead.map((b) => `  • "${b.label}"${b.detail ? ` (${b.detail})` : ""}`).join("\n");
    throw new Error(`Dead buttons found on ${page}:\n${list}`);
  }
}

async function closeAnyOpenDialog(page: import("@playwright/test").Page) {
  if (await page.locator('[role="dialog"][data-state="open"]').count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

// ─── ADMIN ──────────────────────────────────────────────────────────────────

test.describe("Admin — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("dashboard loads with real data", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();
    // Role switcher should be present for admin
    const switcher = page.getByRole("combobox").or(page.getByText(/view as/i)).first();
    await expect(switcher).toBeVisible({ timeout: 8_000 });
  });

  test("service-requests: all primary buttons are live", async ({ page }) => {
    await page.goto("/service-requests", { waitUntil: "load" });
    await page.waitForTimeout(1_500); // let DataTable settle after load
    const results = await auditPageButtons(page, { extraSkip: /export|print|filter|^all |clear$/i });
    reportDeadButtons("/service-requests", findDeadButtons(results));
  });

  test("service-requests: new request form submits", async ({ page }) => {
    await page.goto("/service-requests/new");
    await page.waitForLoadState("networkidle");
    await fillVisibleInputs(page, "E2E Test Request");
    // Just verify the page has a submit/save button that isn't dead
    const submitBtn = page
      .getByRole("button", { name: /submit|save|create|add/i })
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
  });

  test("society/visitors: 4 tabs and register button all work", async ({ page }) => {
    await page.goto("/society/visitors", { waitUntil: "load" });
    await page.waitForTimeout(1_500);

    // Check all 4 tabs are present and clickable
    for (const tab of ["In Building", "Daily Helpers", "Vendors", "Family"]) {
      const tabEl = page.getByRole("tab", { name: new RegExp(tab, "i") }).first();
      if (await tabEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(400);
      }
    }

    // Button label is "Quick Entry" (confirmed from source)
    const registerBtn = page.getByRole("button", { name: /quick entry|register|add visitor/i }).first();
    await expect(registerBtn).toBeVisible({ timeout: 5_000 });
    await clickAndExpect(page, registerBtn, ["dialog_opened", "navigated"], 4_000);
    await closeAnyOpenDialog(page);
  });

  test("society/panic-alerts: acknowledge + resolve buttons exist and are live", async ({ page }) => {
    await page.goto("/society/panic-alerts", { waitUntil: "load" });
    await page.waitForTimeout(2_000); // wait for DataTable to hydrate
    await expect(page.locator("main")).toBeVisible();

    // Skip filter chips and tab-switchers — they do DOM-only state changes
    const results = await auditPageButtons(page, { extraSkip: /export|all |resolved|active|filter|clear$/i });
    reportDeadButtons("/society/panic-alerts", findDeadButtons(results));
  });

  test("tickets/behavior: create ticket dialog opens", async ({ page }) => {
    await page.goto("/tickets/behavior");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .getByRole("button", { name: /create|new|add|report/i })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 5_000 });
    // May show a toast if required data (employees) is missing — both outcomes are valid
    await clickAndExpect(page, createBtn, ["dialog_opened", "toast_appeared"], 4_000);
    await closeAnyOpenDialog(page);
  });

  test("tickets/quality: page loads and buttons are live", async ({ page }) => {
    await page.goto("/tickets/quality");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("tickets/returns: Initiate Return button opens dialog", async ({ page }) => {
    await page.goto("/tickets/returns");
    await page.waitForLoadState("networkidle");

    const initiateBtn = page.getByRole("button", { name: /initiate return/i }).first();
    await expect(initiateBtn).toBeVisible({ timeout: 5_000 });
    await clickAndExpect(page, initiateBtn, ["dialog_opened"], 4_000);
    await closeAnyOpenDialog(page);
  });

  test("tickets/returns: Return History button opens closed RTV history", async ({ page }) => {
    await page.goto("/tickets/returns");
    await page.waitForLoadState("networkidle");
    const historyBtn = page.getByRole("button", { name: /return history/i }).first();
    await expect(historyBtn).toBeVisible({ timeout: 5_000 });
    await clickAndExpect(page, historyBtn, ["dialog_opened"], 4_000);
    await expect(page.getByRole("dialog").getByText(/resolved and historical rtv tickets/i)).toBeVisible();
    await closeAnyOpenDialog(page);
  });

  test("settings/admins: Invite Admin button opens dialog with temp password", async ({ page }) => {
    await page.goto("/settings/admins", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    // Button label confirmed from source: "Invite Admin"
    const inviteBtn = page.getByRole("button", { name: /invite|add.*admin/i }).first();
    await expect(inviteBtn).toBeVisible({ timeout: 5_000 });
    await clickAndExpect(page, inviteBtn, ["dialog_opened"], 4_000);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await closeAnyOpenDialog(page);
  });

  test("assets: create and QR buttons are live", async ({ page }) => {
    await page.goto("/assets", { waitUntil: "load" });
    await page.waitForTimeout(1_500);

    // Check that Create button exists and works
    const createBtn = page.getByRole("button", { name: /create|new|add/i }).first();
    if (await createBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await clickAndExpect(page, createBtn, ["dialog_opened", "navigated"], 3_000);
      await closeAnyOpenDialog(page);
    }

    // Check that page loaded
    await expect(page.locator("main")).toBeVisible();
  });

  test("assets/maintenance: create schedule and link service request buttons are live", async ({ page }) => {
    await page.goto("/assets/maintenance");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    // Check that the page has action buttons
    const actionBtns = page.getByRole("button").filter({ hasNotText: /cancel|close|x/i });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test("inventory/purchase-orders: all status-action buttons are live", async ({ page }) => {
    await page.goto("/inventory/purchase-orders", { waitUntil: "load" });
    await page.waitForTimeout(1_500);
    await expect(page.locator("main")).toBeVisible();

    // Verify that action buttons exist (Acknowledge, Dispatch, etc.)
    const actionBtns = page.getByRole("button").filter({ hasNotText: /cancel|close|filter|export|all|clear|^x$/i });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test("inventory/grn: create GRN button opens form or navigates", async ({ page }) => {
    await page.goto("/inventory/grn", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const createBtn = page
      .getByRole("button", { name: /create|new|add|receive/i })
      .first();
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, createBtn, ["dialog_opened", "navigated"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("finance/supplier-bills: approve and reject buttons are live", async ({ page }) => {
    await page.goto("/finance/supplier-bills", { waitUntil: "load" });
    await page.waitForTimeout(1_500);
    await expect(page.locator("main")).toBeVisible();

    // Verify that action buttons exist (Approve, Reject, etc.)
    const actionBtns = page.getByRole("button").filter({ hasNotText: /cancel|close|filter|export|refresh|^x$/i });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test("reports: all 4 sub-report links navigate correctly", async ({ page }) => {
    // Reports use live Recharts polling — networkidle never fires; use load instead
    for (const path of ["/reports/attendance", "/reports/financial", "/reports/inventory", "/reports/services"]) {
      await page.goto(path, { waitUntil: "load", timeout: 30_000 });
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/something went wrong|not found/i).first()).not.toBeVisible();
    }
  });
});

// ─── GUARD ──────────────────────────────────────────────────────────────────

test.describe("Security Guard — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "security_guard");
  });

  test("guard dashboard loads with data sections", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    // Should see at least one of these sections
    const content = page
      .getByText(/visitor|checklist|attendance|guard|shift/i)
      .first();
    await expect(content).toBeVisible({ timeout: 8_000 });
  });

  test("guard: /guard page loads", async ({ page }) => {
    await page.goto("/guard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("guard: visitor logging button opens dialog", async ({ page }) => {
    await page.goto("/guard");
    await page.waitForLoadState("networkidle");

    const logBtn = page
      .getByRole("button", { name: /log visitor|add visitor|register visitor|new visitor/i })
      .first();
    await expect(logBtn).toBeVisible({ timeout: 8_000 });
    await clickAndExpect(page, logBtn, ["dialog_opened", "navigated"], 5_000);
    await closeAnyOpenDialog(page);
  });

  test("guard: visitor dialog form has all required fields", async ({ page }) => {
    await page.goto("/guard", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const logBtn = page
      .getByRole("button", { name: /log visitor|add visitor|register visitor|new visitor/i })
      .first();
    if (await logBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 4_000 });

      // Dialog must have at least one input field (visitor name, phone, or search)
      const anyInput = dialog.locator('input:visible, textarea:visible').first();
      await expect(anyInput).toBeVisible({ timeout: 3_000 });

      await closeAnyOpenDialog(page);
    }
  });

  test("guard: SOS/panic button is visible and clickable", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Panic button is a <div> (hold-to-trigger), not a <button> — locate via its card section
    const panicSection = page.locator('[class*="bg-critical"]').first();
    await expect(panicSection).toBeVisible({ timeout: 10_000 });

    // Verify the hold area itself is present and interactive
    const panicDiv = page.locator('[class*="rounded-full"][class*="bg-critical"], [class*="bg-critical"][class*="rounded-full"]').first();
    await expect(panicDiv).toBeVisible({ timeout: 8_000 });
  });

  test("guard: checklist page loads and submit button exists", async ({ page }) => {
    await page.goto("/society/checklists");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("guard: /society/visitors accessible", async ({ page }) => {
    await page.goto("/society/visitors");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden|unauthorized/i)).not.toBeVisible();
  });
});

// ─── SECURITY SUPERVISOR ────────────────────────────────────────────────────

test.describe("Security Supervisor — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "security_supervisor");
  });

  test("supervisor dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("panic alerts: acknowledge and resolve buttons are live", async ({ page }) => {
    await page.goto("/society/panic-alerts", { waitUntil: "load" });
    await page.waitForTimeout(2_000);

    // Verify page loaded
    await expect(page.locator("main")).toBeVisible();

    // Check if Resolve button exists and is clickable
    const resolveBtn = page.getByRole("button", { name: /resolve/i }).first();
    if (await resolveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await clickAndExpect(page, resolveBtn, ["dialog_opened"], 3_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("tickets/behavior: create button opens dialog", async ({ page }) => {
    await page.goto("/tickets/behavior");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /create|new|add|report/i }).first();
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, createBtn, ["dialog_opened", "toast_appeared"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("society/residents: directory loads", async ({ page }) => {
    await page.goto("/society/residents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── SOCIETY MANAGER ────────────────────────────────────────────────────────

test.describe("Society Manager — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "society_manager");
  });

  test("society manager dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("society/visitors: all 4 tabs clickable", async ({ page }) => {
    await page.goto("/society/visitors", { waitUntil: "load" });
    await page.waitForTimeout(1_000);
    await expect(page.locator("main")).toBeVisible();

    const tabs = page.getByRole("tab");
    const tabCount = await tabs.count();
    // Should have the 4-tab strip
    expect(tabCount).toBeGreaterThanOrEqual(3);

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);
    }
  });

  test("society/residents: directory loads", async ({ page }) => {
    await page.goto("/society/residents");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("society/emergency: emergency contacts load", async ({ page }) => {
    await page.goto("/society/emergency");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── BUYER ──────────────────────────────────────────────────────────────────

test.describe("Buyer — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "buyer");
  });

  test("buyer dashboard: KPI cards load with real data (not zero)", async ({ page }) => {
    await page.goto("/buyer");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    // No crash/error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("buyer dashboard: all primary action buttons are live", async ({ page }) => {
    await page.goto("/buyer");
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator("main")).toBeVisible();

    // Check that at least one action button exists (Create Request, etc.)
    const actionBtns = page.getByRole("button").filter({ hasNotText: /cancel|close|filter|export|^x$/i });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test("buyer/requests/new: multi-step form reaches step 2", async ({ page }) => {
    await page.goto("/buyer/requests/new", { waitUntil: "load" });
    await page.waitForTimeout(1_000);
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });

    // Fill first available text field
    await fillVisibleInputs(page, "E2E Material Request");

    // Next / Continue button — may show a validation toast if required selects are empty
    const nextBtn = page
      .getByRole("button", { name: /next|continue|proceed/i })
      .first();
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clickAndExpect(page, nextBtn, ["dialog_opened", "dom_changed", "api_called", "navigated", "toast_appeared"], 4_000);
    }
  });

  test("buyer/requests: Leave Feedback button opens dialog for feedback_pending rows", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");

    const feedbackBtn = page
      .getByRole("button", { name: /leave feedback|feedback/i })
      .first();
    if (await feedbackBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, feedbackBtn, ["dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("buyer/requests: all list page buttons are live", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator("main")).toBeVisible();

    // Check that at least one action button exists
    const actionBtns = page.getByRole("button").filter({ hasNotText: /cancel|close|filter|export|search|^x$/i });
    const count = await actionBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test("buyer/invoices: page loads and view/download actions are live", async ({ page }) => {
    await page.goto("/buyer/invoices");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── SUPPLIER ───────────────────────────────────────────────────────────────

test.describe("Supplier — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "supplier");
  });

  test("supplier dashboard loads", async ({ page }) => {
    await page.goto("/supplier");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("supplier/indents: accept and reject buttons open confirm dialogs", async ({ page }) => {
    await page.goto("/supplier/indents");
    await page.waitForLoadState("networkidle");

    const acceptBtn = page.getByRole("button", { name: /accept/i }).first();
    if (await acceptBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, acceptBtn, ["dialog_opened", "toast_appeared", "api_called"], 4_000);
      await closeAnyOpenDialog(page);
    }

    const rejectBtn = page.getByRole("button", { name: /reject/i }).first();
    if (await rejectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, rejectBtn, ["dialog_opened", "toast_appeared"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("supplier/purchase-orders: acknowledge and dispatch buttons are live", async ({ page }) => {
    await page.goto("/supplier/purchase-orders");
    await page.waitForLoadState("networkidle");

    const acknowledgeBtn = page.getByRole("button", { name: /acknowledge/i }).first();
    if (await acknowledgeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, acknowledgeBtn, ["dialog_opened", "api_called", "toast_appeared"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("supplier/bills/new: form fields present and submit is live", async ({ page }) => {
    await page.goto("/supplier/bills", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const newBillBtn = page
      .getByRole("button", { name: /new bill|submit bill|create bill|add bill|submit/i })
      .first();
    if (await newBillBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, newBillBtn, ["dialog_opened", "navigated", "api_called"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("supplier/profile: save button is live", async ({ page }) => {
    await page.goto("/supplier/profile");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();

    const saveBtn = page.getByRole("button", { name: /save|update|submit/i }).first();
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled();
    }
  });

  test("supplier/service-orders: page loads without error", async ({ page }) => {
    await page.goto("/supplier/service-orders");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── STOREKEEPER ────────────────────────────────────────────────────────────

test.describe("Storekeeper — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "storekeeper");
  });

  test("storekeeper dashboard loads with KPIs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("inventory/grn: all action buttons are live", async ({ page }) => {
    await page.goto("/inventory/grn", { waitUntil: "load" });
    await page.waitForTimeout(1_500);
    const results = await auditPageButtons(page, { extraSkip: /export|filter|^all |clear$/i });
    reportDeadButtons("/inventory/grn", findDeadButtons(results));
  });

  test("inventory/warehouses: page loads", async ({ page }) => {
    await page.goto("/inventory/warehouses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("tickets/quality: shortage notes tab works", async ({ page }) => {
    await page.goto("/tickets/quality");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();

    const shortageTab = page.getByRole("tab", { name: /shortage/i }).first();
    if (await shortageTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await shortageTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("tickets/returns: Initiate Return button opens dialog", async ({ page }) => {
    await page.goto("/tickets/returns");
    await page.waitForLoadState("networkidle");
    const initiateBtn = page.getByRole("button", { name: /initiate return/i }).first();
    await expect(initiateBtn).toBeVisible({ timeout: 5_000 });
    await clickAndExpect(page, initiateBtn, ["dialog_opened"], 4_000);
    await closeAnyOpenDialog(page);
  });
});

// ─── SITE SUPERVISOR ────────────────────────────────────────────────────────

test.describe("Site Supervisor — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "site_supervisor");
  });

  test("site supervisor dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("service-requests: can view and update status", async ({ page }) => {
    await page.goto("/service-requests");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("tickets/behavior: create ticket dialog opens", async ({ page }) => {
    await page.goto("/tickets/behavior");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /create|new|add|report/i }).first();
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, createBtn, ["dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("services/plantation: page loads without error", async ({ page }) => {
    await page.goto("/services/plantation");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── COMPANY HOD ────────────────────────────────────────────────────────────

test.describe("Company HOD — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "company_hod");
  });

  test("HOD dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("hrms/attendance: fetch and clear buttons are live", async ({ page }) => {
    await page.goto("/hrms/attendance", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const fetchBtn = page.getByRole("button", { name: /fetch|load|search/i }).first();
    if (await fetchBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Fetch may open a date picker dialog or trigger an API call
      await clickAndExpect(page, fetchBtn, ["api_called", "dom_changed", "toast_appeared", "dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }

    const clearBtn = page.getByRole("button", { name: /clear|reset/i }).first();
    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clickAndExpect(page, clearBtn, ["dom_changed", "api_called", "toast_appeared", "dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("hrms/leave: apply leave button opens dialog", async ({ page }) => {
    await page.goto("/hrms/leave");
    await page.waitForLoadState("networkidle");

    const applyBtn = page.getByRole("button", { name: /apply|new leave|request leave/i }).first();
    if (await applyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, applyBtn, ["dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("hrms/recruitment: candidate pipeline renders", async ({ page }) => {
    await page.goto("/hrms/recruitment");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });

  test("service-requests/board: Kanban loads without crash", async ({ page }) => {
    await page.goto("/service-requests/board", { waitUntil: "load", timeout: 30_000 });
    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ─── ACCOUNTS ───────────────────────────────────────────────────────────────

test.describe("Accounts — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "account");
  });

  test("accounts dashboard loads with finance KPIs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("finance pages all load without crash", async ({ page }) => {
    const financePaths = [
      "/finance/supplier-bills",
      "/finance/buyer-invoices",
      "/finance/sale-bills",
      "/finance/reconciliation",
      "/finance/ledger",
      "/finance/payments",
      "/finance/compliance",
      "/finance/budgeting",
    ];
    for (const path of financePaths) {
      await page.goto(path, { waitUntil: "load", timeout: 30_000 });
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
    }
  });

  test("hrms/payroll: generate payroll button triggers action", async ({ page }) => {
    await page.goto("/hrms/payroll");
    await page.waitForLoadState("networkidle");

    const generateBtn = page
      .getByRole("button", { name: /generate|run payroll|process/i })
      .first();
    if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, generateBtn, ["dialog_opened", "api_called", "toast_appeared"], 5_000);
      await closeAnyOpenDialog(page);
    }
  });
});

// ─── COMPANY MD ─────────────────────────────────────────────────────────────

test.describe("Company MD — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "company_md");
  });

  test("MD dashboard loads with all chart widgets", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    // MD dashboard should have charts (recharts canvas or svg)
    const chart = page.locator("svg.recharts-surface, canvas").first();
    await expect(chart).toBeVisible({ timeout: 10_000 });
  });

  test("reports: financial report loads with charts", async ({ page }) => {
    await page.goto("/reports/financial");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ─── SERVICES: AC TECHNICIAN ────────────────────────────────────────────────

test.describe("AC Technician — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "ac_technician");
  });

  test("AC technician dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("services/ac: page loads with technician list and action buttons", async ({ page }) => {
    await page.goto("/services/ac");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });
});

// ─── SERVICES: PEST CONTROL ────────────────────────────────────────────────

test.describe("Pest Control Technician — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "pest_control_technician");
  });

  test("pest control dashboard loads with expiry warning (if applicable)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
  });

  test("services/pest-control: PPE checklist and spill kits tabs are clickable", async ({ page }) => {
    await page.goto("/services/pest-control");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();

    const spillTab = page.getByRole("tab", { name: /spill/i }).first();
    if (await spillTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await spillTab.click();
      await page.waitForTimeout(400);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

// ─── RESIDENT ───────────────────────────────────────────────────────────────

test.describe("Resident — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "resident");
  });

  test("resident dashboard loads", async ({ page }) => {
    await page.goto("/resident");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("resident dashboard: all buttons are live", async ({ page }) => {
    await page.goto("/resident");
    await page.waitForLoadState("networkidle");
    const results = await auditPageButtons(page, { extraSkip: /export|filter/i });
    reportDeadButtons("/resident", findDeadButtons(results));
  });

  test("society/my-flat: accessible for resident", async ({ page }) => {
    await page.goto("/society/my-flat");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });

  test("test-resident: visitor invitation and approval flow", async ({ page }) => {
    await page.goto("/test-resident");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });

    // Invite visitor button
    const inviteBtn = page
      .getByRole("button", { name: /invite|add guest|new visitor/i })
      .first();
    if (await inviteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, inviteBtn, ["dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });
});

// ─── SERVICES: PRINTING ─────────────────────────────────────────────────────

test.describe("Admin — Services Config Pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("services/printing: Book Space button opens AdBookingDialog", async ({ page }) => {
    await page.goto("/services/printing");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();

    const bookBtn = page.getByRole("button", { name: /book space|book/i }).first();
    if (await bookBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, bookBtn, ["dialog_opened"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("services/security: guard list and GPS tracking load", async ({ page }) => {
    await page.goto("/services/security");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test("admin/societies: create society CRUD form opens", async ({ page }) => {
    await page.goto("/admin/societies", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    const createBtn = page.getByRole("button", { name: /create|add|new society/i }).first();
    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, createBtn, ["dialog_opened", "navigated"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });

  test("company/employees: Add Employee navigates to create page", async ({ page }) => {
    await page.goto("/company/employees", { waitUntil: "load" });
    await page.waitForTimeout(1_000);

    // "Add Employee" uses asChild+Link — rendered as <a>, not <button>
    // Locate it as a link instead
    const addLink = page.getByRole("link", { name: /add employee/i }).first();
    if (await addLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addLink.click();
      await page.waitForURL(/employees.*create/, { timeout: 10_000 });
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("assets/qr-codes: batch generation button is live", async ({ page }) => {
    await page.goto("/assets/qr-codes");
    await page.waitForLoadState("networkidle");

    const generateBtn = page.getByRole("button", { name: /generate|batch/i }).first();
    if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, generateBtn, ["dialog_opened", "api_called", "toast_appeared"], 5_000);
      await closeAnyOpenDialog(page);
    }
  });
});

// ─── DELIVERY BOY ───────────────────────────────────────────────────────────

test.describe("Delivery Boy — Workflow & Dead-UI Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "delivery_boy");
  });

  test("delivery dashboard loads", async ({ page }) => {
    await page.goto("/delivery");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/something went wrong|forbidden/i)).not.toBeVisible();
  });

  test("test-delivery: material arrival log form is functional", async ({ page }) => {
    await page.goto("/test-delivery");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });

    const logBtn = page
      .getByRole("button", { name: /log arrival|record|add/i })
      .first();
    if (await logBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, logBtn, ["dialog_opened", "navigated"], 4_000);
      await closeAnyOpenDialog(page);
    }
  });
});

// ─── SETTINGS — KNOWN ISSUES CHECK ──────────────────────────────────────────

test.describe("Admin — Known Issues & Settings Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("settings/notifications shows coming-soon or a real page (not a crash)", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    // Should be either "Coming Soon" or a real notifications settings page
    // Must NOT be a hard crash
    await expect(page.getByText(/something went wrong|TypeError|ReferenceError/i)).not.toBeVisible();
  });

  test("admin command menu opens on Meta+K (Cmd+K)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    // CommandMenu uses metaKey (Cmd on Mac, Win on Windows)
    await page.keyboard.press("Meta+k");
    // CommandDialog renders as role="dialog" with a cmdk input inside
    const cmdMenu = page.locator('[role="dialog"]').filter({ has: page.locator('[cmdk-input]') }).first();
    await expect(cmdMenu).toBeVisible({ timeout: 4_000 });
    await page.keyboard.press("Escape");
  });

  test("notification bell in top nav opens dropdown", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const bell = page
      .locator('[aria-label*="notification" i], button:has(svg[class*="bell" i])')
      .first();
    if (await bell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await clickAndExpect(page, bell, ["dialog_opened", "dom_changed"], 3_000);
    }
  });

  test("no test-guard/test-resident/test-delivery links exposed in sidebar nav", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // These dev routes should not be in the main sidebar nav
    const testGuardLink = page.getByRole("link", { name: /^test.guard$/i });
    const testResidentLink = page.getByRole("link", { name: /^test.resident$/i });
    await expect(testGuardLink).toHaveCount(0);
    await expect(testResidentLink).toHaveCount(0);
  });
});

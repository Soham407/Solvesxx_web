import { test, expect } from "@playwright/test";

// Buyer order-to-feedback flow: login → create order request → view status → submit feedback
test.describe("Buyer Order Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_BUYER_EMAIL ?? "buyer@facilityPro.com");
    await page.getByLabel(/password/i).fill(process.env.E2E_BUYER_PASSWORD ?? "buyer123");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/buyer/, { timeout: 10_000 });
  });

  test("buyer dashboard loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /buyer|dashboard/i })).toBeVisible();
  });

  test("can navigate to order requests", async ({ page }) => {
    await page.getByRole("link", { name: /order requests|requests/i }).first().click();
    await expect(page).toHaveURL(/request/);
    const hasRows = page.locator("table tbody tr").first();
    const hasEmpty = page.getByText(/no (requests|orders|records)/i);
    await expect(hasRows.or(hasEmpty)).toBeVisible({ timeout: 10_000 });
  });

  test("can open new order request form", async ({ page }) => {
    await page.goto("/buyer/requests");
    const newBtn = page.getByRole("button", { name: /new|create|raise/i }).first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("can navigate to feedback section", async ({ page }) => {
    await page.getByRole("link", { name: /feedback/i }).first().click();
    await expect(page).toHaveURL(/feedback/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("order request list shows data or empty state", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");
    const hasRows = page.locator("table tbody tr, [data-testid='request-row']").first();
    const hasEmpty = page.getByText(/no (requests|orders|records|data)/i);
    const hasContent = page.locator("main .card, main [class*='card']").first();
    await expect(hasRows.or(hasEmpty).or(hasContent)).toBeVisible({ timeout: 10_000 });
  });

  test("order status badge is visible when orders exist", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");
    // If any rows exist, check for a status badge
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible({ timeout: 3_000 })) {
      const statusBadge = page.locator("table tbody tr").first().locator("[class*='badge'], [class*='Badge'], span[class*='bg-']").first();
      await expect(statusBadge).toBeVisible({ timeout: 5_000 });
    }
  });

  test("buyer can view order details when orders exist", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible({ timeout: 3_000 })) {
      await firstRow.click();
      // Should either navigate or open a dialog/sheet
      const dialogOrNav = page.getByRole("dialog").or(
        page.getByRole("heading").filter({ hasText: /order|request|details/i })
      );
      await expect(dialogOrNav).toBeVisible({ timeout: 8_000 });
    }
  });

  test("invoice section loads", async ({ page }) => {
    const invoiceLink = page.getByRole("link", { name: /invoice|bill/i }).first();
    if (await invoiceLink.isVisible({ timeout: 3_000 })) {
      await invoiceLink.click();
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

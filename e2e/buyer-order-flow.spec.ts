import { test, expect } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

// Buyer order flow: login -> requests list -> open create flow -> verify request workspace
test.describe("Buyer Order Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "buyer");
  });

  test("buyer dashboard loads", async ({ page }) => {
    await expect(
      page
        .getByRole("heading", { name: /our best services|current services|waiting for approval|ongoing services/i })
        .first()
    ).toBeVisible();
  });

  test("can navigate to order requests", async ({ page }) => {
    await page.goto("/buyer/requests");
    await expect(page).toHaveURL(/buyer\/requests/);

    const hasRows = page.locator("table tbody tr").first();
    const hasEmptyState = page.getByText(/no (requests|orders|records)/i);

    await expect(hasRows.or(hasEmptyState)).toBeVisible({ timeout: 10_000 });
  });

  test("can open the new order request page", async ({ page }) => {
    await page.goto("/buyer/requests");
    const newRequestLink = page.getByRole("link", { name: /new order request/i });

    await expect(newRequestLink).toBeVisible({ timeout: 10_000 });
    await newRequestLink.click();

    await expect(page).toHaveURL(/buyer\/requests\/new/);
    await expect(page.getByRole("heading", { name: /new order request/i })).toBeVisible();
  });

  test("request workspace stays accessible", async ({ page }) => {
    await page.goto("/buyer/requests");
    await expect(page.getByRole("heading", { name: /my requests/i })).toBeVisible();
  });

  test("order request list shows data or empty state", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");
    const hasRows = (await page.locator("table tbody tr, [data-testid='request-row']").count()) > 0;
    const hasEmpty = (await page.getByText(/no (requests|orders|records|data)/i).count()) > 0;
    const hasContent = (await page.locator("main .card, main [class*='card']").count()) > 0;
    expect(hasRows || hasEmpty || hasContent).toBeTruthy();
  });

  test("order status badge is visible when orders exist", async ({ page }) => {
    await page.goto("/buyer/requests");
    await page.waitForLoadState("networkidle");
    // If any rows exist, check for a status badge
    const firstRow = page.locator("table tbody tr").first();
    if (await firstRow.isVisible({ timeout: 3_000 })) {
      const statusCell = firstRow.locator("td").nth(3);
      await expect(statusCell).toBeVisible({ timeout: 5_000 });
      await expect(statusCell).not.toHaveText(/^\s*$/);
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

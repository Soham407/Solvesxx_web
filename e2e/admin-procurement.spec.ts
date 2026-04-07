import { test, expect } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

// Admin procurement flow: login -> purchase orders -> open create dialog -> verify list state
test.describe("Admin Procurement Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("can navigate to Purchase Orders", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    await expect(page).toHaveURL(/inventory\/purchase-orders/);
    await expect(page.getByRole("heading", { name: /purchase orders/i }).first()).toBeVisible();
  });

  test("shows the raise new PO action", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");
    const createButton = page.getByRole("button", { name: /raise new po/i });

    await expect(createButton).toBeVisible({ timeout: 10_000 });
  });

  test("Purchase Orders list renders data or an empty state", async ({ page }) => {
    await page.goto("/inventory/purchase-orders");

    await expect(page.getByTestId("purchase-orders-loading-state")).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(
      page.getByTestId("purchase-orders-error-state"),
      "Purchase Orders should not fall back to the fatal error state.",
    ).toHaveCount(0);

    const hasRows = page.locator("table tbody tr").first();
    const hasPageEmptyState = page.getByTestId("purchase-orders-empty-state");
    const hasTableEmptyState = page.getByText(/no records found/i);

    await expect(
      hasRows.or(hasPageEmptyState).or(hasTableEmptyState),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can navigate to Indents page", async ({ page }) => {
    await page.goto("/inventory/indents/verification");
    await expect(page).toHaveURL(/inventory\/indents\/verification/);
    await expect(
      page.getByRole("heading", { name: /indent price verification/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can navigate to GRN page", async ({ page }) => {
    const grnLink = page.getByRole("link", { name: /grn|receipt|material receipt/i }).first();
    if (await grnLink.isVisible({ timeout: 3_000 })) {
      await grnLink.click();
      await expect(page).toHaveURL(/grn|receipt/, { timeout: 8_000 });
    } else {
      await page.goto("/inventory/grn");
    }
    await page.waitForLoadState("networkidle");
    const mainContent = page.locator("main").first();
    await expect(mainContent).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to Supplier Bills", async ({ page }) => {
    await page.goto("/finance/supplier-bills");
    await expect(page).toHaveURL(/finance\/supplier-bills/);
    await expect(
      page.getByRole("heading", { name: /supplier payout registry/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can navigate to Reconciliation page", async ({ page }) => {
    await page.goto("/finance/reconciliation");
    await expect(page).toHaveURL(/finance\/reconciliation/);
    await expect(
      page.getByRole("heading", { name: /triple-match reconciliation/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

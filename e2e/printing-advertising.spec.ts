import { test, expect } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

test.describe("Printing & Advertising Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("printing and ad-space workspace is accessible", async ({ page }) => {
    await page.goto("/services/printing");
    await expect(page).toHaveURL(/services\/printing/);

    await expect(
      page.getByRole("heading", { name: /printing & advertising/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /usage logs/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /ad-space master/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /internal printing/i })).toBeVisible();
  });

  test("ad-space master tab renders cards or empty-state guidance", async ({ page }) => {
    await page.goto("/services/printing");
    await page.getByRole("tab", { name: /ad-space master/i }).click();

    const hasAdCards =
      (await page.locator("button:has-text('Book Space'), button:has-text('Manage Inventory')").count()) > 0;
    const hasEmptyGuide =
      (await page.getByText(/register society assets.*ad-spaces.*track revenue/i).count()) > 0;

    expect(hasAdCards || hasEmptyGuide).toBeTruthy();
  });

  test("internal printing tab allows ID card generation flow", async ({ page }) => {
    await page.goto("/services/printing");
    await page.getByRole("tab", { name: /internal printing/i }).click();

    await expect(page.getByRole("heading", { name: /id card details/i })).toBeVisible();

    const printButton = page.getByRole("button", { name: /^print$/i });
    await expect(printButton).toBeDisabled();

    await page.getByPlaceholder(/enter name/i).fill("E2E Print User");
    await page.getByPlaceholder(/auto or manual/i).fill("E2E-ID-001");
    await page.getByPlaceholder(/e\.g\., technician/i).fill("Technician");
    await page.getByRole("button", { name: /generate id card/i }).click();

    await expect(printButton).toBeEnabled({ timeout: 10_000 });
  });
});

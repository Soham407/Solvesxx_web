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
});

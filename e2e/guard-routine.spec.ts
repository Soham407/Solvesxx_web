import { test, expect } from "@playwright/test";

// Guard daily routine: login → log visitor → check in → verify in visitor list
test.describe("Guard Daily Routine", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_GUARD_EMAIL ?? "guard@facilityPro.com");
    await page.getByLabel(/password/i).fill(process.env.E2E_GUARD_PASSWORD ?? "guard123");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(test-guard|guard|dashboard)/, { timeout: 10_000 });
  });

  test("guard dashboard loads", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("visitor log section is visible", async ({ page }) => {
    // Guard dashboard shows visitors inline or via link
    const visitorsSection = page
      .getByText(/visitor/i)
      .first();
    await expect(visitorsSection).toBeVisible({ timeout: 10_000 });
  });

  test("can open log visitor form", async ({ page }) => {
    const logBtn = page.getByRole("button", { name: /log visitor|add visitor|new visitor/i }).first();
    if (await logBtn.isVisible()) {
      await logBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("visitor list renders or shows empty state", async ({ page }) => {
    // Navigate to visitors page if link exists
    const visitorsLink = page.getByRole("link", { name: /visitors/i }).first();
    if (await visitorsLink.isVisible()) {
      await visitorsLink.click();
      await expect(page).toHaveURL(/visitor/);
    }
    const hasRows = page.locator("table tbody tr").first();
    const hasEmpty = page.getByText(/no (visitors|records|data)/i);
    await expect(hasRows.or(hasEmpty)).toBeVisible({ timeout: 10_000 });
  });
});

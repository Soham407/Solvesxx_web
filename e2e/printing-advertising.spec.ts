import { expect, test } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

test.describe("Printing and advertising production removal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
  });

  test("printing surface is hidden from navigation and direct route is removed", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /printing|ads/i })).toHaveCount(0);

    await page.goto("/services/printing");
    await expect(
      page.getByRole("heading", { name: /module not found/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /internal printing/i })).toHaveCount(0);
  });
});

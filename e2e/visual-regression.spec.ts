import { test, expect } from "@playwright/test";

const visualEnabled = process.env.E2E_VISUAL === "1";

test.use({
  colorScheme: "light",
});

test.describe("Visual Regression", () => {
  test.skip(!visualEnabled, "Enable with E2E_VISUAL=1 to record and compare screenshots.");

  test("login page stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveScreenshot("login-page.png", {
      animations: "disabled",
      caret: "hide",
      fullPage: true,
    });
  });
});

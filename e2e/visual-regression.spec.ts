import { test, expect } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

const visualEnabled = process.env.E2E_VISUAL === "1";

// Common screenshot options — viewport-only (no fullPage) so height is deterministic.
// maxDiffPixelRatio allows real-data dashboards to have changing content without
// masking every stat; layout regressions (missing sidebars, mis-placed sections)
// still produce diffs well above the 15% tolerance.
const SCREENSHOT_OPTIONS = {
  animations: "disabled" as const,
  caret: "hide" as const,
  maxDiffPixelRatio: 0.3,
};

test.use({
  colorScheme: "light",
});

test.describe("Visual Regression", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(!visualEnabled, "Enable with E2E_VISUAL=1 to record and compare screenshots.");

  test("login page stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveScreenshot("login-page.png", {
      ...SCREENSHOT_OPTIONS,
    });
  });

  test("guard dashboard stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "security_guard");
    await page.goto("/guard", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveScreenshot("guard-dashboard.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [
        page.locator("time"),
        page.locator("[data-testid='realtime-count']"),
        page.locator(".animate-pulse"),
      ],
    });
  });

  test("resident dashboard stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "resident");
    await page.goto("/resident", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveScreenshot("resident-dashboard.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [page.locator("time"), page.locator(".animate-pulse")],
    });
  });

  test("buyer dashboard stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "buyer");
    await page.goto("/buyer", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveScreenshot("buyer-dashboard.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [page.locator("time"), page.locator(".animate-pulse")],
    });
  });

  test("admin procurement page stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "admin");
    await page.goto("/inventory/purchase-orders", { waitUntil: "networkidle" });
    // Wait for loading state to clear
    await expect(page.getByTestId("purchase-orders-loading-state")).toHaveCount(0, {
      timeout: 20_000,
    });

    await expect(page).toHaveScreenshot("admin-procurement.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [page.locator("time"), page.locator(".animate-pulse")],
    });
  });

  test("supplier dashboard stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "supplier");
    await page.goto("/supplier", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveScreenshot("supplier-dashboard.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [page.locator("time"), page.locator(".animate-pulse")],
    });
  });

  test("admin dashboard stays visually stable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Baseline snapshots are currently maintained in Chromium only.");

    await loginAsRole(page, "admin");
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    await expect(page).toHaveScreenshot("admin-dashboard.png", {
      ...SCREENSHOT_OPTIONS,
      mask: [page.locator("time"), page.locator(".animate-pulse")],
    });
  });
});

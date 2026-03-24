import { expect, test } from "@playwright/test";

import {
  expectBlockedRoute,
  expectRedirectToLogin,
  expectSidebarLinkHidden,
  loginAsRole,
} from "./helpers/auth";

test.describe("Auth and RBAC Edge Cases", () => {
  test("redirects anonymous dashboard access to login", async ({ page }) => {
    await expectRedirectToLogin(page, "/dashboard");
  });

  test("treats an expired session like an unauthenticated request", async ({ page }) => {
    await loginAsRole(page, "buyer");
    await page.context().clearCookies();

    await expectRedirectToLogin(page, "/buyer/requests");
  });

  test("hides admin-only sidebar links from buyer users", async ({ page }) => {
    await loginAsRole(page, "buyer");
    await page.goto("/buyer");

    await expectSidebarLinkHidden(page, "Admin Management");
    await expectSidebarLinkHidden(page, "Role & Permissions");
    await expectSidebarLinkHidden(page, "Audit Logs");
  });

  test("shows platform settings links to super admin users", async ({ page }) => {
    await loginAsRole(page, "super_admin");

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /settings/i }).click();

    await expect(page.getByRole("link", { name: /Admin Management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Role & Permissions/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Audit Logs/i }).first()).toBeVisible();
  });

  test("blocks disabled settings routes even for privileged users", async ({ page }) => {
    await loginAsRole(page, "super_admin");
    await page.goto("/settings/notifications");

    await expect(page).toHaveURL(/\/dashboard\?error=forbidden/i);
    await page.goto("/settings/branding");
    await expect(page).toHaveURL(/\/dashboard\?error=forbidden/i);
  });

  test("routes buyers away from super admin management pages", async ({ page }) => {
    await loginAsRole(page, "buyer");
    await expectBlockedRoute(page, "buyer");
    await page.goto("/settings/admins");

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).not.toBe("/settings/admins");
    expect(["/buyer", "/dashboard"]).toContain(currentUrl.pathname);

    if (currentUrl.pathname === "/dashboard") {
      expect(currentUrl.searchParams.get("error")).toBe("forbidden");
    }
  });
});

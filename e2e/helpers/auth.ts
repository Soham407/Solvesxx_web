import { expect, test, type Locator, type Page } from "@playwright/test";

import type { AppRole } from "../../src/lib/auth/roles";
import type { RoleJourneyCheck, RoleTestConfig } from "../role-matrix";
import { getRoleTestConfig } from "../role-matrix";

const LOGIN_BUTTON_NAME = /^(?:sign in|enter workspace)$/i;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTextMatcher(value: string | undefined): RegExp | undefined {
  if (!value) {
    return undefined;
  }

  return new RegExp(escapeRegex(value), "i");
}

function getRoleConfig(configOrRole: RoleTestConfig | AppRole): RoleTestConfig {
  return typeof configOrRole === "string" ? getRoleTestConfig(configOrRole) : configOrRole;
}

async function gotoWithRetry(
  page: Page,
  path: string,
  options?: Parameters<Page["goto"]>[1],
  attempts = 3
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(path, options);
      return;
    } catch (error) {
      lastError = error;

      if (
        attempt === attempts ||
        !(error instanceof Error) ||
        !error.message.includes("ERR_CONNECTION_REFUSED")
      ) {
        throw error;
      }

      await page.waitForTimeout(1_500);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to navigate to ${path}`);
}

async function waitForPath(
  page: Page,
  path: string | string[],
  timeout = 15_000
) {
  const acceptedPaths = Array.from(new Set(Array.isArray(path) ? path : [path]));

  await expect
    .poll(
      () => {
        try {
          return acceptedPaths.includes(new URL(page.url()).pathname);
        } catch {
          return acceptedPaths.includes(page.url());
        }
      },
      {
        timeout,
        message: `Expected one of [${acceptedPaths.join(", ")}] but saw ${page.url()}`,
      }
    )
    .toBe(true);

  await expect(page.locator("main")).toBeVisible({ timeout });
}

function getCurrentPath(page: Page) {
  try {
    return new URL(page.url()).pathname;
  } catch {
    return page.url();
  }
}

async function prepareLoginForm(page: Page) {
  const emailField = page.getByLabel(/corporate email|email/i);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await gotoWithRetry(page, "/login", { waitUntil: "domcontentloaded" });

    try {
      await expect(emailField).toBeVisible({ timeout: 5_000 });
      return emailField;
    } catch (error) {
      if (attempt === 2 || getCurrentPath(page) === "/login") {
        throw error;
      }

      await page.context().clearCookies();
      await page.evaluate(() => {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch {
          // Ignore storage access errors while resetting auth state.
        }
      });
      await page.waitForTimeout(500);
    }
  }

  return emailField;
}

function getJourneyReadyLocators(page: Page, journey: RoleJourneyCheck): Locator[] {
  const main = page.locator("main");
  const candidates: Locator[] = [];
  const readyText = toTextMatcher(journey.readyText);
  const emptyStateText = toTextMatcher(journey.emptyStateText);
  const ctaText = toTextMatcher(journey.ctaText);

  if (readyText) {
    candidates.push(main.getByRole("heading", { name: readyText }).first());
    candidates.push(main.getByText(readyText).first());
  }

  if (emptyStateText) {
    candidates.push(main.getByText(emptyStateText).first());
  }

  if (ctaText) {
    candidates.push(main.getByRole("button", { name: ctaText }).first());
    candidates.push(main.getByText(ctaText).first());
  }

  return candidates.length > 0 ? candidates : [main];
}

async function expectAnyVisible(locators: Locator[], timeout = 10_000) {
  const perLocatorTimeout = Math.max(1_500, Math.floor(timeout / Math.max(locators.length, 1)));
  let lastError: unknown;

  for (const locator of locators) {
    try {
      await expect(locator).toBeVisible({ timeout: perLocatorTimeout });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("None of the expected journey locators became visible.");
}

export async function loginAsRole(page: Page, configOrRole: RoleTestConfig | AppRole) {
  const config = getRoleConfig(configOrRole);
  const acceptedLandingPaths = Array.from(
    new Set([config.expectedLandingPath, config.allowedPath])
  );
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const emailField = await prepareLoginForm(page);
    await emailField.fill(config.email);
    await page.getByLabel(/password/i).fill(config.password);
    await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();

    try {
      await waitForPath(page, acceptedLandingPaths, 15_000);
      return;
    } catch (error) {
      lastError = error;
      const currentPath = getCurrentPath(page);

      if (attempt === 2 || currentPath !== "/login") {
        throw error;
      }

      await page.waitForTimeout(1_000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to sign in as ${config.role}.`);
}

export async function expectAllowedRoute(page: Page, configOrRole: RoleTestConfig | AppRole) {
  const config = getRoleConfig(configOrRole);

  await page.goto(config.allowedPath);
  await waitForPath(page, config.allowedPath);
  await expect(page).not.toHaveURL(/\/login|error=(?:forbidden|feature_disabled|inactive|no_role)/i);
  await expect(page.locator("main")).not.toContainText(/feature not available/i);
}

export async function expectBlockedRoute(page: Page, configOrRole: RoleTestConfig | AppRole) {
  const config = getRoleConfig(configOrRole);
  const permittedFallbackPaths = Array.from(
    new Set(["/dashboard", config.expectedLandingPath])
  );

  await page.goto(config.blockedPath);
  await page.waitForURL(
    (url) =>
      url.pathname !== config.blockedPath &&
      permittedFallbackPaths.includes(url.pathname),
    { timeout: 15_000 }
  );

  const currentUrl = new URL(page.url());

  expect(currentUrl.pathname).not.toBe(config.blockedPath);
  expect(permittedFallbackPaths).toContain(currentUrl.pathname);

  if (currentUrl.pathname === "/dashboard") {
    expect(currentUrl.searchParams.get("error")).toBe("forbidden");
  }
}

export async function expectJourneyRoute(page: Page, configOrRole: RoleTestConfig | AppRole) {
  const config = getRoleConfig(configOrRole);
  const journey = config.journey;

  await page.goto(journey.path);
  await waitForPath(page, journey.path);
  await expectAnyVisible(getJourneyReadyLocators(page, journey));
}

export async function expectRedirectToLogin(page: Page, path: string, timeout = 15_000) {
  await gotoWithRetry(page, path, { waitUntil: "domcontentloaded" });
  await page.waitForURL(
    (url) => url.pathname === "/login" && url.searchParams.get("redirectTo") === path,
    { timeout }
  );
  await expect(page.getByPlaceholder("name@company.com")).toBeVisible({ timeout });
  await expect(page.getByRole("button", { name: LOGIN_BUTTON_NAME })).toBeVisible({ timeout });
}

export async function expectSidebarLinkVisible(page: Page, label: string) {
  const link = page.getByRole("link", {
    name: new RegExp(escapeRegex(label), "i"),
  });

  await expect(link.first()).toBeVisible({ timeout: 10_000 });
}

export async function expectSidebarLinkHidden(page: Page, label: string) {
  const link = page.getByRole("link", {
    name: new RegExp(escapeRegex(label), "i"),
  });

  await expect(link).toHaveCount(0);
}

export function registerRoleSmokeSuite(title: string, configs: RoleTestConfig[]) {
  test.describe(title, () => {
    for (const config of configs) {
      test.describe(config.role, () => {
        test.beforeEach(async ({ page }) => {
          await loginAsRole(page, config);
        });

        test("lands on the expected route after login", async ({ page }) => {
          await expect(page).toHaveURL(
            new RegExp(`${escapeRegex(config.expectedLandingPath)}(?:$|[?#])`, "i")
          );
          await expect(page.locator("main")).toBeVisible();
        });

        test("loads an allowed route", async ({ page }) => {
          await expectAllowedRoute(page, config);
        });

        test("denies a blocked route", async ({ page }) => {
          await expectBlockedRoute(page, config);
        });

        test(`completes the ${config.journey.label} journey`, async ({ page }) => {
          await expectJourneyRoute(page, config);
        });
      });
    }
  });
}

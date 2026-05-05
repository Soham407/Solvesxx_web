import { Buffer } from "node:buffer";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { AppRole } from "../../src/lib/auth/roles";
import type { RoleJourneyCheck, RoleTestConfig } from "../role-matrix";
import { getRoleTestConfig } from "../role-matrix";

const SUPABASE_PROJECT_REF = "wwhbdgwfodumognpkgrf";
const SUPABASE_TOKEN_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/token`;
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3aGJkZ3dmb2R1bW9nbnBrZ3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzYyOTgsImV4cCI6MjA4NTcxMjI5OH0.Iw5KYmIP_OHalA2tyHAiKSI6xQa-EE5urL_4aEygzg0";
const SESSION_COOKIE_NAME = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const BASE64_PREFIX = "base64-";
const MAX_COOKIE_CHUNK = 3180;

type SessionCookie = {
  name: string;
  value: string;
  sameSite: "Strict" | "Lax" | "None";
  httpOnly: boolean;
  secure: boolean;
};

type SupabasePasswordSession = Record<string, unknown> & {
  expires_at?: number;
};

const sessionCache = new Map<string, SupabasePasswordSession>();

function getSessionCacheKey(config: RoleTestConfig) {
  return `${config.email}:${config.password}`;
}

function isSessionFresh(session: SupabasePasswordSession) {
  if (typeof session.expires_at !== "number") {
    return true;
  }

  return session.expires_at * 1000 > Date.now() + 60_000;
}

function buildSessionCookies(
  session: unknown
): SessionCookie[] {
  const json = JSON.stringify(session);
  const encoded = BASE64_PREFIX + Buffer.from(json, "utf8").toString("base64url");
  const urlEncoded = encodeURIComponent(encoded);

  const base = { sameSite: "Lax" as const, httpOnly: false, secure: false };

  if (urlEncoded.length <= MAX_COOKIE_CHUNK) {
    return [{ ...base, name: SESSION_COOKIE_NAME, value: encoded }];
  }

  // Session too large — split into chunks matching @supabase/ssr createChunks logic.
  const cookies: SessionCookie[] = [];
  let remaining = urlEncoded;
  let idx = 0;

  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_COOKIE_CHUNK);
    const lastPct = head.lastIndexOf("%");
    if (lastPct > MAX_COOKIE_CHUNK - 3) head = head.slice(0, lastPct);
    let value = "";
    let attempt = head;
    while (attempt.length > 0) {
      try {
        value = decodeURIComponent(attempt);
        break;
      } catch {
        attempt = attempt.slice(0, attempt.length - 3);
      }
    }
    cookies.push({ ...base, name: `${SESSION_COOKIE_NAME}.${idx}`, value });
    remaining = remaining.slice(head.length);
    idx++;
  }

  return cookies;
}

async function getSupabaseSession(page: Page, config: RoleTestConfig) {
  const cacheKey = getSessionCacheKey(config);
  const cachedSession = sessionCache.get(cacheKey);

  if (cachedSession && isSessionFresh(cachedSession)) {
    return cachedSession;
  }

  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const resp = await page.request.post(`${SUPABASE_TOKEN_URL}?grant_type=password`, {
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      data: { email: config.email, password: config.password },
    });

    if (resp.ok()) {
      const session = (await resp.json()) as SupabasePasswordSession;
      sessionCache.set(cacheKey, session);
      return session;
    }

    lastStatus = resp.status();
    lastBody = await resp.text();

    if (lastStatus !== 429) {
      break;
    }

    if (cachedSession) {
      return cachedSession;
    }

    await page.waitForTimeout(attempt * 2_000);
  }

  throw new Error(
    `Supabase auth failed for ${config.role} (${config.email}): HTTP ${lastStatus} — ${lastBody}`
  );
}

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

  // Direct API login bypasses the browser form, avoiding both the @supabase/ssr
  // cookie-setting race condition. Cache per worker to avoid repeated password
  // grants tripping Supabase's auth rate limit in role matrix suites.
  const session = await getSupabaseSession(page, config);
  await gotoWithRetry(page, "/login", { waitUntil: "domcontentloaded" });
  const cookieUrl = new URL(page.url()).origin;

  await page.context().clearCookies();
  await page.context().addCookies(
    buildSessionCookies(session).map((cookie) => ({
      ...cookie,
      url: cookieUrl,
    }))
  );

  const acceptedLandingPaths = Array.from(
    new Set([config.expectedLandingPath, config.allowedPath])
  );
  const navigationTargets = Array.from(
    new Set([
      config.expectedLandingPath,
      ...(config.allowedPath !== config.expectedLandingPath ? [config.allowedPath] : []),
    ])
  );
  let lastError: unknown;

  for (const target of navigationTargets) {
    try {
      await gotoWithRetry(page, target, { waitUntil: "domcontentloaded" });
      await waitForPath(page, acceptedLandingPaths, 15_000);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to navigate after signing in as ${config.role}.`);
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

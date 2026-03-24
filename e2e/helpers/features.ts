import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

import type {
  ApiExpectation,
  FeatureWave1Check,
  ScopedFeatureTestConfig,
} from "../feature-matrix";
import { writeCoverageRecord, type CoverageFailureType } from "./coverage";
import { getTableCount } from "./db";
import { loginAsRole } from "./auth";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTextMatcher(value: string | undefined) {
  return value ? new RegExp(escapeRegex(value), "i") : undefined;
}

function getScopeItem(feature: ScopedFeatureTestConfig) {
  return `${feature.scopeSection} ${feature.title}`;
}

function getTestId(testInfo: TestInfo) {
  return testInfo.titlePath.slice(1).join(" > ");
}

function classifyFailure(error: unknown): CoverageFailureType {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("did global setup run") ||
    message.includes("missing required environment variable") ||
    message.includes("net::err_connection_refused") ||
    message.includes("browser has been closed")
  ) {
    return "harness_bug";
  }

  if (
    message.includes("foreign key") ||
    message.includes("violates") ||
    message.includes("duplicate key") ||
    message.includes("fixture")
  ) {
    return "fixture_bug";
  }

  return "product_bug";
}

function collectCandidateLocators(page: Page, check: FeatureWave1Check) {
  const main = page.locator("main");
  const candidates: Locator[] = [];

  for (const text of [check.readyText, check.ctaText, check.emptyStateText, check.secondaryText]) {
    const matcher = toTextMatcher(text);
    if (!matcher) {
      continue;
    }

    candidates.push(main.getByRole("heading", { name: matcher }).first());
    candidates.push(main.getByRole("button", { name: matcher }).first());
    candidates.push(main.getByRole("link", { name: matcher }).first());
    candidates.push(main.getByText(matcher).first());
  }

  return candidates.length > 0 ? candidates : [main];
}

async function expectAnyVisible(locators: Locator[], timeout = 12_000) {
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
    : new Error("None of the expected feature locators became visible.");
}

async function assertRouteLoaded(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === route, { timeout: 20_000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/login|error=(?:forbidden|feature_disabled|inactive|no_role)/i);
}

async function assertApiChecks(
  page: Page,
  checks: ApiExpectation[] | undefined,
  evidence: string[]
) {
  for (const apiCheck of checks ?? []) {
    const response = await page.request.fetch(apiCheck.path, {
      method: apiCheck.method ?? "GET",
      data: apiCheck.body,
    });
    const expectedStatus = apiCheck.expectedStatus ?? 200;

    expect(
      response.status(),
      `Unexpected status for ${apiCheck.method ?? "GET"} ${apiCheck.path}`,
    ).toBe(expectedStatus);
    evidence.push(`api:${apiCheck.method ?? "GET"} ${apiCheck.path} status=${response.status()}`);
  }
}

async function assertEntityChecks(check: FeatureWave1Check, evidence: string[]) {
  for (const entityCheck of check.entityChecks ?? []) {
    const count = await getTableCount(entityCheck.table);
    const minCount = entityCheck.minCount ?? 0;

    expect(
      count,
      `Expected ${entityCheck.table} to have at least ${minCount} row(s)`,
    ).toBeGreaterThanOrEqual(minCount);

    evidence.push(`db:${entityCheck.table} count=${count}`);
  }
}

export async function runScopedFeatureSmoke(
  page: Page,
  feature: ScopedFeatureTestConfig,
  testInfo: TestInfo
) {
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);

  if (feature.deferredReason) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "deferred",
      evidence: [feature.deferredReason],
      deferredReason: feature.deferredReason,
    });
    return;
  }

  const [check] = feature.wave1Checks;
  const role = feature.primaryRoles[0];
  const evidence: string[] = [`role:${role}`, `route:${check.route}`];

  try {
    await loginAsRole(page, role);
    await assertRouteLoaded(page, check.route);
    await expectAnyVisible(collectCandidateLocators(page, check));
    await assertApiChecks(page, check.apiChecks, evidence);
    await assertEntityChecks(check, evidence);

    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "passed",
      evidence,
    });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: classifyFailure(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";
import { loginAsRole } from "./helpers/auth";

function ids() {
  return readFeatureFixtureState().ids;
}

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function insertBuyerRequest(overrides: Partial<Record<string, unknown>> = {}) {
  const client = createServiceRoleClient();
  const fixtureIds = ids();

  const { data, error } = await client
    .from("requests")
    .insert({
      buyer_id: fixtureIds.buyerUserId,
      title: `Buyer Request ${token("req")}`,
      status: "pending",
      location_id: fixtureIds.locationId,
      ...overrides,
    })
    .select("id, request_number, title")
    .single();

  if (error) throw error;
  return data as { id: string; request_number: string; title: string };
}

test.describe("Buyer Request Interactions", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "buyer");
  });

  test("buyer can submit a new material order request", async ({ page }) => {
    // Capture console errors to diagnose form submission failures
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleLogs.push(msg.text());
    });
    page.on("pageerror", (err) => consoleLogs.push(err.message));

    await page.goto("/buyer/requests/new");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    // Wait for products and societies to load before interacting
    await page.waitForLoadState("networkidle");

    // Ensure we're in Material Request mode (the default — button should be "default" variant)
    const materialBtn = page.getByRole("button", { name: /material request/i });
    await expect(materialBtn).toBeVisible();
    // Click it to make sure we're in material mode (idempotent)
    await materialBtn.click();

    // Fill title
    const requestTitle = `Interaction Material Request ${token("buyer")}`;
    await page.locator("#title").fill(requestTitle);

    // Select location (first available society/location option)
    await page.locator("#location").click();
    const firstLocation = page.getByRole("option").first();
    await expect(firstLocation).toBeVisible({ timeout: 10_000 });
    await firstLocation.click();

    // Select product for the first item row — use the SelectTrigger inside the item row
    const itemRow = page.locator(".flex.flex-wrap.gap-4").first();
    await itemRow.getByRole("combobox").first().click();
    const firstProduct = page.getByRole("option").first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });
    await firstProduct.click();

    // Count requests before to verify increase
    const client = createServiceRoleClient();
    const { count: countBefore } = await client
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", ids().buyerUserId);

    // Submit
    await page.getByRole("button", { name: /submit request/i }).click();

    // Toast confirms submission (.first() avoids strict-mode conflict with ARIA live region)
    await expect(page.getByText(/request submitted/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Redirect back to /buyer/requests
    await expect(page).toHaveURL(/buyer\/requests$/, { timeout: 30_000 });

    // DB: request count increased
    await expect
      .poll(
        async () => {
          const { count } = await client
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", ids().buyerUserId);
          return count ?? 0;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(countBefore ?? 0);
  });

  test("buyer can view details of an existing request", async ({ page }) => {
    const request = await insertBuyerRequest();

    // Navigate directly to the detail page (tests the route, not the link click)
    await page.goto(`/buyer/requests/${request.id}`);
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    // Detail page renders the request number as the heading
    await expect(page.getByText(request.request_number).first()).toBeVisible({ timeout: 15_000 });
  });

  test("buyer can navigate to create page from the requests list", async ({ page }) => {
    await page.goto("/buyer/requests");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    const newRequestLink = page.getByRole("link", { name: /new order request/i });
    await expect(newRequestLink).toBeVisible({ timeout: 10_000 });
    await newRequestLink.click();

    await expect(page).toHaveURL(/buyer\/requests\/new/, { timeout: 8_000 });
    await expect(
      page.getByRole("heading", { name: /new (order|service) request/i }),
    ).toBeVisible();
  });
});

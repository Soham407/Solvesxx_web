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

async function insertForwardedIndent(overrides: Partial<Record<string, unknown>> = {}) {
  const client = createServiceRoleClient();
  const fixtureIds = ids();

  // The supplier portal client-side filter only shows requests where
  // is_service_request=true OR indent_id IS NOT NULL.
  // The acceptance RPC (create_po_from_supplier_request) also requires an approved indent
  // with at least one indent_item. Set up the full chain so both filter and RPC work.

  // requester_id is a FK to employees (not users)
  const { data: indentData, error: indentError } = await client
    .from("indents")
    .insert({
      requester_id: fixtureIds.buyerEmployeeId,
      supplier_id: fixtureIds.supplierId,
      title: `E2E Indent ${token("indent")}`,
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (indentError) throw indentError;

  const { error: itemError } = await client.from("indent_items").insert({
    indent_id: indentData.id,
    product_id: fixtureIds.productId,
    item_description: "E2E test item",
    requested_quantity: 1,
    approved_quantity: 1,
    unit_of_measure: "pcs",
    estimated_unit_price: 10000,
  });
  if (itemError) throw itemError;

  const { data, error } = await client
    .from("requests")
    .insert({
      buyer_id: fixtureIds.buyerUserId,
      title: `Supplier Indent ${token("indent")}`,
      status: "indent_forwarded",
      supplier_id: fixtureIds.supplierId,
      location_id: fixtureIds.locationId,
      indent_id: indentData.id,
      // is_service_request must be false so respondToIndent uses create_po_from_supplier_request
      // (the service API path requires service_type + indent chain which is more complex to seed)
      is_service_request: false,
      ...overrides,
    })
    .select("id, request_number, title")
    .single();

  if (error) throw error;
  return data as { id: string; request_number: string | null; title: string };
}

async function waitForIndentStatus(
  indentId: string,
  expectedStatus: string,
  timeout = 25_000,
) {
  const client = createServiceRoleClient();
  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("requests")
          .select("status")
          .eq("id", indentId)
          .single();
        if (error) throw error;
        return data?.status ?? null;
      },
      { timeout },
    )
    .toBe(expectedStatus);
}

// Prefer the DB-generated request_number; fall back to unique title for row lookup.
function indentLabel(indent: { request_number: string | null; title: string }) {
  return indent.request_number ?? indent.title;
}

test.describe("Supplier Indent Interactions", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "supplier");
    await page.goto("/supplier/indents");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
  });

  test("supplier can accept a forwarded indent", async ({ page }) => {
    const indent = await insertForwardedIndent();

    // Capture page console output for diagnostics
    const consoleLogs: string[] = [];
    page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) => consoleLogs.push(`[pageerror] ${err.message}`));

    // Intercept both possible acceptance paths
    let rpcResponse: unknown = null;
    let apiResponse: unknown = null;
    await page.route(/create_po_from_supplier_request/, async (route) => {
      const resp = await route.fetch();
      rpcResponse = await resp.json().catch(() => "(unparseable)");
      await route.fulfill({ response: resp });
    });
    await page.route(/service-indent-response/, async (route) => {
      const resp = await route.fetch();
      apiResponse = await resp.json().catch(() => "(unparseable)");
      await route.fulfill({ response: resp });
    });

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    // Wait for the initial data fetch AND any realtime-triggered refetches to settle.
    // Without this, a rerender mid-click detaches the button from React's event tree.
    await page.waitForLoadState("networkidle");

    const label = indentLabel(indent);
    const indentRow = page.locator("tr").filter({ hasText: label }).first();
    await expect(indentRow).toBeVisible({ timeout: 15_000 });

    // Use toPass to retry if a background rerender detaches the element between locate and click.
    await expect(async () => {
      const freshRow = page.locator("tr").filter({ hasText: label }).first();
      await freshRow.getByRole("button", { name: /accept/i }).click({ force: true });
      // Verify the Accept button disappeared — the row switches to "Details" on success.
      await expect(freshRow.getByRole("button", { name: /accept/i })).toHaveCount(0, {
        timeout: 5_000,
      });
    }).toPass({ timeout: 30_000 });

    // DB: create_po_from_supplier_request advances status to po_issued (skips indent_accepted).
    await expect
      .poll(
        async () => {
          const { data } = await createServiceRoleClient()
            .from("requests")
            .select("status")
            .eq("id", indent.id)
            .single();
          return data?.status ?? null;
        },
        {
          timeout: 25_000,
          message: `RPC: ${JSON.stringify(rpcResponse)} | API: ${JSON.stringify(apiResponse)} | Console: ${consoleLogs.slice(-10).join(" | ")}`,
        },
      )
      .toBe("po_issued");
  });

  test("supplier can reject a forwarded indent with a reason", async ({ page }) => {
    const indent = await insertForwardedIndent();

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    const label = indentLabel(indent);
    const indentRow = page.locator("tr").filter({ hasText: label }).first();
    await expect(indentRow).toBeVisible({ timeout: 15_000 });

    // Click Reject
    await indentRow.getByRole("button", { name: /reject/i }).click();

    // Reject dialog opens
    const rejectDialog = page.getByRole("dialog", { name: /reject indent/i });
    await expect(rejectDialog).toBeVisible();

    // Fill rejection reason
    const reason = "Cannot fulfill — capacity full for this period";
    await rejectDialog.locator("textarea").fill(reason);

    // Confirm rejection
    await rejectDialog.getByRole("button", { name: /confirm rejection/i }).click();

    // Toast confirms rejection
    await expect(page.getByText(/indent rejected/i).first()).toBeVisible({ timeout: 15_000 });

    // DB: status changed and rejection_reason recorded
    const client = createServiceRoleClient();
    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("requests")
            .select("status, rejection_reason")
            .eq("id", indent.id)
            .single();
          if (error) throw error;
          return data;
        },
        { timeout: 25_000 },
      )
      .toMatchObject({ status: "indent_rejected", rejection_reason: reason });
  });

  test("supplier can view details of a non-forwarded indent", async ({ page }) => {
    // Insert an already-accepted indent (shows Details button, not Accept/Reject)
    const indent = await insertForwardedIndent({ status: "indent_accepted" });

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    const label = indentLabel(indent);
    const indentRow = page.locator("tr").filter({ hasText: label }).first();
    await expect(indentRow).toBeVisible({ timeout: 15_000 });

    // Details button (not Accept/Reject)
    await indentRow.getByRole("button", { name: /details/i }).click();

    // Details dialog opens — assert by the title shown in the dialog header
    const detailDialog = page.getByRole("dialog");
    await expect(detailDialog).toBeVisible();
    // Dialog shows either request_number or falls back to title text in the row
    await expect(detailDialog.getByText(indent.request_number ?? indent.title)).toBeVisible();
  });
});

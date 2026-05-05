import { test, expect, type Page, type Locator } from "@playwright/test";
import crypto from "node:crypto";

import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";
import { loginAsRole } from "./helpers/auth";

function ids() {
  return readFeatureFixtureState().ids;
}

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function insertDraftPO(overrides: Partial<Record<string, unknown>> = {}) {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("purchase_orders")
    .insert({
      supplier_id: ids().supplierId,
      po_date: new Date().toISOString().split("T")[0],
      status: "draft",
      payment_terms: "Net 30",
      notes: `Interaction test ${token("po")}`,
      created_by: ids().adminUserId,
      ...overrides,
    })
    .select("id, po_number")
    .single();

  if (error) throw error;
  const po = data as { id: string; po_number: string | null };

  // sendToVendor validates items.length > 0 before allowing status transition.
  const { error: itemError } = await client.from("purchase_order_items").insert({
    purchase_order_id: po.id,
    product_id: ids().productId,
    ordered_quantity: 1,
    unit_of_measure: "pcs",
    unit_price: 10000,
    tax_rate: 0,
    tax_amount: 0,
    discount_percent: 0,
    discount_amount: 0,
    line_total: 10000,
  });
  if (itemError) throw itemError;

  return po;
}

async function waitForPOStatus(poId: string, expectedStatus: string, timeout = 25_000) {
  const client = createServiceRoleClient();
  await expect
    .poll(
      async () => {
        const { data, error } = await client
          .from("purchase_orders")
          .select("status")
          .eq("id", poId)
          .single();
        if (error) throw error;
        return data?.status ?? null;
      },
      { timeout },
    )
    .toBe(expectedStatus);
}

// Unique label for a PO — uses po_number when available (DB trigger), id prefix otherwise.
function poLabel(po: { id: string; po_number: string | null }) {
  return po.po_number ?? `PO-${po.id.slice(0, 8)}`;
}

// Open a row's DropdownMenu in the PO table.
// Uses expect().toPass() to retry the click+open sequence, which handles React re-renders
// that can detach table row elements between locator resolution and action dispatch.
async function openPORowMenu(page: Page, row: Locator) {
  const menu = page.locator('[role="menu"]');

  await expect(async () => {
    // Re-evaluate btn inside the retry loop so stale-element errors are recovered automatically.
    await row.locator("button").last().click({ force: true });
    await expect(menu).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

test.describe("Procurement Interactions", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  // Ensure the fixture supplier is active so it appears in the supplier dropdown.
  test.beforeAll(async () => {
    const client = createServiceRoleClient();
    await client
      .from("suppliers")
      .update({ status: "active" })
      .eq("id", ids().supplierId);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await page.goto("/inventory/purchase-orders");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    // Wait for loading spinner to clear
    await expect(page.getByTestId("purchase-orders-loading-state")).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("admin can raise a PO via the dialog", async ({ page }) => {
    // Unique token embedded in notes — used for DB verification so we don't depend
    // on which supplier happens to be first in the dropdown.
    const noteToken = token("po-interaction");

    // Open create dialog
    await page.getByRole("button", { name: /raise new po/i }).click();
    const dialog = page.getByRole("dialog", { name: /raise new purchase order/i });
    await expect(dialog).toBeVisible();

    // Select first available supplier — wait for suppliers to finish loading
    await dialog.locator("#supplier").click();
    const firstSupplierOption = page.getByRole("option").first();
    await expect(firstSupplierOption).toBeVisible({ timeout: 15_000 });
    await firstSupplierOption.click();

    // Set expected delivery date
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    await dialog.locator("#delivery_date").fill(futureDate);

    // Embed unique token in notes so we can find this exact row in DB
    await dialog.locator("#notes").fill(`Raised via interaction test: ${noteToken}`);

    // Submit
    await dialog.getByRole("button", { name: /create draft po/i }).click();

    // Toast confirms creation (.first() avoids strict-mode conflict with ARIA live region)
    await expect(page.getByText(/purchase order created/i).first()).toBeVisible({ timeout: 15_000 });

    // Dialog closes on success
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    // DB: the exact draft PO written by this test run exists
    const client = createServiceRoleClient();
    await expect
      .poll(
        async () => {
          const { count } = await client
            .from("purchase_orders")
            .select("*", { count: "exact", head: true })
            .eq("notes", `Raised via interaction test: ${noteToken}`)
            .eq("status", "draft");
          return count ?? 0;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
  });

  test("admin can send a draft PO to vendor via row menu", async ({ page }) => {
    const po = await insertDraftPO();

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    // Wait for all fetch requests to settle so the new PO row is in the DOM.
    await page.waitForLoadState("networkidle");

    // Find the row using po_number from trigger, or the id-prefix fallback shown in the UI.
    const label = poLabel(po);
    const poRow = page.locator("tbody tr").filter({ hasText: label }).first();
    await expect(poRow).toBeVisible({ timeout: 20_000 });

    // Open the row's action dropdown
    await openPORowMenu(page, poRow);
    await page.getByRole("menuitem", { name: /send to vendor/i }).click();

    // Confirm dialog
    const confirmDialog = page.getByRole("dialog", { name: /send to vendor/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: /^send$/i }).click();

    // Toast confirms
    await expect(page.getByText(/po sent/i).first()).toBeVisible({ timeout: 15_000 });

    // DB: status changed
    await waitForPOStatus(po.id, "sent_to_vendor");
  });

  test("admin can open PO detail sheet and see status-correct actions", async ({ page }) => {
    const po = await insertDraftPO({ status: "sent_to_vendor" });

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    const label = poLabel(po);
    const poRow = page.locator("tbody tr").filter({ hasText: label }).first();
    await expect(poRow).toBeVisible({ timeout: 20_000 });

    // Open row menu → View Details
    await openPORowMenu(page, poRow);
    await page.getByRole("menuitem", { name: /view details/i }).click();

    // Sheet opens and shows the PO number or id prefix (sheet heading + table row both show label; use first())
    await expect(page.getByText(label).first()).toBeVisible({ timeout: 10_000 });

    // For sent_to_vendor status the sheet should present "Mark Acknowledged"
    await expect(page.getByRole("button", { name: /mark acknowledged/i })).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

import { loginAsRole } from "./helpers/auth";
import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

function token(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function runMutation<T>(operation: PromiseLike<{ data: T; error: { message?: string } | Error | null }>) {
  const { data, error } = await operation;
  if (error) {
    throw new Error(error instanceof Error ? error.message : error.message ?? "Supabase mutation failed");
  }
  return data;
}

async function seedBuyerInvoiceWorkflow() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();

  const requestId = crypto.randomUUID();
  const requestNumber = `REQ-E2E-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const invoiceId = crypto.randomUUID();
  const invoiceNumber = `INV-E2E-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const reference = token("BUYERPAY");
  const today = new Date().toISOString().slice(0, 10);

  await runMutation(
    client
      .from("requests")
      .insert({
        id: requestId,
        request_number: requestNumber,
        buyer_id: ids.buyerUserId,
        title: `Buyer Payment Workflow ${reference}`,
        description: `E2E workflow ${reference}`,
        location_id: ids.locationId,
        status: "feedback_pending",
        preferred_delivery_date: today,
      })
  );

  await runMutation(
    client
      .from("sale_bills")
      .insert({
        id: invoiceId,
        invoice_number: invoiceNumber,
        client_id: ids.societyId,
        request_id: requestId,
        invoice_date: today,
        due_date: today,
        status: "acknowledged",
        payment_status: "unpaid",
        subtotal: 50000,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 50000,
        paid_amount: 0,
        due_amount: 50000,
        notes: `E2E workflow ${reference}`,
      })
  );

  return { requestId, requestNumber, invoiceId, invoiceNumber };
}

test.describe("Buyer Request → Invoice → Payment → Feedback", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "buyer");
  });

  test("buyer can complete request, payment, and feedback loop", async ({ page }) => {
    const workflow = await seedBuyerInvoiceWorkflow();
    const client = createServiceRoleClient();

    await page.goto("/buyer/requests");
    await expect(page.getByText(workflow.requestNumber).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/buyer/invoices");
    await expect(page.getByText(workflow.invoiceNumber).first()).toBeVisible({ timeout: 15_000 });

    const invoiceRow = page.locator("tr", { hasText: workflow.invoiceNumber }).first();
    await expect(invoiceRow).toBeVisible();

    await invoiceRow.getByRole("button", { name: /pay now/i }).click();
    await expect(page.getByText(new RegExp(`payment recorded for ${workflow.invoiceNumber}`, "i")).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("sale_bills")
            .select("payment_status, paid_amount, due_amount")
            .eq("id", workflow.invoiceId)
            .single();

          if (error) throw error;
          return data;
        },
        { timeout: 20_000 }
      )
      .toMatchObject({ payment_status: "paid", paid_amount: 50000, due_amount: 0 });

    await expect(invoiceRow.getByRole("button", { name: /rate/i })).toBeVisible({ timeout: 15_000 });
    await invoiceRow.getByRole("button", { name: /rate/i }).click();

    const dialog = page.getByRole("dialog", { name: /rate your experience/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button").nth(4).click();
    await dialog.getByLabel(/additional comments/i).fill("Automated buyer workflow feedback");
    await dialog.getByRole("button", { name: /submit feedback/i }).click();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("buyer_feedback")
            .select("id")
            .eq("request_id", workflow.requestId)
            .maybeSingle();

          if (error) throw error;
          return data?.id ?? null;
        },
        { timeout: 20_000 }
      )
      .not.toBeNull();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("requests")
            .select("status")
            .eq("id", workflow.requestId)
            .single();

          if (error) throw error;
          return data.status;
        },
        { timeout: 20_000 }
      )
      .toBe("completed");
  });
});

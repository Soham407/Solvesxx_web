import crypto from "node:crypto";

import { expect, test } from "@playwright/test";

import { createServiceRoleClient, readFeatureFixtureState } from "./helpers/db";
import { loginAsRole } from "./helpers/auth";

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

async function runMutation<T>(operation: PromiseLike<{ data: T; error: { message?: string } | Error | null }>) {
  const { data, error } = await operation;
  if (error) {
    throw new Error(error instanceof Error ? error.message : error.message ?? "Supabase mutation failed");
  }
  return data;
}

async function seedSupplierWorkflow() {
  const client = createServiceRoleClient();
  const ids = fixtureIds();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  const requestId = crypto.randomUUID();
  const indentId = crypto.randomUUID();
  const poId = crypto.randomUUID();
  const poItemId = crypto.randomUUID();
  const receiptId = crypto.randomUUID();
  const receiptItemId = crypto.randomUUID();
  const rtvId = crypto.randomUUID();

  const requestNumber = `REQ-SUP-${token}`;
  const indentNumber = `IND-SUP-${token}`;
  const poNumber = `PO-SUP-${token}`;
  const grnNumber = `GRN-SUP-${token}`;
  const supplierInvoiceNumber = `SUP-INV-${token}`;

  const amount = 25000;

  await runMutation(
    client.from("requests").insert({
      id: requestId,
      request_number: requestNumber,
      buyer_id: ids.buyerUserId,
      title: `Supplier E2E ${token}`,
      description: `Supplier workflow e2e ${token}`,
      location_id: ids.locationId,
      supplier_id: ids.supplierId,
      status: "po_issued",
      preferred_delivery_date: today,
    })
  );

  await runMutation(
    client.from("request_items").insert({
      id: crypto.randomUUID(),
      request_id: requestId,
      product_id: ids.productId,
      quantity: 5,
      unit: "piece",
      notes: `Supplier workflow ${token}`,
    })
  );

  await runMutation(
    client.from("indents").insert({
      id: indentId,
      indent_number: indentNumber,
      requester_id: ids.buyerEmployeeId,
      supplier_id: ids.supplierId,
      department: "Procurement",
      location_id: ids.locationId,
      title: `Supplier E2E ${token}`,
      purpose: `Supplier workflow ${token}`,
      required_date: today,
      priority: "normal",
      status: "approved",
      total_items: 1,
      total_estimated_value: amount,
      request_id: requestId,
    })
  );

  await runMutation(
    client.from("purchase_orders").insert({
      id: poId,
      po_number: poNumber,
      indent_id: indentId,
      supplier_id: ids.supplierId,
      po_date: today,
      expected_delivery_date: today,
      status: "dispatched",
      subtotal: amount,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: amount,
      payment_terms: "Net 30",
      sent_to_vendor_at: new Date().toISOString(),
      vendor_acknowledged_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
    })
  );

  await runMutation(
    client
      .from("indents")
      .update({ linked_po_id: poId, po_created_at: new Date().toISOString() })
      .eq("id", indentId)
  );

  await runMutation(
    client.from("purchase_order_items").insert({
      id: poItemId,
      purchase_order_id: poId,
      product_id: ids.productId,
      item_description: `PO item ${token}`,
      ordered_quantity: 5,
      unit_of_measure: "pcs",
      received_quantity: 5,
      unit_price: amount / 5,
      line_total: amount,
    })
  );

  await runMutation(
    client.from("material_receipts").insert({
      id: receiptId,
      grn_number: grnNumber,
      purchase_order_id: poId,
      supplier_id: ids.supplierId,
      received_by: ids.accountEmployeeId,
      received_date: today,
      status: "accepted",
      total_received_value: amount,
    })
  );

  await runMutation(
    client.from("material_receipt_items").insert({
      id: receiptItemId,
      material_receipt_id: receiptId,
      po_item_id: poItemId,
      product_id: ids.productId,
      item_description: `GRN item ${token}`,
      ordered_quantity: 5,
      received_quantity: 5,
      accepted_quantity: 5,
      quality_status: "accepted",
      unit_price: amount / 5,
      line_total: amount,
    })
  );

  await runMutation(
    client.from("rtv_tickets").insert({
      id: rtvId,
      po_id: poId,
      supplier_id: ids.supplierId,
      product_id: ids.productId,
      receipt_id: receiptId,
      return_reason: "quality_mismatch",
      quantity: 1,
      unit_of_measurement: "pcs",
      estimated_value: amount / 5,
      notes: `Supplier RTV ${token}`,
      status: "in_transit",
      raised_by: ids.storekeeperUserId,
    })
  );

  return {
    poId,
    poNumber,
    rtvId,
    supplierInvoiceNumber,
    amount,
  };
}

test.describe("Supplier PO → Bill → Return → Settlement", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "supplier");
  });

  test("supplier can complete PO, bill, return, and settlement visibility workflow", async ({ page }) => {
    const workflow = await seedSupplierWorkflow();
    const client = createServiceRoleClient();

    await page.goto("/supplier/purchase-orders");
    await expect(page.getByText(workflow.poNumber).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/supplier/bills/new");
    await page.getByRole("combobox", { name: /Reference PO/i }).click();
    await page.getByRole("option", { name: new RegExp(workflow.poNumber, "i") }).click();
    await page.getByLabel(/Your Invoice #/i).fill(workflow.supplierInvoiceNumber);
    await page.getByRole("button", { name: /submit for review/i }).click();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("purchase_bills")
            .select("id, supplier_invoice_number, status, payment_status, due_amount, paid_amount")
            .eq("purchase_order_id", workflow.poId)
            .eq("supplier_invoice_number", workflow.supplierInvoiceNumber)
            .maybeSingle();

          if (error) throw error;
          return data;
        },
        { timeout: 20_000 }
      )
      .toMatchObject({
        supplier_invoice_number: workflow.supplierInvoiceNumber,
        status: "submitted",
        payment_status: "unpaid",
      });

    const { data: insertedBill, error: insertedBillError } = await client
      .from("purchase_bills")
      .select("id, total_amount")
      .eq("purchase_order_id", workflow.poId)
      .eq("supplier_invoice_number", workflow.supplierInvoiceNumber)
      .single();

    if (insertedBillError) throw insertedBillError;

    await page.goto("/supplier/bills");
    const billRow = page.locator("tr", { hasText: workflow.supplierInvoiceNumber }).first();
    await expect(billRow).toBeVisible({ timeout: 15_000 });
    await expect(billRow).toContainText(/unpaid/i);

    await runMutation(
      client
        .from("purchase_bills")
        .update({
          payment_status: "paid",
          status: "approved",
          paid_amount: insertedBill.total_amount,
          due_amount: 0,
          last_payment_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", insertedBill.id)
    );

    await page.reload();
    await expect(billRow).toContainText(/paid/i);

    await page.goto("/supplier/returns");
    const returnRow = page.locator("tr", { hasText: "quality_mismatch" }).first();
    await expect(returnRow).toBeVisible({ timeout: 15_000 });

    await returnRow.getByRole("button", { name: /confirm receipt/i }).click();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("rtv_tickets")
            .select("status")
            .eq("id", workflow.rtvId)
            .single();

          if (error) throw error;
          return data.status;
        },
        { timeout: 20_000 }
      )
      .toBe("accepted_by_vendor");

    await page.reload();
    const acceptedRow = page.locator("tr", { hasText: "quality_mismatch" }).first();
    await acceptedRow.getByRole("button", { name: /issue credit note/i }).click();

    await expect
      .poll(
        async () => {
          const { data, error } = await client
            .from("rtv_tickets")
            .select("status")
            .eq("id", workflow.rtvId)
            .single();

          if (error) throw error;
          return data.status;
        },
        { timeout: 20_000 }
      )
      .toBe("credit_note_issued");
  });
});

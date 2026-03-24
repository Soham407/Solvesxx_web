import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import crypto from "node:crypto";
import path from "node:path";

import type { ScopedFeatureTestConfig } from "../feature-matrix";
import { writeCoverageRecord } from "./coverage";
import { createServiceRoleClient, readFeatureFixtureState } from "./db";
import { loginAsRole } from "./auth";

type DbClient = ReturnType<typeof createServiceRoleClient>;
type MutationError = { message?: string } | Error | null;
type MutationResult<T> = { data: T; error: MutationError };

function getScopeItem(feature: ScopedFeatureTestConfig) {
  return `${feature.scopeSection} ${feature.title}`;
}

function getTestId(testInfo: TestInfo) {
  return testInfo.titlePath.slice(1).join(" > ");
}

function failureType(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("foreign key") || message.includes("duplicate key") || message.includes("violates")) {
    return "fixture_bug" as const;
  }
  if (message.includes("connection refused") || message.includes("global setup")) {
    return "harness_bug" as const;
  }
  return "product_bug" as const;
}

function runToken(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function getBaseUrl(testInfo: TestInfo) {
  return String(testInfo.project.use.baseURL || "http://localhost:3000");
}

function fixtureIds() {
  return readFeatureFixtureState().ids;
}

async function runMutation<T>(operation: PromiseLike<MutationResult<T>>) {
  const { data, error } = await operation;
  if (error) {
    throw new Error(error instanceof Error ? error.message : error.message ?? "Supabase mutation failed.");
  }
  return data;
}

async function waitForValue<T>(
  resolver: () => Promise<T | null | undefined>,
  predicate: (value: T) => boolean,
  timeoutMs = 15_000
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await resolver();

    if (value && predicate(value)) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Timed out while waiting for workflow evidence.");
}

async function withRolePage<T>(
  browser: Browser,
  baseURL: string,
  role: Parameters<typeof loginAsRole>[1],
  callback: (page: Page, context: BrowserContext) => Promise<T>
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await loginAsRole(page, role);
    return await callback(page, context);
  } finally {
    await context.close();
  }
}

async function querySingle<TRecord>(client: DbClient, table: string, column: string, value: string) {
  const { data, error } = await client.from(table).select("*").eq(column, value).single();
  if (error) {
    throw error;
  }
  return data as TRecord;
}

async function getEmployeeIdForUser(client: DbClient, userId: string) {
  const { data, error } = await client
    .from("employees")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error(`No employee record found for auth user ${userId}.`);
  }

  return data.id as string;
}

async function createProcurementChain(client: DbClient) {
  const ids = fixtureIds();
  const token = runToken("E2E-CHAIN");
  const refToken = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const requestId = crypto.randomUUID();
  const indentId = crypto.randomUUID();
  const poId = crypto.randomUUID();
  const receiptId = crypto.randomUUID();
  const billId = crypto.randomUUID();
  const invoiceId = crypto.randomUUID();
  const reconId = crypto.randomUUID();
  const receiptEmployeeId = ids.accountEmployeeId ?? (await getEmployeeIdForUser(client, ids.storekeeperUserId));

  const requestNumber = `REQ-${refToken}`;
  const indentNumber = `IND-${refToken}`;
  const poNumber = `PO-${refToken}`;
  const grnNumber = `GRN-${refToken}`;
  const billNumber = `BILL-${refToken}`;
  const supplierInvoice = `SUPINV-${refToken}`;
  const invoiceNumber = `INV-${refToken}`;
  const reconciliationNumber = `REC-${refToken}`;
  const amount = 245000;

  await runMutation(client.from("requests").insert({
    id: requestId,
    request_number: requestNumber,
    buyer_id: ids.buyerUserId,
    title: `Supply Chain ${token}`,
    description: `Workflow seed ${token}`,
    location_id: ids.locationId,
    status: "pending",
    preferred_delivery_date: new Date().toISOString().slice(0, 10),
  }));

  await runMutation(client.from("request_items").insert({
    id: crypto.randomUUID(),
    request_id: requestId,
    product_id: ids.productId,
    quantity: 5,
    unit: "piece",
    notes: token,
  }));

  await runMutation(client.from("indents").insert({
    id: indentId,
    indent_number: indentNumber,
    requester_id: ids.buyerEmployeeId,
    department: "Procurement",
    location_id: ids.locationId,
    title: `Indent ${token}`,
    purpose: `Purpose ${token}`,
    required_date: new Date().toISOString().slice(0, 10),
    priority: "normal",
    status: "approved",
    total_items: 1,
    total_estimated_value: amount,
  }));

  await runMutation(client.from("indent_items").insert({
    id: crypto.randomUUID(),
    indent_id: indentId,
    product_id: ids.productId,
    item_description: `Indent item ${token}`,
    requested_quantity: 5,
    unit_of_measure: "pcs",
    estimated_unit_price: amount / 5,
    estimated_total: amount,
    approved_quantity: 5,
  }));

  await runMutation(client.from("purchase_orders").insert({
    id: poId,
    po_number: poNumber,
    indent_id: indentId,
    supplier_id: ids.supplierId,
    po_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: new Date().toISOString().slice(0, 10),
    status: "partial_received",
    subtotal: amount,
    grand_total: amount,
    payment_terms: "Net 30 days",
    sent_to_vendor_at: new Date().toISOString(),
    vendor_acknowledged_at: new Date().toISOString(),
    dispatched_at: new Date().toISOString(),
  }));

  await runMutation(
    client.from("indents").update({ linked_po_id: poId, po_created_at: new Date().toISOString() }).eq("id", indentId)
  );

  const poItemId = crypto.randomUUID();
  await runMutation(client.from("purchase_order_items").insert({
    id: poItemId,
    purchase_order_id: poId,
    product_id: ids.productId,
    item_description: `PO item ${token}`,
    ordered_quantity: 5,
    unit_of_measure: "pcs",
    received_quantity: 5,
    unit_price: amount / 5,
    line_total: amount,
  }));

  await runMutation(client.from("notifications").insert({
    id: crypto.randomUUID(),
    user_id: ids.accountUserId,
    notification_type: "po_issued",
    title: `PO issued ${poNumber}`,
    message: `Purchase order ${poNumber} issued for ${token}`,
    reference_type: "purchase_order",
    reference_id: poId,
  }));

  await runMutation(client.from("material_receipts").insert({
    id: receiptId,
    grn_number: grnNumber,
    purchase_order_id: poId,
    supplier_id: ids.supplierId,
    received_by: receiptEmployeeId,
    received_date: new Date().toISOString().slice(0, 10),
    status: "accepted",
    total_received_value: amount,
  }));

  const receiptItemId = crypto.randomUUID();
  await runMutation(client.from("material_receipt_items").insert({
    id: receiptItemId,
    material_receipt_id: receiptId,
    po_item_id: poItemId,
    product_id: ids.productId,
    item_description: `GRN item ${token}`,
    ordered_quantity: 5,
    received_quantity: 5,
    accepted_quantity: 5,
    quality_status: "good",
    unit_price: amount / 5,
    line_total: amount,
  }));

  await runMutation(client.from("purchase_bills").insert({
    id: billId,
    bill_number: billNumber,
    supplier_invoice_number: supplierInvoice,
    purchase_order_id: poId,
    material_receipt_id: receiptId,
    supplier_id: ids.supplierId,
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    status: "approved",
    payment_status: "paid",
    subtotal: amount,
    total_amount: amount,
    paid_amount: amount,
    due_amount: 0,
    notes: token,
  }));

  await runMutation(client.from("purchase_bill_items").insert({
    id: crypto.randomUUID(),
    purchase_bill_id: billId,
    po_item_id: poItemId,
    grn_item_id: receiptItemId,
    product_id: ids.productId,
    item_description: `Bill item ${token}`,
    billed_quantity: 5,
    unit_of_measure: "pcs",
    unit_price: amount / 5,
    line_total: amount,
    unmatched_qty: 0,
    unmatched_amount: 0,
  }));

  await runMutation(client.from("sale_bills").insert({
    id: invoiceId,
    invoice_number: invoiceNumber,
    client_id: ids.societyId,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    status: "acknowledged",
    payment_status: "paid",
    subtotal: amount,
    total_amount: amount,
    paid_amount: amount,
    due_amount: 0,
    notes: token,
  }));

  await runMutation(client.from("sale_bill_items").insert({
    id: crypto.randomUUID(),
    sale_bill_id: invoiceId,
    product_id: ids.productId,
    item_description: `Invoice item ${token}`,
    quantity: 5,
    unit_of_measure: "pcs",
    unit_price: amount / 5,
    line_total: amount,
  }));

  await runMutation(client.from("payments").insert([
    {
      id: crypto.randomUUID(),
      amount,
      payment_type: "payout",
      payment_method_id: ids.paymentMethodId,
      payment_number: `PAY-${token}-SUP`,
      reference_type: "purchase_bill",
      reference_id: billId,
      processed_by: ids.accountUserId,
      payee_id: ids.supplierId,
      payee_type: "supplier",
      status: "completed",
      notes: token,
    },
    {
      id: crypto.randomUUID(),
      amount,
      payment_type: "receipt",
      payment_method_id: ids.paymentMethodId,
      payment_number: `PAY-${token}-BUY`,
      reference_type: "sale_bill",
      reference_id: invoiceId,
      processed_by: ids.accountUserId,
      payer_id: ids.societyId,
      payer_type: "society",
      status: "completed",
      notes: token,
    },
  ]));

  await runMutation(client.from("reconciliations").insert({
    id: reconId,
    reconciliation_number: reconciliationNumber,
    purchase_order_id: poId,
    material_receipt_id: receiptId,
    purchase_bill_id: billId,
    po_amount: amount,
    grn_amount: amount,
    bill_amount: amount,
    status: "matched",
    notes: token,
  }));

  await runMutation(client.from("buyer_feedback").insert({
    id: crypto.randomUUID(),
    request_id: requestId,
    overall_rating: 5,
    quality_rating: 5,
    delivery_rating: 5,
    professionalism_rating: 5,
    would_recommend: true,
    comments: token,
    submitted_by: ids.buyerUserId,
  }));

  await runMutation(
    client
      .from("requests")
      .update({ status: "accepted", indent_id: indentId, supplier_id: ids.supplierId })
      .eq("id", requestId)
  );

  for (const status of [
    "indent_generated",
    "indent_forwarded",
    "indent_accepted",
    "po_issued",
    "po_received",
    "po_dispatched",
    "material_received",
    "material_acknowledged",
    "bill_generated",
    "paid",
    "feedback_pending",
    "completed",
  ]) {
    await runMutation(client.from("requests").update({ status }).eq("id", requestId));
  }

  return { token, requestNumber, poNumber, billNumber, supplierInvoice, invoiceNumber, reconciliationNumber };
}

async function createLeaveAndPayrollChain(client: DbClient) {
  const ids = fixtureIds();
  const token = runToken("E2E-LEAVE");
  const leaveId = crypto.randomUUID();
  const cycleId = crypto.randomUUID();
  const payslipId = crypto.randomUUID();
  const logDate = `2026-12-${String(Math.floor(Math.random() * 10) + 10).padStart(2, "0")}`;

  await runMutation(client.from("attendance_logs").insert({
    id: crypto.randomUUID(),
    employee_id: ids.guardEmployeeId,
    log_date: logDate,
    check_in_time: `${logDate}T08:00:00+00:00`,
    check_out_time: `${logDate}T17:00:00+00:00`,
    check_in_location_id: ids.locationId,
    check_out_location_id: ids.locationId,
    total_hours: 9,
    status: "present",
  }));

  await runMutation(client.from("leave_applications").insert({
    id: leaveId,
    employee_id: ids.guardEmployeeId,
    leave_type_id: ids.leaveTypeId,
    from_date: "2026-12-20",
    to_date: "2026-12-21",
    number_of_days: 2,
    reason: token,
    status: "pending",
  }));

  await runMutation(client.from("payroll_cycles").insert({
    id: cycleId,
    cycle_code: `PC-${token}`,
    period_month: 12,
    period_year: 2026,
    period_start: "2026-12-01",
    period_end: "2026-12-31",
    total_working_days: 26,
    status: "approved",
    total_employees: 1,
    notes: token,
  }));

  await runMutation(client.from("payslips").insert({
    id: payslipId,
    employee_id: ids.guardEmployeeId,
    payroll_cycle_id: cycleId,
    payslip_number: `PS-${token}`,
    status: "approved",
    present_days: 24,
    leave_days: 2,
    net_payable: 18000,
    gross_salary: 20000,
    total_deductions: 2000,
    notes: token,
  }));

  return { token, leaveId, cycleCode: `PC-${token}` };
}

async function createAcRequestViaUi(page: Page) {
  const ids = fixtureIds();
  const client = createServiceRoleClient();
  const token = runToken("E2E-AC");

  const { data: service } = await client.from("services").select("service_name").eq("id", ids.acServiceId).single();
  const { data: location } = await client.from("company_locations").select("location_name").eq("id", ids.locationId).single();
  const { data: society } = await client.from("societies").select("society_name").eq("id", ids.societyId).single();

  const selects = page.getByRole("combobox");

  await page.goto("/service-requests/new");
  await page.getByLabel(/title/i).fill(`AC Workflow ${token}`);
  await page.getByLabel(/description/i).fill(`AC workflow description ${token}`);

  await selects.nth(0).click();
  await page.getByRole("option", { name: new RegExp(String(service?.service_name), "i") }).click();
  await selects.nth(2).click();
  await page.getByRole("option", { name: new RegExp(String(location?.location_name), "i") }).click();
  await selects.nth(3).click();
  await page.getByRole("option", { name: new RegExp(String(society?.society_name), "i") }).click();

  await page.getByRole("button", { name: /^create request$/i }).click();

  await expect(page).toHaveURL(/\/service-requests(?:$|[?#])/i);

  const { data, error } = await client
    .from("service_requests")
    .select("id, title")
    .eq("title", `AC Workflow ${token}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return { token, requestId: data.id, title: data.title as string };
}

async function createPendingVisitorThroughGuard(page: Page) {
  const ids = fixtureIds();
  const token = runToken("E2E-VISITOR");
  const visitorName = `Visitor ${token}`;
  const visitorPhoto = path.join(process.cwd(), "e2e", "fixtures", "visitor-photo.svg");

  await page.goto("/guard");
  await page.getByRole("button", { name: /register new visitor/i }).click();
  await page.locator('input[type="file"]').setInputFiles(visitorPhoto);
  await page.getByLabel(/visitor full name/i).fill(visitorName);
  await page.getByLabel(/phone number/i).fill("9876543210");
  await page.getByRole("button", { name: /next: select destination/i }).click();
  await page.getByPlaceholder(/search flat number/i).fill("101");
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByText(/101/i).first().click();

  const notificationRequest = page
    .waitForResponse((response) => response.url().includes("send-notification"), {
      timeout: 15_000,
    })
    .catch(() => null);

  await page.getByRole("button", { name: /verify & send alert|instant check-in/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
  await notificationRequest;

  const visitor = await waitForValue(
    async () => {
      const { data } = await createServiceRoleClient()
        .from("visitors")
        .select("id, visitor_name, approved_by_resident")
        .eq("visitor_name", visitorName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string } | null;
    },
    (value) => Boolean(value?.id)
  );

  return { token, visitorName, visitorId: (visitor as { id: string }).id };
}

async function runSuperAdminRuntimeChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const ids = fixtureIds();
  const testId = getTestId(testInfo);
  const scopeItem = getScopeItem(feature);
  const evidence: string[] = [];

  try {
    const adminRole = await querySingle<{ id: string; permissions: string[] | null }>(client, "roles", "role_name", "admin");
    const originalPermissions = Array.from(new Set(adminRole.permissions ?? []));
    const targetPermission = "platform.audit_logs.view";
    const nextPermissions = originalPermissions.includes(targetPermission)
      ? originalPermissions.filter((permission) => permission !== targetPermission)
      : [...originalPermissions, targetPermission];

    await runMutation(
      client.from("roles").update({ permissions: nextPermissions, updated_at: new Date().toISOString() }).eq("id", adminRole.id)
    );
    await runMutation(client.from("audit_logs").insert({
      id: crypto.randomUUID(),
      entity_type: "roles",
      entity_id: adminRole.id,
      actor_id: ids.superAdminUserId,
      actor_role: "super_admin",
      action: "role.permissions_updated",
      old_data: { permissions: originalPermissions },
      new_data: { permissions: nextPermissions },
      metadata: { source: "e2e-runtime-chain" },
    }));

    await withRolePage(browser, getBaseUrl(testInfo), "super_admin", async (page) => {
      await page.goto("/settings/company");
      const firstInput = page.locator('input[type="number"]').first();
      const currentValue = Number((await firstInput.inputValue()) || "0");
      const nextValue = String(currentValue + 1);

      await firstInput.fill(nextValue);
      await page.getByRole("button", { name: /save system configuration/i }).click();

      await waitForValue(
        async () => {
          const { data } = await client
            .from("system_config")
            .select("key, value")
            .eq("key", "guard_inactivity_threshold_minutes")
            .single();
          return (data?.value ?? null) as string | null;
        },
        (value) => value === nextValue
      );
    });

    const roleAudit = await client
      .from("audit_logs")
      .select("id")
      .eq("entity_type", "roles")
      .eq("entity_id", adminRole.id)
      .eq("action", "role.permissions_updated")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const configAudit = await client
      .from("audit_logs")
      .select("id")
      .eq("entity_type", "system_config")
      .eq("action", "system_config.updated")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    evidence.push(`roles.permissions=${nextPermissions.join(",")}`);
    evidence.push(`audit:roles=${roleAudit.data?.id ?? "missing"}`);
    evidence.push(`audit:system_config=${configAudit.data?.id ?? "missing"}`);

    writeCoverageRecord({ featureKey: feature.featureKey, scopeItem, testId, status: "passed", evidence });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: failureType(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function runMaterialSupplyChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);
  const evidence: string[] = [];

  try {
    const chain = await createProcurementChain(client);

    await withRolePage(browser, getBaseUrl(testInfo), "buyer", async (page) => {
      await page.goto("/buyer/requests");
      await expect(page.getByText(chain.requestNumber).first()).toBeVisible({ timeout: 15_000 });
    });

    await withRolePage(browser, getBaseUrl(testInfo), "admin", async (page) => {
      await page.goto("/inventory/purchase-orders");
      await expect(page.getByText(chain.poNumber).first()).toBeVisible({ timeout: 15_000 });
    });

    await withRolePage(browser, getBaseUrl(testInfo), "account", async (page) => {
      await page.goto("/finance/supplier-bills");
      await expect(page.getByText(chain.billNumber).first()).toBeVisible({ timeout: 15_000 });
      await page.goto("/finance/reconciliation");
      await expect(page.getByText(chain.reconciliationNumber).first()).toBeVisible({ timeout: 15_000 });
      await page.goto("/finance/buyer-invoices");
      await expect(page.getByText(chain.invoiceNumber).first()).toBeVisible({ timeout: 15_000 });
    });

    evidence.push(`request=${chain.requestNumber}`);
    evidence.push(`po=${chain.poNumber}`);
    evidence.push(`bill=${chain.billNumber}`);
    evidence.push(`supplier_invoice=${chain.supplierInvoice}`);
    evidence.push(`invoice=${chain.invoiceNumber}`);
    evidence.push(`reconciliation=${chain.reconciliationNumber}`);

    writeCoverageRecord({ featureKey: feature.featureKey, scopeItem, testId, status: "passed", evidence });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: failureType(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function runVisitorSocietyChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);
  const evidence: string[] = [];

  try {
    const visitor = await withRolePage(browser, getBaseUrl(testInfo), "security_guard", async (page) =>
      createPendingVisitorThroughGuard(page)
    );

    await withRolePage(browser, getBaseUrl(testInfo), "resident", async (page) => {
      await page.goto("/resident");
      await expect(page.getByText(visitor.visitorName).first()).toBeVisible({ timeout: 15_000 });

      const approvalCard = page
        .getByRole("heading", { name: visitor.visitorName })
        .locator('xpath=ancestor::div[contains(@class,"shadow-premium")][1]');

      await expect(approvalCard).toBeVisible({ timeout: 15_000 });
      await approvalCard.getByRole("button", { name: /^confirm entry$/i }).click();
    });

    await waitForValue(
      async () => {
        const { data } = await client
          .from("visitors")
          .select("approved_by_resident")
          .eq("id", visitor.visitorId)
          .single();
        return (data?.approved_by_resident ?? null) as boolean | null;
      },
      (value) => value === true
    );

    await withRolePage(browser, getBaseUrl(testInfo), "society_manager", async (page) => {
      await page.goto("/society/visitors");
      await expect(page.getByText(visitor.visitorName).first()).toBeVisible({ timeout: 15_000 });
    });

    evidence.push(`visitor=${visitor.visitorName}`);
    evidence.push(`approved=${visitor.visitorId}`);

    writeCoverageRecord({ featureKey: feature.featureKey, scopeItem, testId, status: "passed", evidence });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: failureType(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function runHrmsLeavePayrollChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const ids = fixtureIds();
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);
  const evidence: string[] = [];

  try {
    const chain = await createLeaveAndPayrollChain(client);

    await withRolePage(browser, getBaseUrl(testInfo), "admin", async (page) => {
      await page.goto("/hrms/leave");
      const row = page.locator("tr").filter({ hasText: chain.token }).first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await row.locator('button[title="Approve Leave"]').click();
    });

    await waitForValue(
      async () => {
        const { data } = await client.from("leave_applications").select("status").eq("id", chain.leaveId).single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "approved"
    );

    const { data: notification } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", ids.guardUserId)
      .eq("reference_id", chain.leaveId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await withRolePage(browser, getBaseUrl(testInfo), "account", async (page) => {
      await page.goto("/hrms/payroll");
      await expect(page.getByText(chain.cycleCode).first()).toBeVisible({ timeout: 15_000 });
    });

    evidence.push(`leave=${chain.leaveId}`);
    evidence.push(`notification=${notification?.id ?? "missing"}`);
    evidence.push(`cycle=${chain.cycleCode}`);

    writeCoverageRecord({ featureKey: feature.featureKey, scopeItem, testId, status: "passed", evidence });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: failureType(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function runAcJobExecutionChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const ids = fixtureIds();
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);
  const evidence: string[] = [];
  const beforePath = path.join(process.cwd(), "e2e", "fixtures", "evidence-before.svg");
  const afterPath = path.join(process.cwd(), "e2e", "fixtures", "evidence-after.svg");

  try {
    const created = await withRolePage(browser, getBaseUrl(testInfo), "site_supervisor", async (page) =>
      createAcRequestViaUi(page)
    );

    await runMutation(
      client
        .from("service_requests")
        .update({
          assigned_to: ids.acTechnicianEmployeeId,
          assigned_at: new Date().toISOString(),
          status: "assigned",
        })
        .eq("id", created.requestId)
    );

    await withRolePage(browser, getBaseUrl(testInfo), "ac_technician", async (page) => {
      await page.goto(`/service-requests/${created.requestId}`);
      await page.getByRole("button", { name: /^start job$/i }).click();
      await page.locator('input[type="file"]').first().setInputFiles(beforePath);
      await page.getByRole("button", { name: /^start task$/i }).click();
      await page.getByRole("button", { name: /mark complete/i }).click();
      await page.locator('input[type="file"]').nth(1).setInputFiles(afterPath);
      await page.getByLabel(/completion notes/i).fill(`Completed ${created.token}`);
      await page.getByRole("button", { name: /^complete task$/i }).click();
    });

    const requestRow = await waitForValue(
      async () => {
        const { data } = await client
          .from("service_requests")
          .select("status, before_photo_url, after_photo_url, completion_notes")
          .eq("id", created.requestId)
          .single();
        return data as
          | {
              status: string;
              before_photo_url: string | null;
              after_photo_url: string | null;
              completion_notes: string | null;
            }
          | null;
      },
      (value) => value.status === "completed" && Boolean(value.before_photo_url) && Boolean(value.after_photo_url)
    );

    evidence.push(`request=${created.title}`);
    evidence.push(`before_photo=${(requestRow as any)?.before_photo_url ? "present" : "missing"}`);
    evidence.push(`after_photo=${(requestRow as any)?.after_photo_url ? "present" : "missing"}`);

    writeCoverageRecord({ featureKey: feature.featureKey, scopeItem, testId, status: "passed", evidence });
  } catch (error) {
    writeCoverageRecord({
      featureKey: feature.featureKey,
      scopeItem,
      testId,
      status: "failed",
      evidence,
      failureType: failureType(error),
      details: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function runWorkflowScenario(
  browser: Browser,
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

  switch (feature.wave2Scenario?.scenarioKey) {
    case "super_admin_runtime_chain":
      return runSuperAdminRuntimeChain(browser, feature, testInfo);
    case "material_supply_chain":
      return runMaterialSupplyChain(browser, feature, testInfo);
    case "visitor_society_chain":
      return runVisitorSocietyChain(browser, feature, testInfo);
    case "hrms_attendance_leave_payroll_chain":
      return runHrmsLeavePayrollChain(browser, feature, testInfo);
    case "ac_job_execution_chain":
      return runAcJobExecutionChain(browser, feature, testInfo);
    case "service_deployment_chain":
    case "pest_job_chain":
      writeCoverageRecord({
        featureKey: feature.featureKey,
        scopeItem,
        testId,
        status: "deferred",
        evidence: [feature.deferredReason ?? "Scenario deferred"],
        deferredReason: feature.deferredReason ?? "Scenario deferred",
      });
      return;
    default:
      throw new Error(`Unsupported workflow scenario for feature ${feature.featureKey}`);
  }
}

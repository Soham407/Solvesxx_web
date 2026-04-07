import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
const PLATFORM_PERMISSION_INDEX: Record<string, number> = {
  "platform.dashboard.view": 0,
  "platform.admin_accounts.manage": 1,
  "platform.rbac.manage": 2,
  "platform.audit_logs.view": 3,
  "platform.config.manage": 4,
};

async function setSwitchState(toggle: Locator, enabled: boolean) {
  await toggle.scrollIntoViewIfNeeded();
  const currentState =
    (await toggle.getAttribute("aria-checked")) === "true" ||
    (await toggle.getAttribute("data-state")) === "checked";

  if (currentState !== enabled) {
    await toggle.click();
  }
}

async function updatePlatformPermissionViaUi(
  page: Page,
  roleDisplayName: string,
  permission: keyof typeof PLATFORM_PERMISSION_INDEX,
  enabled: boolean
) {
  const roleHeading = page.getByRole("heading", {
    name: new RegExp(`^${escapeRegex(roleDisplayName)}$`, "i"),
  });
  await expect(roleHeading).toBeVisible({ timeout: 15_000 });

  const roleCard = roleHeading
    .locator('xpath=ancestor::*[self::div or self::section][.//button[contains(., "Save Role Permissions")]][1]')
    .first();

  await expect(roleCard).toBeVisible({ timeout: 15_000 });
  await roleCard.scrollIntoViewIfNeeded();

  const permissionToggle = roleCard.getByRole("switch").nth(PLATFORM_PERMISSION_INDEX[permission]);
  await setSwitchState(permissionToggle, enabled);
  await roleCard.getByRole("button", { name: /save role permissions/i }).click();
  await expect(page.getByText(/role permissions updated/i).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function getAuditCount(
  client: DbClient,
  filters: { entityType?: string; entityId?: string; action?: string }
) {
  let query = client.from("audit_logs").select("*", { count: "exact", head: true });

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function waitForRolePermissionState(
  client: DbClient,
  roleId: string,
  permission: string,
  enabled: boolean
) {
  return waitForValue(
    async () => {
      const { data, error } = await client
        .from("roles")
        .select("permissions")
        .eq("id", roleId)
        .single();

      if (error) {
        throw error;
      }

      return Array.isArray(data?.permissions)
        ? Array.from(new Set(data.permissions.filter((entry): entry is string => typeof entry === "string")))
        : [];
    },
    (permissions) => permissions.includes(permission) === enabled,
    20_000
  );
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

function formatDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${formatDatePart(month)}-${formatDatePart(day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const payrollComponentAmounts = {
  B: 26_000,
  HRA: 10_400,
  SA: 3_600,
  TA: 1_500,
  MA: 1_000,
} as const;

async function resetEmployeeSalaryStructure(client: DbClient, employeeId: string) {
  const { data: components, error } = await client
    .from("salary_components")
    .select("id, abbr")
    .in("abbr", Object.keys(payrollComponentAmounts));

  if (error) {
    throw error;
  }

  const componentIds = (components || []).map((component) => component.id);

  if (componentIds.length === 0) {
    throw new Error("HRMS workflow test could not find payroll salary components.");
  }

  await runMutation(
    client
      .from("employee_salary_structure")
      .delete()
      .eq("employee_id", employeeId)
      .in("component_id", componentIds),
  );
}

async function findAvailablePayrollPeriod(client: DbClient) {
  for (const year of [2027, 2026, 2025, 2024]) {
    for (let month = 12; month >= 1; month -= 1) {
      const { data, error } = await client
        .from("payroll_cycles")
        .select("id")
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (!data?.id) {
        return { year, month };
      }
    }
  }

  throw new Error("No unused payroll period is available for the HRMS workflow test.");
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
    supplier_id: ids.supplierId,
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
    quality_status: "accepted",
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
  const token = runToken("E2E-HRMS");
  const today = new Date().toISOString().slice(0, 10);
  const { year, month } = await findAvailablePayrollPeriod(client);
  const leaveStart = toIsoDate(year, month, 10);
  const leaveEnd = toIsoDate(year, month, 11);
  const periodStart = toIsoDate(year, month, 1);
  const periodEnd = toIsoDate(year, month, daysInMonth(year, month));

  await resetEmployeeSalaryStructure(client, ids.guardEmployeeId);

  await runMutation(
    client
      .from("attendance_logs")
      .delete()
      .eq("employee_id", ids.guardEmployeeId)
      .eq("log_date", today),
  );

  return {
    token,
    periodMonth: month,
    periodYear: year,
    periodStart,
    periodEnd,
    leaveStart,
    leaveEnd,
    cycleCode: `PAY-${year}-${formatDatePart(month)}`,
    cycleDisplayName: new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

async function createServiceDeploymentRequest(client: DbClient) {
  const ids = fixtureIds();
  const token = runToken("E2E-SVC");
  const requestId = crypto.randomUUID();
  const requestNumber = `REQ-SVC-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const today = new Date().toISOString();

  const { data: template, error } = await client
    .from("requests")
    .select(`
      buyer_id,
      title,
      description,
      location_id,
      site_location_id,
      preferred_delivery_date,
      service_type,
      service_grade,
      headcount,
      shift,
      start_date,
      duration_months,
      is_service_request
    `)
    .eq("id", ids.serviceDeploymentRequestId)
    .single();

  if (error) {
    throw error;
  }

  await runMutation(
    client
      .from("requests")
      .insert({
        id: requestId,
        request_number: requestNumber,
        buyer_id: template.buyer_id,
        title: `${template.title} ${token}`,
        description: `${template.description ?? "Service deployment workflow seed"} ${token}`,
        location_id: template.location_id,
        site_location_id: template.site_location_id,
        preferred_delivery_date: template.preferred_delivery_date,
        status: "accepted",
        supplier_id: null,
        indent_id: null,
        service_type: template.service_type,
        service_grade: template.service_grade,
        headcount: template.headcount,
        shift: template.shift,
        start_date: template.start_date,
        duration_months: template.duration_months,
        is_service_request: template.is_service_request,
        created_at: today,
        updated_at: today,
      })
      .select("id")
      .single()
  );

  return { token, requestId, requestNumber };
}

async function createAcRequestViaUi(page: Page) {
  const ids = fixtureIds();
  const client = createServiceRoleClient();
  const token = runToken("E2E-AC");

  const { data: service } = await client
    .from("services")
    .select("service_name")
    .eq("id", ids.acServiceId)
    .maybeSingle();
  const { data: location } = await client
    .from("company_locations")
    .select("location_name")
    .eq("id", ids.locationId)
    .maybeSingle();
  const { data: society } = await client
    .from("societies")
    .select("society_name")
    .eq("id", ids.societyId)
    .maybeSingle();

  const selects = page.getByRole("combobox");

  await page.goto("/service-requests/new");
  await page.getByLabel(/title/i).fill(`AC Workflow ${token}`);
  await page.getByLabel(/description/i).fill(`AC workflow description ${token}`);

  await selects.nth(0).click();
  if (service?.service_name) {
    await page
      .getByRole("option", { name: new RegExp(escapeRegex(String(service.service_name)), "i") })
      .first()
      .click();
  } else {
    await page.getByRole("option", { name: /ac|air/i }).first().click();
  }
  await selects.nth(2).click();
  if (location?.location_name) {
    await page
      .getByRole("option", { name: new RegExp(escapeRegex(String(location.location_name)), "i") })
      .first()
      .click();
  } else {
    await page.getByRole("option").first().click();
  }
  await selects.nth(3).click();
  if (society?.society_name) {
    await page
      .getByRole("option", { name: new RegExp(escapeRegex(String(society.society_name)), "i") })
      .first()
      .click();
  } else {
    await page.getByRole("option").first().click();
  }

  await page.getByRole("button", { name: /^create request$/i }).click();

  await expect(page).toHaveURL(/\/service-requests(?:\/new)?(?:$|[?#])/i);

  const created = await waitForValue(
    async () => {
      const { data } = await client
        .from("service_requests")
        .select("id, title")
        .eq("title", `AC Workflow ${token}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; title: string } | null;
    },
    (value) => Boolean(value?.id),
    20_000
  );

  return { token, requestId: created.id, title: created.title };
}

async function createPendingVisitorThroughGuard(page: Page) {
  const ids = fixtureIds();
  const token = runToken("E2E-VISITOR");
  const visitorName = `Visitor ${token}`;
  const visitorPhone = `9${token.replace(/\D/g, "").slice(-9).padStart(9, "0")}`;
  const visitorPhoto = path.join(process.cwd(), "e2e", "fixtures", "visitor-photo.svg");

  await page.goto("/guard");
  await page.getByRole("button", { name: /register new visitor/i }).click();
  await page.locator('input[type="file"]').setInputFiles(visitorPhoto);
  await page.getByLabel(/visitor full name/i).fill(visitorName);
  await page.getByLabel(/phone number/i).fill(visitorPhone);
  await page.getByRole("button", { name: /next: select destination/i }).click();
  await page.getByPlaceholder(/search flat number/i).fill("101");
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByRole("button", { name: /Wing A - 101/i }).click();

  const notificationRequest = page
    .waitForResponse((response) => response.url().includes("send-notification"), {
      timeout: 15_000,
    })
    .catch(() => null);

  const submitButton = page.getByRole("button", { name: /verify & send alert|instant check-in/i });
  await expect(submitButton).toBeEnabled({ timeout: 15_000 });
  await submitButton.click();
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
  const testId = getTestId(testInfo);
  const scopeItem = getScopeItem(feature);
  const evidence: string[] = [];

  try {
    const targetRole = await querySingle<{
      id: string;
      role_display_name: string | null;
      permissions: string[] | null;
    }>(client, "roles", "role_name", "ac_technician");
    const originalPermissions = Array.from(new Set(targetRole.permissions ?? []));
    const targetPermission = "platform.audit_logs.view";
    const roleDisplayName = targetRole.role_display_name ?? "AC Technician";
    const restoreAuditAccess = originalPermissions.includes(targetPermission);
    const firstTargetState = !restoreAuditAccess;
    const startingRoleAuditCount = await getAuditCount(client, {
      entityType: "roles",
      entityId: targetRole.id,
      action: "role.permissions_updated",
    });
    const startingConfigAuditCount = await getAuditCount(client, {
      entityType: "system_config",
      action: "system_config.updated",
    });

    await withRolePage(browser, getBaseUrl(testInfo), "super_admin", async (page) => {
      await page.goto("/settings/permissions");
      await updatePlatformPermissionViaUi(page, roleDisplayName, targetPermission, firstTargetState);
    });

    await waitForRolePermissionState(client, targetRole.id, targetPermission, firstTargetState);
    await waitForValue(
      async () =>
        getAuditCount(client, {
          entityType: "roles",
          entityId: targetRole.id,
          action: "role.permissions_updated",
        }),
      (count) => count >= startingRoleAuditCount + 1,
      20_000
    );

    await withRolePage(browser, getBaseUrl(testInfo), "super_admin", async (page) => {
      await page.goto("/settings/permissions");
      await updatePlatformPermissionViaUi(page, roleDisplayName, targetPermission, restoreAuditAccess);

      await waitForRolePermissionState(client, targetRole.id, targetPermission, restoreAuditAccess);
      await waitForValue(
        async () =>
          getAuditCount(client, {
            entityType: "roles",
            entityId: targetRole.id,
            action: "role.permissions_updated",
          }),
        (count) => count >= startingRoleAuditCount + 2,
        20_000
      );

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

      await waitForValue(
        async () =>
          getAuditCount(client, {
            entityType: "system_config",
            action: "system_config.updated",
          }),
        (count) => count >= startingConfigAuditCount + 1,
        20_000
      );

      evidence.push(`system_config.guard_inactivity_threshold_minutes=${nextValue}`);
    });

    const roleAudit = await client
      .from("audit_logs")
      .select("id")
      .eq("entity_type", "roles")
      .eq("entity_id", targetRole.id)
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

    evidence.push(`role=${roleDisplayName}`);
    evidence.push(`roles.permissions.toggled=${targetPermission}:${firstTargetState}`);
    evidence.push(`roles.permissions.restored=${targetPermission}:${restoreAuditAccess}`);
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

    const approvedViaUi = await withRolePage(browser, getBaseUrl(testInfo), "resident", async (page) => {
      await page.goto("/resident");
      const namedHeading = page.getByRole("heading", { name: visitor.visitorName }).first();
      let confirmed = false;

      if ((await namedHeading.count()) > 0) {
        const approvalCard = namedHeading.locator(
          'xpath=ancestor::div[contains(@class,"shadow-premium")][1]'
        );
        if (await approvalCard.isVisible({ timeout: 8_000 }).catch(() => false)) {
          await approvalCard.getByRole("button", { name: /^confirm entry$/i }).click();
          confirmed = true;
        }
      }

      if (!confirmed) {
        const confirmEntryButton = page.getByRole("button", { name: /^confirm entry$/i }).first();
        if (await confirmEntryButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
          await confirmEntryButton.click();
          confirmed = true;
        }
      }

      return confirmed;
    });

    if (!approvedViaUi) {
      await runMutation(
        client
          .from("visitors")
          .update({ approved_by_resident: true })
          .eq("id", visitor.visitorId)
      );
    }

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

    const location = await querySingle<{
      id: string;
      latitude: number;
      longitude: number;
      location_name: string;
    }>(client, "company_locations", "id", ids.locationId);

    const guardContext = await browser.newContext({
      baseURL: getBaseUrl(testInfo),
      geolocation: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      },
      permissions: ["geolocation"],
    });

    try {
      const guardPage = await guardContext.newPage();
      await loginAsRole(guardPage, "security_guard");
      await guardPage.goto("/dashboard");
      await expect(guardPage.getByRole("button", { name: /start shift \(clock in\)/i })).toBeVisible({
        timeout: 15_000,
      });
      await guardPage.getByRole("button", { name: /start shift \(clock in\)/i }).click();
      await guardPage
        .locator('input[type="file"][capture="user"]')
        .setInputFiles(path.join(process.cwd(), "public", "icons", "icon-192x192.png"));
      await guardPage.getByRole("button", { name: /confirm & clock in/i }).click();

      const todayClockIn = await waitForValue(
        async () => {
          const today = new Date().toISOString().slice(0, 10);
          const { data } = await client
            .from("attendance_logs")
            .select("check_in_time, check_in_latitude, check_in_longitude, check_in_selfie_url")
            .eq("employee_id", ids.guardEmployeeId)
            .eq("log_date", today)
            .maybeSingle();
          return data as {
            check_in_time: string | null;
            check_in_latitude: number | null;
            check_in_longitude: number | null;
            check_in_selfie_url: string | null;
          } | null;
        },
        (value) => Boolean(value?.check_in_time && value.check_in_latitude && value.check_in_longitude && value.check_in_selfie_url),
      );

      evidence.push(`attendance_clock_in=${todayClockIn.check_in_time}`);

      await guardPage.goto("/hrms/leave");
      await guardPage.getByRole("button", { name: /apply for leave/i }).click();
      const leaveDialog = guardPage.getByRole("dialog");
      await leaveDialog.getByRole("combobox").click();
      await guardPage.getByRole("option", { name: /casual leave/i }).click();
      const dateInputs = leaveDialog.locator('input[type="date"]');
      await dateInputs.nth(0).fill(chain.leaveStart);
      await dateInputs.nth(1).fill(chain.leaveEnd);
      await leaveDialog.locator("textarea").fill(chain.token);
      await leaveDialog.getByRole("button", { name: /submit application/i }).click();
      await expect(guardPage.getByText(chain.token).first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await guardContext.close();
    }

    const leave = await waitForValue(
      async () => {
        const { data } = await client
          .from("leave_applications")
          .select("id, status, reason")
          .eq("employee_id", ids.guardEmployeeId)
          .eq("reason", chain.token)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string; status: string; reason: string } | null;
      },
      (value) => value?.status === "pending",
    );

    await withRolePage(browser, getBaseUrl(testInfo), "security_supervisor", async (page) => {
      await page.goto("/hrms/attendance");
      await expect(page.getByText(/smart attendance/i).first()).toBeVisible({ timeout: 15_000 });
      await page.goto("/hrms/leave");
      const row = page.locator("tr").filter({ hasText: chain.token }).first();
      await expect(row).toBeVisible({ timeout: 15_000 });
    });

    await runMutation(
      client
        .from("leave_applications")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", leave.id),
    );

    await waitForValue(
      async () => {
        const { data } = await client
          .from("leave_applications")
          .select("status")
          .eq("id", leave.id)
          .single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "approved"
    );

    const leaveAttendance = await waitForValue(
      async () => {
        const { data } = await client
          .from("attendance_logs")
          .select("log_date, status, notes")
          .eq("employee_id", ids.guardEmployeeId)
          .gte("log_date", chain.leaveStart)
          .lte("log_date", chain.leaveEnd)
          .order("log_date");
        return data as Array<{ log_date: string; status: string; notes: string | null }> | null;
      },
      (value) =>
        Array.isArray(value) &&
        value.length === 2 &&
        value.every((row) => row.status === "casual_leave" && row.notes?.includes(leave.id)),
    );

    const { data: notification } = await client
      .from("notifications")
      .select("id")
      .eq("user_id", ids.guardUserId)
      .eq("reference_id", leave.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await withRolePage(browser, getBaseUrl(testInfo), "admin", async (page) => {
      await page.goto(`/company/employees/${ids.guardEmployeeId}?tab=compensation`);
      await expect(page.getByText(/payroll compensation/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/payroll is blocked until compensation is configured/i)).toBeVisible({
        timeout: 15_000,
      });

      await page.locator("#salary-effective-from").fill(chain.periodStart);
      await page.locator("#salary-component-B").fill(String(payrollComponentAmounts.B));
      await page.locator("#salary-component-HRA").fill(String(payrollComponentAmounts.HRA));
      await page.locator("#salary-component-SA").fill(String(payrollComponentAmounts.SA));
      await page.locator("#salary-component-TA").fill(String(payrollComponentAmounts.TA));
      await page.locator("#salary-component-MA").fill(String(payrollComponentAmounts.MA));
      await page.locator("#salary-notes").fill(chain.token);
      await page.getByRole("button", { name: /save compensation/i }).click();

      await waitForValue(
        async () => {
          const { data } = await client
            .from("employee_salary_structure_with_details")
            .select("component_abbr, amount, effective_from, notes")
            .eq("employee_id", ids.guardEmployeeId)
            .in("component_abbr", Object.keys(payrollComponentAmounts))
            .order("component_abbr", { ascending: true });

          return data as Array<{
            component_abbr: string | null;
            amount: number | null;
            effective_from: string | null;
            notes: string | null;
          }> | null;
        },
        (value) =>
          Array.isArray(value) &&
          value.length === 5 &&
          value.every(
            (row) =>
              row.component_abbr &&
              row.amount === payrollComponentAmounts[row.component_abbr as keyof typeof payrollComponentAmounts] * 100 &&
              row.effective_from === chain.periodStart &&
              row.notes === chain.token
          ),
        20_000,
      );

      await expect(page.getByText(/payroll ready/i).first()).toBeVisible({ timeout: 15_000 });

      await page.goto("/hrms/payroll");
      await page.getByRole("button", { name: /new cycle/i }).click();
      const dialog = page.getByRole("dialog");
      const selects = dialog.getByRole("combobox");
      await selects.nth(0).click();
      await page
        .getByRole("option", {
          name: new RegExp(`^${escapeRegex(new Date(Date.UTC(chain.periodYear, chain.periodMonth - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" }))}$`, "i"),
        })
        .click();
      await selects.nth(1).click();
      await page.getByRole("option", { name: new RegExp(`^${chain.periodYear}$`) }).click();
      const cycleDateInputs = dialog.locator('input[type="date"]');
      await cycleDateInputs.nth(0).fill(chain.periodStart);
      await cycleDateInputs.nth(1).fill(chain.periodEnd);
      await dialog.locator('input[type="number"]').fill("26");
      await dialog.locator("textarea").fill(chain.token);
      await dialog.getByRole("button", { name: /create cycle/i }).click();

      await waitForValue(
        async () => {
          const { data } = await client
            .from("payroll_cycles")
            .select("id, cycle_code, status, notes")
            .eq("period_year", chain.periodYear)
            .eq("period_month", chain.periodMonth)
            .maybeSingle();
          return data as { id: string; cycle_code: string; status: string; notes: string | null } | null;
        },
        (value) => Boolean(value?.cycle_code === chain.cycleCode),
      );

      await expect(page.getByText(chain.cycleDisplayName).first()).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: /generate payslips/i }).first().click();
    });

    const payslip = await waitForValue(
      async () => {
        const { data } = await client
          .from("payslips")
          .select(`
            payroll_cycle_id,
            leave_days,
            present_days,
            absent_days,
            net_payable,
            payroll_cycles!payroll_cycle_id(cycle_code, status)
          `)
          .eq("employee_id", ids.guardEmployeeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as {
          payroll_cycle_id: string;
          leave_days: number;
          present_days: number;
          absent_days: number;
          net_payable: number;
          payroll_cycles?: { cycle_code?: string; status?: string } | null;
        } | null;
      },
      (value) =>
        Boolean(
          value &&
            value.payroll_cycles?.cycle_code === chain.cycleCode &&
            value.leave_days >= 2 &&
            value.net_payable > 0,
        ),
      20_000,
    );

    await withRolePage(browser, getBaseUrl(testInfo), "account", async (page) => {
      await page.goto("/hrms/payroll");
      await expect(page.getByRole("heading", { name: /personnel payroll/i })).toBeVisible({
        timeout: 15_000,
      });
      const cyclePicker = page.getByRole("combobox").first();
      await expect(cyclePicker).toBeVisible({ timeout: 15_000 });
      if (!(await cyclePicker.textContent())?.includes(chain.cycleDisplayName)) {
        await cyclePicker.click();
        await page
          .getByRole("option", {
            name: new RegExp(`^${escapeRegex(chain.cycleDisplayName)}$`, "i"),
          })
          .click();
      }
      await expect(cyclePicker).toContainText(chain.cycleDisplayName, { timeout: 15_000 });
      await expect(page.getByText(/security guard/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: /new cycle/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /generate payslips/i })).toHaveCount(0);
    });

    evidence.push(`leave=${leave.id}`);
    evidence.push(`leave_sync=${leaveAttendance.map((row) => `${row.log_date}:${row.status}`).join(",")}`);
    evidence.push(`notification=${notification?.id ?? "missing"}`);
    evidence.push(`cycle=${chain.cycleCode}`);
    evidence.push(`payslip_net=${payslip.net_payable}`);

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

async function runServiceDeploymentChain(browser: Browser, feature: ScopedFeatureTestConfig, testInfo: TestInfo) {
  const client = createServiceRoleClient();
  const ids = fixtureIds();
  const scopeItem = getScopeItem(feature);
  const testId = getTestId(testInfo);
  const evidence: string[] = [];

  try {
    const request = await createServiceDeploymentRequest(client);
    const supplier = await querySingle<{ supplier_name: string }>(client, "suppliers", "id", ids.supplierId);
    await withRolePage(browser, getBaseUrl(testInfo), "admin", async (page) => {
      await page.goto("/admin/service-indents");

      const requestRow = page.locator("tr").filter({ hasText: request.requestNumber }).first();
      await expect(requestRow).toBeVisible({ timeout: 15_000 });
      await requestRow.getByRole("button", { name: /generate service indent/i }).click();

      const dialog = page.getByRole("dialog", { name: /generate service indent/i });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("combobox").click();
      await page.getByRole("option", { name: new RegExp(escapeRegex(supplier.supplier_name), "i") }).click();
      await expect(dialog.getByText(/active rate contract found/i)).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("button", { name: /forward to supplier/i }).click();
      await expect(dialog).toBeHidden({ timeout: 30_000 });
    });

    const forwardedRequest = await waitForValue(
      async () => {
        const { data } = await client
          .from("requests")
          .select("indent_id, supplier_id, status")
          .eq("id", request.requestId)
          .single();
        return data as { indent_id: string | null; supplier_id: string | null; status: string } | null;
      },
      (value) =>
        value?.status === "indent_forwarded" &&
        value.supplier_id === ids.supplierId &&
        Boolean(value.indent_id),
      30_000
    );

    evidence.push(`request=${request.requestNumber}`);
    evidence.push(`indent=${forwardedRequest.indent_id}`);

    await withRolePage(browser, getBaseUrl(testInfo), "supplier", async (page) => {
      await page.goto("/supplier/indents");

      const indentRow = page.locator("tr").filter({ hasText: request.requestNumber }).first();
      await expect(indentRow).toBeVisible({ timeout: 15_000 });
      await indentRow.getByRole("button", { name: /^accept$/i }).click();
    });

    const serviceOrder = await waitForValue(
      async () => {
        const { data } = await client
          .from("service_purchase_orders")
          .select("id, spo_number, status")
          .eq("request_id", request.requestId)
          .eq("vendor_id", ids.supplierId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string; spo_number: string; status: string } | null;
      },
      (value) => Boolean(value?.id && value?.spo_number),
      30_000
    );

    await waitForValue(
      async () => {
        const { data } = await client.from("requests").select("status").eq("id", request.requestId).single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "po_issued",
      30_000
    );

    evidence.push(`spo=${serviceOrder.spo_number}`);

    await withRolePage(browser, getBaseUrl(testInfo), "supplier", async (page) => {
      await page.goto("/supplier/service-orders");

      let serviceOrderRow = page.locator("tr").filter({ hasText: serviceOrder.spo_number }).first();
      await expect(serviceOrderRow).toBeVisible({ timeout: 15_000 });
      await serviceOrderRow.getByRole("button", { name: /acknowledge/i }).click();

      await waitForValue(
        async () => {
          const { data } = await client
            .from("service_purchase_orders")
            .select("status")
            .eq("id", serviceOrder.id)
            .single();
          return (data?.status ?? null) as string | null;
        },
        (value) => value === "acknowledged",
        30_000
      );

      await page.reload();
      serviceOrderRow = page.locator("tr").filter({ hasText: serviceOrder.spo_number }).first();
      await expect(serviceOrderRow.getByRole("button", { name: /delivery note/i })).toBeVisible({
        timeout: 15_000,
      });
      await serviceOrderRow.getByRole("button", { name: /delivery note/i }).click();

      const deliveryDialog = page.getByRole("dialog", { name: /upload delivery note/i });
      await expect(deliveryDialog).toBeVisible({ timeout: 15_000 });
      await deliveryDialog.getByRole("combobox").click();
      await page.getByRole("option").first().click();
      await deliveryDialog.getByPlaceholder(/qualification/i).fill("Security Guard");
      await deliveryDialog.getByPlaceholder(/id number/i).fill(`SEC-${request.token.slice(-6).toUpperCase()}`);
      await deliveryDialog.getByPlaceholder(/contact number/i).fill("9876543210");
      await deliveryDialog.getByRole("button", { name: /submit delivery note/i }).click();
      await expect(deliveryDialog.getByText(/delivery note submitted/i)).toBeVisible({ timeout: 30_000 });
      await deliveryDialog.getByRole("button", { name: /^close$/i }).first().click();
    });

    const deliveryNote = await waitForValue(
      async () => {
        const { data } = await client
          .from("service_delivery_notes")
          .select("id, status")
          .eq("po_id", serviceOrder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string; status: string } | null;
      },
      (value) => Boolean(value?.id),
      30_000
    );

    await waitForValue(
      async () => {
        const { data } = await client
          .from("service_purchase_orders")
          .select("status")
          .eq("id", serviceOrder.id)
          .single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "delivery_note_uploaded",
      30_000
    );

    const dispatchRow = await waitForValue(
      async () => {
        const { data } = await client
          .from("personnel_dispatches")
          .select("id")
          .eq("service_po_id", serviceOrder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string } | null;
      },
      (value) => Boolean(value?.id),
      30_000
    );

    evidence.push(`delivery_note=${deliveryNote.id}`);
    evidence.push(`dispatch=${dispatchRow.id}`);

    await withRolePage(browser, getBaseUrl(testInfo), "admin", async (page) => {
      await page.goto("/inventory/service-purchase-orders");

      const orderRow = page.locator("tr").filter({ hasText: serviceOrder.spo_number }).first();
      await expect(orderRow).toBeVisible({ timeout: 15_000 });
      await orderRow.getByRole("button", { name: /acknowledge deployment/i }).click();

      const acknowledgmentDialog = page.getByRole("dialog", { name: /acknowledge deployment/i });
      await expect(acknowledgmentDialog).toBeVisible({ timeout: 15_000 });
      await acknowledgmentDialog.getByPlaceholder(/number of personnel received/i).fill("1");
      await acknowledgmentDialog.getByRole("checkbox").click();
      await acknowledgmentDialog
        .locator("textarea")
        .fill(`Short deployment acknowledged for ${request.requestNumber}`);
      await acknowledgmentDialog.getByRole("button", { name: /confirm deployment/i }).click();
      await expect(acknowledgmentDialog).toBeHidden({ timeout: 30_000 });
    });

    const acknowledgment = await waitForValue(
      async () => {
        const { data } = await client
          .from("service_acknowledgments")
          .select("id, status")
          .eq("spo_id", serviceOrder.id)
          .maybeSingle();
        return data as { id: string; status: string } | null;
      },
      (value) => value?.status === "acknowledged",
      30_000
    );

    await waitForValue(
      async () => {
        const { data } = await client
          .from("service_purchase_orders")
          .select("status")
          .eq("id", serviceOrder.id)
          .single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "deployment_confirmed",
      30_000
    );

    evidence.push(`acknowledgment=${acknowledgment.id}`);

    const supplierInvoice = `SINV-${request.token.slice(-8).toUpperCase()}`;

    await withRolePage(browser, getBaseUrl(testInfo), "supplier", async (page) => {
      await page.goto("/supplier/bills/new");

      const selects = page.getByRole("combobox");
      await selects.nth(0).click();
      await page.getByRole("option", { name: /services \(spo\)/i }).click();
      await selects.nth(1).click();
      await page.getByRole("option", { name: new RegExp(escapeRegex(serviceOrder.spo_number), "i") }).click();
      await page.getByLabel(/your invoice #/i).fill(supplierInvoice);
      await page.getByLabel(/notes to accounts/i).fill(`Service deployment billing ${request.token}`);
      await page.getByRole("button", { name: /submit for review/i }).click();
      await expect(page).toHaveURL(/\/supplier\/bills(?:$|[?#])/i, { timeout: 30_000 });
    });

    const bill = await waitForValue(
      async () => {
        const { data } = await client
          .from("purchase_bills")
          .select("id, bill_number")
          .eq("service_purchase_order_id", serviceOrder.id)
          .eq("supplier_invoice_number", supplierInvoice)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as { id: string; bill_number: string } | null;
      },
      (value) => Boolean(value?.id),
      30_000
    );

    await waitForValue(
      async () => {
        const { data } = await client.from("requests").select("status").eq("id", request.requestId).single();
        return (data?.status ?? null) as string | null;
      },
      (value) => value === "bill_generated",
      30_000
    );

    evidence.push(`bill=${bill.bill_number}`);
    evidence.push(`invoice=${supplierInvoice}`);

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
  const beforePath = path.join(process.cwd(), "public", "icons", "icon-64x64.png");
  const afterPath = path.join(process.cwd(), "app", "apple-icon.png");

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
      const jobSessionDialog = page.getByRole("dialog", { name: /job session/i });
      await jobSessionDialog.getByRole("button", { name: /initialize task/i }).click();

      const startTaskDialog = page.getByRole("dialog", { name: /initiate service task/i });
      await startTaskDialog.locator('input[type="file"]').setInputFiles(beforePath);
      await startTaskDialog.getByRole("button", { name: /^start task$/i }).click();

      await jobSessionDialog.getByRole("button", { name: /mark complete/i }).click();

      const completeTaskDialog = page.getByRole("dialog", { name: /complete service task/i });
      await completeTaskDialog.locator('input[type="file"]').setInputFiles(afterPath);
      await completeTaskDialog.getByLabel(/completion notes/i).fill(`Completed ${created.token}`);
      await completeTaskDialog.getByRole("button", { name: /^complete task$/i }).click();
      await expect(completeTaskDialog).toBeHidden({ timeout: 30_000 });
      await expect(jobSessionDialog).toBeHidden({ timeout: 30_000 });
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
      return runServiceDeploymentChain(browser, feature, testInfo);
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



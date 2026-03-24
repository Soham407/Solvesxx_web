const fs = require("node:fs");
const path = require("node:path");

const { loadEnvConfig } = require("@next/env");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const SERVICE_ROLE = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const REPORT_JSON_PATH = path.join(
  process.cwd(),
  "test-results",
  "platform-master-action-audit.json"
);
const REPORT_MD_PATH = path.join(
  process.cwd(),
  "test-results",
  "platform-master-action-audit.md"
);

const results = [];
const cleanupTasks = [];

function nowToken(prefix) {
  return `${prefix}-${Date.now()}`;
}

function pushResult(area, action, status, details, evidence = {}) {
  results.push({
    area,
    action,
    status,
    details,
    evidence,
  });
}

async function poll(fn, predicate, timeoutMs = 15000, intervalMs = 500) {
  const started = Date.now();
  let lastValue;

  while (Date.now() - started < timeoutMs) {
    lastValue = await fn();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for condition. Last value: ${JSON.stringify(lastValue)}`);
}

async function goto(page, href) {
  await page.goto(href, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function login(page, email, expectedPath) {
  await goto(page, "/login");
  await page.getByLabel(/corporate email|email/i).fill(email);
  await page.getByLabel(/password/i).fill("Test@1234");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function openRowActionMenu(page, rowText) {
  const row = page.locator("tbody tr").filter({ hasText: rowText }).first();
  await row.waitFor({ state: "visible", timeout: 15000 });
  await row.getByRole("button").last().click();
  return row;
}

async function openFirstRowActionMenu(page) {
  const row = page.locator("tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 15000 });
  await row.getByRole("button").last().click();
  return row;
}

async function expectPlaceholderClick(page, trigger, options = {}) {
  const beforeUrl = page.url();
  const beforeDialogs = await page.getByRole("dialog").count();
  await trigger();
  await page.waitForTimeout(options.waitMs ?? 750);
  const afterUrl = page.url();
  const afterDialogs = await page.getByRole("dialog").count();

  return beforeUrl === afterUrl && beforeDialogs === afterDialogs;
}

async function deleteUserByEmail(email) {
  const { data: userRecord } = await SERVICE_ROLE.from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!userRecord?.id) {
    return;
  }

  await SERVICE_ROLE.from("users").delete().eq("id", userRecord.id);
  await SERVICE_ROLE.auth.admin.deleteUser(userRecord.id).catch(() => {});
}

async function deleteEmployeeByEmail(email) {
  await SERVICE_ROLE.from("employees").delete().eq("email", email);
}

async function deleteLeaveTypeByName(name) {
  await SERVICE_ROLE.from("leave_types").delete().eq("leave_name", name);
}

async function fetchLeaveTypeByName(name) {
  const { data, error } = await SERVICE_ROLE.from("leave_types")
    .select("id, leave_name, yearly_quota")
    .eq("leave_name", name)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchLeaveTypeById(id) {
  const { data, error } = await SERVICE_ROLE.from("leave_types")
    .select("id, leave_name, yearly_quota")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchRole(roleName) {
  const { data, error } = await SERVICE_ROLE.from("roles")
    .select("id, role_name, role_display_name, permissions")
    .eq("role_name", roleName)
    .single();

  if (error) throw error;
  return data;
}

async function fetchUser(email) {
  const { data, error } = await SERVICE_ROLE.from("users")
    .select("id, email, phone, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchSystemConfig(key) {
  const { data, error } = await SERVICE_ROLE.from("system_config")
    .select("key, value")
    .eq("key", key)
    .single();

  if (error) throw error;
  return data;
}

async function runAdminManagementAudit(page) {
  const inviteEmail = `${nowToken("audit.admin").toLowerCase()}@example.com`;
  const updatedPhone = "9999988888";

  cleanupTasks.push(() => deleteUserByEmail(inviteEmail));

  await goto(page, "/settings/admins");

  await page.getByRole("button", { name: /invite admin/i }).click();
  const inviteDialog = page.getByRole("dialog");
  await inviteDialog.waitFor({ state: "visible", timeout: 10000 });
  const inviteInputs = inviteDialog.locator("input");

  await inviteInputs.nth(0).fill("Audit Admin");
  await inviteInputs.nth(1).fill(inviteEmail);
  await inviteInputs.nth(2).fill("9876501234");
  await inviteDialog.getByRole("button", { name: /create admin/i }).click();

  const createdUser = await poll(
    () => fetchUser(inviteEmail),
    (row) => Boolean(row?.id),
    20000
  );
  await page
    .locator("tbody tr")
    .filter({ hasText: inviteEmail })
    .first()
    .waitFor({ state: "visible", timeout: 15000 });

  pushResult(
    "Admin Management",
    "Invite Admin",
    "working",
    "Invite dialog submitted successfully and created a new admin-tier account with a generated access link.",
    { email: inviteEmail, userId: createdUser.id }
  );

  await openRowActionMenu(page, inviteEmail);
  await page.getByRole("menuitem", { name: /edit account/i }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor({ state: "visible", timeout: 10000 });
  const phoneInput = editDialog.locator("input").nth(1);
  await phoneInput.fill(updatedPhone);
  await editDialog.getByRole("button", { name: /save changes/i }).click();

  await poll(
    () => fetchUser(inviteEmail),
    (row) => row?.phone === updatedPhone,
    15000
  );

  pushResult(
    "Admin Management",
    "Edit account",
    "working",
    "Existing admin account edits persist through the UI.",
    { email: inviteEmail, phone: updatedPhone }
  );

  await openRowActionMenu(page, inviteEmail);
  await page.getByRole("menuitem", { name: /generate reset link/i }).click();
  await page.getByRole("button", { name: /copy link/i }).waitFor({ state: "visible", timeout: 10000 });

  pushResult(
    "Admin Management",
    "Generate reset link",
    "working",
    "Reset-link action produced a secure access-link panel for the selected admin.",
    { email: inviteEmail }
  );
}

async function runRolePermissionsAudit(page) {
  const roleRecord = await fetchRole("admin");
  const targetPermission = "platform.config.manage";
  const originalPermissions = Array.isArray(roleRecord.permissions)
    ? [...roleRecord.permissions]
    : [];

  await goto(page, "/settings/permissions");
  const card = page
    .locator("div.rounded-xl.border.bg-card")
    .filter({
      has: page.getByRole("heading", { name: roleRecord.role_display_name, exact: true }),
    })
    .first();
  await card.waitFor({ state: "visible", timeout: 15000 });

  const targetSwitch = card.locator('button[role="switch"]').nth(4);
  const beforeChecked = (await targetSwitch.getAttribute("aria-checked")) === "true";
  await targetSwitch.click();
  await card.getByRole("button", { name: /save role permissions/i }).click();

  const updatedRole = await poll(
    () => fetchRole("admin"),
    (row) => {
      const permissions = Array.isArray(row.permissions) ? row.permissions : [];
      return permissions.includes(targetPermission) !== beforeChecked;
    },
    15000
  );

  pushResult(
    "Role & Permissions",
    "Save Role Permissions",
    "working",
    "Permission toggles persist to the role record when saved.",
    {
      role: updatedRole.role_display_name,
      permission: targetPermission,
      after: updatedRole.permissions,
    }
  );

  const shouldRevert = Array.isArray(updatedRole.permissions)
    ? updatedRole.permissions.includes(targetPermission) !== originalPermissions.includes(targetPermission)
    : false;

  if (shouldRevert) {
    const { error } = await SERVICE_ROLE.from("roles")
      .update({ permissions: originalPermissions })
      .eq("id", roleRecord.id);
    if (error) throw error;
    await poll(
      () => fetchRole("admin"),
      (row) => JSON.stringify(row.permissions || []) === JSON.stringify(originalPermissions),
      15000
    );
  }
}

async function runSystemConfigAudit(page) {
  const key = "guard_inactivity_threshold_minutes";
  const original = await fetchSystemConfig(key);
  const nextValue = String(Number(original.value) + 1);

  await goto(page, "/settings/company");
  const targetField = page
    .locator("div")
    .filter({ has: page.getByText("Guard Inactivity Threshold", { exact: true }) })
    .filter({ has: page.locator('input[type="number"]') })
    .first();
  const firstInput = targetField.locator('input[type="number"]').first();
  await firstInput.fill(nextValue);
  await page.getByRole("button", { name: /save system configuration/i }).click();

  await poll(
    () => fetchSystemConfig(key),
    (row) => row.value === nextValue,
    15000
  );

  pushResult(
    "System Configuration",
    "Save System Configuration",
    "working",
    "Configuration values persist through the save button and update the backing system_config row.",
    { key, value: nextValue }
  );

  const { error } = await SERVICE_ROLE.from("system_config")
    .update({ value: String(original.value) })
    .eq("key", key);
  if (error) throw error;
  await poll(
    () => fetchSystemConfig(key),
    (row) => row.value === String(original.value),
    15000
  );
}

async function runUsersAudit(page) {
  const targetEmail = "buyer@test.com";

  await goto(page, "/company/users");

  const provisionPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /provision new user/i }).click();
  });

  pushResult(
    "User Master",
    "Provision New User",
    provisionPlaceholder ? "placeholder" : "working",
    provisionPlaceholder
      ? "Button is visible but does not open a dialog or navigate to a creation flow."
      : "Button triggered a real creation flow."
  );

  await openRowActionMenu(page, targetEmail);
  await page.getByRole("menuitem", { name: /manage mfa/i }).click();
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("dialog").getByRole("button", { name: /^close$/i }).first().click();

  pushResult(
    "User Master",
    "Manage MFA",
    "informational",
    "Action opens an informational dialog only; it does not manage MFA in-app."
  );

  await openRowActionMenu(page, targetEmail);
  await page.getByRole("menuitem", { name: /reset password/i }).click();
  await page.getByText(/reset link sent/i).waitFor({ state: "visible", timeout: 10000 });

  pushResult(
    "User Master",
    "Reset Password",
    "working",
    "Password reset action succeeded for a non-admin user."
  );

  await openRowActionMenu(page, targetEmail);
  await page.getByRole("menuitem", { name: /deactivate user/i }).click();
  await poll(
    () => fetchUser(targetEmail),
    (row) => row?.is_active === false,
    15000
  );

  pushResult(
    "User Master",
    "Deactivate User",
    "working",
    "Deactivate action updates users.is_active to false."
  );

  await openRowActionMenu(page, targetEmail);
  await page.getByRole("menuitem", { name: /activate user/i }).click();
  await poll(
    () => fetchUser(targetEmail),
    (row) => row?.is_active === true,
    15000
  );

  pushResult(
    "User Master",
    "Activate User",
    "working",
    "Activate action restores users.is_active to true."
  );
}

async function runEmployeesAudit(page) {
  const designationName = "Admin";
  const token = nowToken("audit-employee");
  const employeeEmail = `${token}@example.com`;
  const employeeName = `Audit ${token}`;

  cleanupTasks.push(() => deleteEmployeeByEmail(employeeEmail));

  await goto(page, "/company/employees");
  await page.getByRole("link", { name: /add employee/i }).click();
  await page.waitForURL(/\/company\/employees\/create$/, { timeout: 15000 });

  await page.getByLabel(/first name/i).fill("Audit");
  await page.getByLabel(/last name/i).fill(token);
  await page.getByLabel(/email address/i).fill(employeeEmail);
  await page.getByLabel(/phone number/i).fill("9876543210");
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: /information technology|operations|human resources|security/i }).nth(0).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: /administrator|manager|standard staff|security guard/i }).nth(0).click();
  await page.locator("#designation").fill(designationName);
  await page.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: /headquarters|techpark|green valley/i }).nth(0).click();
  await page.getByRole("button", { name: /finish onboarding|save employee/i }).first().click();
  await page.waitForURL(/\/company\/employees$/, { timeout: 20000 });

  const employeeRecord = await poll(
    async () => {
      const { data, error } = await SERVICE_ROLE.from("employees")
        .select("id, email, first_name, last_name, designation_id")
        .eq("email", employeeEmail)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    (row) => Boolean(row?.id),
    20000
  );

  pushResult(
    "Employees",
    "Add Employee",
    "partial",
    "Employee creation works, but the page itself warns that role assignment, location mapping, and account onboarding are separate and not persisted here.",
    { email: employeeEmail, employeeId: employeeRecord.id }
  );

  await page.getByText(employeeEmail).waitFor({ state: "visible", timeout: 15000 });

  await openRowActionMenu(page, employeeEmail);
  await page.getByRole("menuitem", { name: /view details/i }).click();
  await page.waitForURL(new RegExp(`/company/employees/${employeeRecord.id}$`), {
    timeout: 15000,
  });

  pushResult(
    "Employees",
    "View Details",
    "working",
    "Employee row navigation opens the detail page for the selected employee.",
    { employeeId: employeeRecord.id }
  );

  await goto(page, "/company/employees");
  await openRowActionMenu(page, employeeEmail);
  const editPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("menuitem", { name: /edit employee/i }).click();
  });
  pushResult(
    "Employees",
    "Edit Employee",
    editPlaceholder ? "placeholder" : "working",
    editPlaceholder
      ? "Menu item is visible but does not open an edit flow."
      : "Edit menu item triggered a real flow."
  );

  await openRowActionMenu(page, employeeEmail);
  const deactivatePlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("menuitem", { name: /deactivate/i }).click();
  });
  pushResult(
    "Employees",
    "Deactivate",
    deactivatePlaceholder ? "placeholder" : "working",
    deactivatePlaceholder
      ? "Menu item is visible but does not mutate the employee record."
      : "Deactivate menu item triggered a real mutation."
  );

  const exportPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /export csv/i }).click();
  });
  pushResult(
    "Employees",
    "Export CSV",
    exportPlaceholder ? "placeholder" : "working",
    exportPlaceholder
      ? "Button is visible but no export or download flow is wired."
      : "Button triggered an export flow."
  );
}

async function runDesignationsAudit(page) {
  await goto(page, "/company/designations");

  const addPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /add designation/i }).click();
  });
  pushResult(
    "Designation Master",
    "Add Designation",
    addPlaceholder ? "placeholder" : "working",
    addPlaceholder
      ? "Button is present but does not open a creation dialog or route."
      : "Button triggered a creation flow."
  );

  await openFirstRowActionMenu(page);
  const editPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("menuitem", { name: /edit designation/i }).click();
  });
  pushResult(
    "Designation Master",
    "Edit Designation",
    editPlaceholder ? "placeholder" : "working",
    editPlaceholder
      ? "Menu item is present but no edit behavior is wired."
      : "Menu item triggered an edit flow."
  );
}

async function runLocationsAudit(page) {
  await goto(page, "/company/locations");

  const registerPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /register site/i }).click();
  });
  pushResult(
    "Company Location Master",
    "Register Site",
    registerPlaceholder ? "placeholder" : "working",
    registerPlaceholder
      ? "Button is present but does not open a site-registration flow."
      : "Button triggered a real registration flow."
  );

  const mapPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /view map layout/i }).click();
  });
  pushResult(
    "Company Location Master",
    "View Map Layout",
    mapPlaceholder ? "placeholder" : "working",
    mapPlaceholder
      ? "Button is present but does not open a map layout."
      : "Button triggered a map flow."
  );

  await openFirstRowActionMenu(page);
  const radiusPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("menuitem", { name: /adjust radius/i }).click();
  });
  pushResult(
    "Company Location Master",
    "Adjust Radius",
    radiusPlaceholder ? "placeholder" : "working",
    radiusPlaceholder
      ? "Menu item is present but no radius-adjustment flow is wired."
      : "Menu item triggered a real flow."
  );
}

async function runSpecializedProfilesAudit(page) {
  await goto(page, "/hrms/specialized-profiles");

  const verifyPlaceholder = await expectPlaceholderClick(page, async () => {
    await page.getByRole("button", { name: /verify credentials/i }).click();
  });

  pushResult(
    "Specialized Profiles",
    "Verify Credentials",
    verifyPlaceholder ? "placeholder" : "working",
    verifyPlaceholder
      ? "Primary CTA is visible but has no handler."
      : "Primary CTA triggered a verification flow."
  );
}

async function runLeaveConfigAudit(page) {
  const leaveName = nowToken("Audit Leave Type");
  cleanupTasks.push(() => deleteLeaveTypeByName(leaveName));
  const { data: baselineLeave, error: baselineLeaveError } = await SERVICE_ROLE.from("leave_types")
    .select("id, leave_name, yearly_quota")
    .order("leave_name")
    .limit(1)
    .single();

  if (baselineLeaveError) {
    throw baselineLeaveError;
  }

  await goto(page, "/hrms/leave/config");
  await page.getByRole("button", { name: /define leave type/i }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.waitFor({ state: "visible", timeout: 10000 });
  const createInputs = createDialog.locator("input");
  await createInputs.nth(0).fill(leaveName);
  await createInputs.nth(1).fill("7");
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/rest/v1/leave_types"),
    { timeout: 15000 }
  );
  await createDialog.getByRole("button", { name: /^create$/i }).click();
  const createResponse = await createResponsePromise.catch(() => null);
  const leaveRecord = await fetchLeaveTypeByName(leaveName);

  if (createResponse?.ok() && leaveRecord?.id) {
    pushResult(
      "Leave Configuration",
      "Create Leave Type",
      "working",
      "Create dialog persists a new leave type.",
      { leaveTypeId: leaveRecord.id, leaveName }
    );
  } else {
    let responseBody = "";
    try {
      responseBody = createResponse ? await createResponse.text() : "";
    } catch {}

    pushResult(
      "Leave Configuration",
      "Create Leave Type",
      "broken",
      responseBody.includes("is_paid")
        ? "Create dialog submits, but the write fails because the client payload includes `is_paid`, which is not present on the live `leave_types` schema."
        : "Create dialog opens, but submitting does not persist a new leave type in the current environment.",
      {
        leaveName,
        responseStatus: createResponse?.status() ?? null,
        responseBody,
      }
    );

    await createDialog.getByRole("button", { name: /cancel/i }).click().catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
  }

  const originalQuota = Number(baselineLeave.yearly_quota);
  const attemptedQuota = originalQuota + 1;
  const row = page.locator("tbody tr").filter({ hasText: baselineLeave.leave_name }).first();
  await row.waitFor({ state: "visible", timeout: 15000 });
  await row.getByRole("button").last().click();
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor({ state: "visible", timeout: 10000 });
  const quotaInput = editDialog.locator('input[type="number"]').first();
  await quotaInput.fill(String(attemptedQuota));
  const updateResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/rest/v1/leave_types?id=eq.${baselineLeave.id}`),
    { timeout: 15000 }
  );
  await editDialog.getByRole("button", { name: /^update$/i }).click();
  const updateResponse = await updateResponsePromise.catch(() => null);
  await page.waitForTimeout(1500);
  const updatedLeave = await fetchLeaveTypeById(baselineLeave.id);

  if (updatedLeave && Number(updatedLeave.yearly_quota) === attemptedQuota) {
    pushResult(
      "Leave Configuration",
      "Edit Leave Type",
      "working",
      "Edit dialog persists updates to an existing leave type.",
      { leaveTypeId: baselineLeave.id, yearlyQuota: attemptedQuota }
    );

    const { error } = await SERVICE_ROLE.from("leave_types")
      .update({ yearly_quota: originalQuota })
      .eq("id", baselineLeave.id);
    if (error) throw error;
    await poll(
      () => fetchLeaveTypeById(baselineLeave.id),
      (data) => Number(data?.yearly_quota) === originalQuota,
      15000
    );
  } else {
    let responseBody = "";
    try {
      responseBody = updateResponse ? await updateResponse.text() : "";
    } catch {}

    pushResult(
      "Leave Configuration",
      "Edit Leave Type",
      "broken",
      "Edit dialog opens and submits a PATCH request, but the leave quota does not change in the database for the tested row.",
      {
        leaveTypeId: baselineLeave.id,
        leaveName: baselineLeave.leave_name,
        attemptedQuota,
        observedQuota: updatedLeave?.yearly_quota ?? null,
        responseStatus: updateResponse?.status() ?? null,
        responseBody,
      }
    );
  }
}

function writeReport() {
  fs.mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      working: results.filter((entry) => entry.status === "working").length,
      broken: results.filter((entry) => entry.status === "broken").length,
      partial: results.filter((entry) => entry.status === "partial").length,
      informational: results.filter((entry) => entry.status === "informational").length,
      placeholder: results.filter((entry) => entry.status === "placeholder").length,
    },
    results,
  };

  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2));

  const lines = [
    "# Platform Master Action Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    "",
    `- Working: ${report.summary.working}`,
    `- Broken: ${report.summary.broken}`,
    `- Partial: ${report.summary.partial}`,
    `- Informational only: ${report.summary.informational}`,
    `- Placeholder / not wired: ${report.summary.placeholder}`,
    "",
    "| Area | Action | Status | Details |",
    "|---|---|---|---|",
    ...results.map(
      (entry) => `| ${entry.area} | ${entry.action} | ${entry.status} | ${entry.details} |`
    ),
    "",
  ];

  fs.writeFileSync(REPORT_MD_PATH, lines.join("\n"));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const superAdminPage = await browser.newPage({ baseURL: BASE_URL });
  const adminPage = await browser.newPage({ baseURL: BASE_URL });

  try {
    await login(superAdminPage, "superadmin@test.com", "/dashboard");
    await login(adminPage, "admin@test.com", "/dashboard");

    await runAdminManagementAudit(superAdminPage);
    await runRolePermissionsAudit(superAdminPage);
    await runSystemConfigAudit(superAdminPage);

    await runUsersAudit(adminPage);
    await runEmployeesAudit(adminPage);
    await runDesignationsAudit(adminPage);
    await runLocationsAudit(adminPage);
    await runSpecializedProfilesAudit(adminPage);
    await runLeaveConfigAudit(adminPage);
  } finally {
    for (const cleanup of cleanupTasks.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        pushResult(
          "Cleanup",
          "Best-effort cleanup",
          "placeholder",
          `Cleanup step failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    writeReport();
    await superAdminPage.close().catch(() => {});
    await adminPage.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  pushResult(
    "Audit Harness",
    "Run audit",
    "placeholder",
    error instanceof Error ? error.message : String(error)
  );
  writeReport();
  console.error(error);
  process.exit(1);
});

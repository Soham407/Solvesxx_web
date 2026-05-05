import { expect, test } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

// Layer 2: API authorization tests for admin-tier and society routes.
// Complements api-authz.spec.ts by covering the remaining admin CRUD routes.
//
// All authenticated tests are chromium-only: page.request cookie forwarding on
// WebKit behaves differently, causing false failures unrelated to RBAC logic.

test.describe("Admin API Route Authorization", () => {
  test("unauthenticated request to admin residents returns 401", async ({ request }) => {
    const response = await request.get("/api/admin/residents");
    expect(response.status()).toBe(401);
  });

  test("buyer cannot access admin residents (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "buyer");
    const response = await page.request.get("/api/admin/residents");
    expect(response.status()).toBe(403);
  });

  test("admin can access admin residents (200)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "admin");
    const response = await page.request.get("/api/admin/residents");
    expect(response.status()).toBe(200);
  });

  test("supplier cannot create a user via admin route (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "supplier");
    const response = await page.request.post("/api/admin/create-user", {
      data: { full_name: "Test", email: "test@example.com", role_id: "some-id" },
    });
    expect(response.status()).toBe(403);
  });

  test("admin receives 400 for missing required fields on create-user", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "admin");
    const response = await page.request.post("/api/admin/create-user", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("delivery_boy cannot change a user role via admin route (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "delivery_boy");
    const response = await page.request.put(
      "/api/admin/users/00000000-0000-0000-0000-000000000001/role",
      { data: { role_id: "some-role-id" } },
    );
    expect(response.status()).toBe(403);
  });

  test("storekeeper cannot suspend a user via admin route (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "storekeeper");
    const response = await page.request.post(
      "/api/admin/users/00000000-0000-0000-0000-000000000001/suspend",
    );
    expect(response.status()).toBe(403);
  });
});

test.describe("Society API Route Authorization", () => {
  test("unauthenticated request to society residents returns 401", async ({ request }) => {
    const response = await request.get("/api/society/residents");
    expect(response.status()).toBe(401);
  });

  test("buyer cannot access society residents (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "buyer");
    const response = await page.request.get("/api/society/residents");
    expect(response.status()).toBe(403);
  });

  test("society_manager can access society residents (200)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "society_manager");
    const response = await page.request.get("/api/society/residents");
    expect(response.status()).toBe(200);
  });
});

test.describe("Supplier API Route Authorization", () => {
  test("buyer cannot call service-indent-response (4xx)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "buyer");
    const response = await page.request.post("/api/supplier/service-indent-response", {
      // Use a properly-formatted UUID v4 (version=4, variant=8) so Zod validation passes
      // and the role check (401/403) is reached before any other early return.
      data: { requestId: "11111111-1111-4111-8111-111111111111" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("admin cannot call service-indent-response (4xx — wrong role, not a supplier)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "admin");
    const response = await page.request.post("/api/supplier/service-indent-response", {
      data: { requestId: "11111111-1111-4111-8111-111111111111" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("supplier receives 400 for malformed service-indent-response body", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "supplier");
    const response = await page.request.post("/api/supplier/service-indent-response", {
      data: { requestId: "not-a-uuid" },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Super-Admin API Route Authorization", () => {
  test("admin cannot manage super-admin accounts (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "admin");
    const response = await page.request.post("/api/super-admin/admins", {
      data: {},
    });
    expect(response.status()).toBe(403);
  });

  test("society_manager cannot read super-admin accounts (403)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "API auth tests run on chromium only.");
    await loginAsRole(page, "society_manager");
    const response = await page.request.get("/api/super-admin/admins");
    expect(response.status()).toBe(403);
  });
});

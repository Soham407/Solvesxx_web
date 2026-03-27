import { expect, test } from "@playwright/test";

import { loginAsRole } from "./helpers/auth";

test.describe("API Auth and Validation", () => {
  test("returns the first forwarded IP", async ({ request }) => {
    const response = await request.get("/api/auth/client-ip", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-real-ip": "198.51.100.8",
      },
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ ip: "203.0.113.10" });
  });

  test("rejects invalid waitlist payloads", async ({ request }) => {
    const response = await request.post("/api/waitlist", {
      data: {
        email: "not-an-email",
        name: "Test User",
        company: "SOLVESXX",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects unauthenticated password reset requests", async ({ request }) => {
    const response = await request.post("/api/users/reset-password", {
      data: { email: "admin@test.com" },
    });

    expect(response.status()).toBe(401);
  });

  test("blocks admin-tier password resets from admin users", async ({ page }) => {
    await loginAsRole(page, "admin");

    const response = await page.request.post("/api/users/reset-password", {
      data: { email: "admin@test.com" },
    });

    expect(response.status()).toBe(403);
  });

  test("requires super admin permission for admin management", async ({ page }) => {
    await loginAsRole(page, "admin");

    const response = await page.request.post("/api/super-admin/admins", {
      data: {},
    });

    expect(response.status()).toBe(403);
  });

  test("validates super admin invite payloads", async ({ page }) => {
    await loginAsRole(page, "super_admin");

    const response = await page.request.post("/api/super-admin/admins", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("rejects QR batch generation for unauthorized roles", async ({ page }) => {
    await loginAsRole(page, "buyer");

    const response = await page.request.post("/api/assets/generate-qr-batch", {
      data: {
        count: 1,
        societyId: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(response.status()).toBe(403);
  });

  test("validates QR batch payloads for authorized users", async ({ page }) => {
    await loginAsRole(page, "admin");

    const response = await page.request.post("/api/assets/generate-qr-batch", {
      data: {
        count: 0,
        societyId: "not-a-uuid",
      },
    });

    expect(response.status()).toBe(400);
  });
});

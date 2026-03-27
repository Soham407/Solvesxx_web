import { expect, test } from "@playwright/test";

test.describe("Security Baseline", () => {
  test("public client-ip route returns a shaped payload", async ({ request }) => {
    const response = await request.get("/api/auth/client-ip");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ ip: expect.any(String) });
  });

  test("waitlist rejects malformed email payloads", async ({ request }) => {
    const response = await request.post("/api/waitlist", {
      data: {
        email: "not-an-email",
        name: "<script>alert(1)</script>",
        company: "Security Baseline",
      },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: "A valid email is required.",
    });
  });

  test("waitlist accepts a normal submission and stays idempotent enough for duplicates", async ({ request }) => {
    const uniqueEmail = `security-baseline-${Date.now()}@example.com`;

    const firstResponse = await request.post("/api/waitlist", {
      data: {
        email: uniqueEmail,
        name: "Security Baseline",
        company: "SOLVESXX",
      },
    });

    expect(firstResponse.ok()).toBeTruthy();

    const secondResponse = await request.post("/api/waitlist", {
      data: {
        email: uniqueEmail,
        name: "Security Baseline",
        company: "SOLVESXX",
      },
    });

    expect(secondResponse.ok()).toBeTruthy();
  });

  test("protected routes redirect anonymous users to login", async ({ page }) => {
    await page.goto("/settings/admins");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsettings%2Fadmins/i);
  });

  test("forbidden dashboard routes do not render privileged content for a logged-out user", async ({ page }) => {
    await page.goto("/settings/permissions");
    await expect(page).toHaveURL(/\/login/i);
    await expect(page.locator("body")).not.toContainText("Role & Permissions");
  });
});

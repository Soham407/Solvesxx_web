import { expect, test } from "@playwright/test";

import { expectRedirectToLogin } from "./helpers/auth";

test.describe("Security Baseline", () => {
  test("redirects anonymous dashboard access to login", async ({ page }) => {
    await expectRedirectToLogin(page, "/dashboard");
  });

  test("rejects unauthenticated requests to the unlinked residents API", async ({ request }) => {
    const response = await request.get("/api/residents/unlinked");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});

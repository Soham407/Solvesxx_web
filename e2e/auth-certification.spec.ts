import { expect, test, type Page } from "@playwright/test";
import crypto from "node:crypto";

import { expectAllowedRoute, expectBlockedRoute, expectRedirectToLogin, loginAsRole } from "./helpers/auth";
import { createServiceRoleClient } from "./helpers/db";

const DEFAULT_PASSWORD = "Test@1234";
const LOGIN_BUTTON_NAME = /^(?:sign in|enter workspace)$/i;

type TempAuthUser = {
  email: string;
  fullName: string;
  id: string;
  password: string;
  username: string;
};

async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/corporate email|email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();
}

async function getRoleId(roleName: "admin" | "buyer") {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from("roles")
    .select("id")
    .eq("role_name", roleName)
    .single();

  if (error || !data) {
    throw error ?? new Error(`Role "${roleName}" was not found.`);
  }

  return data.id as string;
}

async function createTempAuthUser(options: {
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
  roleName: "admin" | "buyer";
}): Promise<TempAuthUser> {
  const client = createServiceRoleClient();
  const token = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const roleId = await getRoleId(options.roleName);
  const password = options.password ?? DEFAULT_PASSWORD;
  const email = `auth-cert-${options.roleName}-${token}@test.com`;
  const fullName = `Auth Certification ${options.roleName} ${token}`;
  const username = `authcert_${options.roleName}_${token.replace(/-/g, "")}`.slice(0, 48);

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: options.roleName,
    },
  });

  if (authError || !authData.user) {
    throw authError ?? new Error(`Failed to create auth user for ${email}.`);
  }

  const { error: publicUserError } = await client.from("users").insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    username,
    role_id: roleId,
    is_active: options.isActive ?? true,
    must_change_password: options.mustChangePassword ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (publicUserError) {
    await client.auth.admin.deleteUser(authData.user.id);
    throw publicUserError;
  }

  return {
    email,
    fullName,
    id: authData.user.id,
    password,
    username,
  };
}

async function deleteTempAuthUser(userId: string) {
  const client = createServiceRoleClient();
  await client.from("users").delete().eq("id", userId);
  await client.auth.admin.deleteUser(userId);
}

test.describe("Auth Certification", () => {
  test("maintains a session until cookies are cleared", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expect(page).toHaveURL(/\/dashboard(?:$|[?#])/);

    await page.context().clearCookies();

    await expectRedirectToLogin(page, "/dashboard");
  });

  test("enforces role-based routing for buyer users", async ({ page }) => {
    await loginAsRole(page, "buyer");
    await expect(page).toHaveURL(/\/buyer(?:$|[?#])/);

    await expectAllowedRoute(page, "buyer");
    await expectBlockedRoute(page, "buyer");
  });

  test("forces first-login users through the password change flow", async ({ page }) => {
    const tempUser = await createTempAuthUser({
      roleName: "admin",
      mustChangePassword: true,
    });
    const nextPassword = `Updated!${crypto.randomUUID().slice(0, 8)}`;

    try {
      await loginWithCredentials(page, tempUser.email, tempUser.password);
      await page.waitForURL((url) => url.pathname === "/change-password", {
        timeout: 30_000,
      });

      await expect(page.getByRole("heading", { name: /set your new password/i })).toBeVisible();
      await page.getByLabel(/new password/i).fill(nextPassword);
      await page.getByLabel(/confirm password/i).fill(nextPassword);
      await page.getByRole("button", { name: /save and continue/i }).click();

      await expect
        .poll(async () => {
          const { data, error } = await createServiceRoleClient()
            .from("users")
            .select("must_change_password")
            .eq("id", tempUser.id)
            .single();

          if (error) {
            throw error;
          }

          return (data as { must_change_password?: boolean | null } | null)?.must_change_password ?? false;
        })
        .toBe(false);

      await page.waitForURL(
        (url) => url.pathname === "/dashboard" || url.pathname === "/login",
        {
          timeout: 30_000,
        }
      );

      if (new URL(page.url()).pathname === "/login") {
        await page.getByLabel(/corporate email|email/i).fill(tempUser.email);
        await page.getByLabel(/password/i).fill(nextPassword);
        await page.getByRole("button", { name: LOGIN_BUTTON_NAME }).click();
      }

      await page.waitForURL((url) => url.pathname === "/dashboard", {
        timeout: 30_000,
      });
      await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteTempAuthUser(tempUser.id);
    }
  });

  test("routes inactive accounts back to login with an inactive marker", async ({ page }) => {
    const tempUser = await createTempAuthUser({
      roleName: "admin",
      isActive: false,
    });

    try {
      await loginWithCredentials(page, tempUser.email, tempUser.password);
      await page.waitForURL(
        (url) => url.pathname === "/login" && url.searchParams.get("error") === "inactive",
        {
          timeout: 30_000,
        }
      );

      await expect(page).toHaveURL(/\/login\?error=inactive/i);
      await expect(page.getByPlaceholder("name@company.com")).toBeVisible();
    } finally {
      await deleteTempAuthUser(tempUser.id);
    }
  });
});

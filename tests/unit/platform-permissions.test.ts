import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  extractPlatformPermissions,
  getRequiredPlatformPermission,
  getDefaultSettingsRoute,
  hasAnySettingsPermission,
  hasPermission,
  normalizePermissions,
} from "@/src/lib/platform/permissions";

describe("platform permissions", () => {
  it("normalizes permissions from arrays, objects, and strings", () => {
    expect(normalizePermissions(["platform.config.manage", "platform.config.manage"])).toEqual([
      "platform.config.manage",
    ]);
    expect(
      normalizePermissions({
        "platform.config.manage": true,
        "platform.audit_logs.view": 1,
        "platform.rbac.manage": false,
      })
    ).toEqual(["platform.config.manage", "platform.audit_logs.view"]);
    expect(normalizePermissions("platform.admin_accounts.manage")).toEqual([
      "platform.admin_accounts.manage",
    ]);
  });

  it("filters extracted platform permissions to the supported keys", () => {
    expect(
      extractPlatformPermissions([
        "platform.admin_accounts.manage",
        "platform.audit_logs.view",
        "totally.unknown.permission",
      ])
    ).toEqual(["platform.admin_accounts.manage", "platform.audit_logs.view"]);
  });

  it("detects settings access and chooses the first permitted settings landing route", () => {
    const permissions = ["platform.audit_logs.view", "platform.config.manage"];

    expect(hasPermission(permissions, "platform.audit_logs.view")).toBe(true);
    expect(hasAnySettingsPermission(permissions)).toBe(true);
    expect(getDefaultSettingsRoute(permissions)).toBe("/settings/audit-logs");
  });

  it("maps protected platform routes to their required permissions", () => {
    expect(getRequiredPlatformPermission("/settings/admins")).toBe(
      "platform.admin_accounts.manage"
    );
    expect(getRequiredPlatformPermission("/settings/company")).toBe(
      "platform.config.manage"
    );
    expect(getRequiredPlatformPermission("/api/super-admin/admins/123")).toBe(
      "platform.admin_accounts.manage"
    );
    expect(getRequiredPlatformPermission("/dashboard")).toBeNull();
  });

  it("enforces permission overlays before role-based path access", () => {
    expect(canAccessPath("admin", [], "/settings/admins")).toBe(false);
    expect(
      canAccessPath("admin", ["platform.admin_accounts.manage"], "/settings/admins")
    ).toBe(true);
    expect(canAccessPath("super_admin", [], "/settings/company")).toBe(false);
    expect(
      canAccessPath("super_admin", ["platform.config.manage"], "/settings/company")
    ).toBe(true);
  });

  it("hard-blocks disabled settings routes regardless of role or permission", () => {
    const allSettingsPermissions = [
      "platform.admin_accounts.manage",
      "platform.rbac.manage",
      "platform.audit_logs.view",
      "platform.config.manage",
    ];

    expect(canAccessPath("super_admin", allSettingsPermissions, "/settings/notifications")).toBe(
      false
    );
    expect(canAccessPath("super_admin", allSettingsPermissions, "/settings/branding")).toBe(
      false
    );
  });

  it("falls back to app-role path access when no platform override is required", () => {
    expect(canAccessPath("account", [], "/finance/payments")).toBe(true);
    expect(canAccessPath("account", [], "/company/users")).toBe(false);
    expect(canAccessPath("buyer", [], "/buyer/requests")).toBe(true);
    expect(canAccessPath("buyer", [], "/supplier/indents")).toBe(false);
  });

  it("treats /settings as a permission-gated hub route", () => {
    expect(canAccessPath("super_admin", [], "/settings")).toBe(false);
    expect(canAccessPath("super_admin", ["platform.audit_logs.view"], "/settings")).toBe(true);
  });
});

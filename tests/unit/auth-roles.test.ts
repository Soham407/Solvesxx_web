import { describe, expect, it } from "vitest";

import { hasAccess } from "@/src/lib/auth/roles";

describe("hasAccess", () => {
  it("grants full access to admin-tier roles", () => {
    expect(hasAccess("admin", "/totally/custom/path")).toBe(true);
    expect(hasAccess("super_admin", "/settings/admins")).toBe(true);
  });

  it("always allows the dashboard landing route", () => {
    expect(hasAccess("buyer", "/dashboard")).toBe(true);
    expect(hasAccess("resident", "/dashboard")).toBe(true);
    expect(hasAccess("security_guard", "/dashboard")).toBe(true);
  });

  it("blocks guards from the resident-only portal even when they can access society tools", () => {
    expect(hasAccess("security_guard", "/society/panic-alerts")).toBe(true);
    expect(hasAccess("security_guard", "/society/my-flat")).toBe(false);
    expect(hasAccess("security_supervisor", "/society/my-flat")).toBe(false);
  });

  it("keeps role aliases aligned with their intended portals", () => {
    expect(hasAccess("vendor", "/supplier/indents")).toBe(true);
    expect(hasAccess("vendor", "/buyer/requests")).toBe(false);
    expect(hasAccess("buyer", "/buyer/requests/new")).toBe(true);
    expect(hasAccess("buyer", "/supplier/bills")).toBe(false);
  });

  it("restricts specialist users to their own slices of the app", () => {
    expect(hasAccess("account", "/finance/supplier-bills")).toBe(true);
    expect(hasAccess("account", "/company/users")).toBe(false);
    expect(hasAccess("ac_technician", "/services/ac")).toBe(true);
    expect(hasAccess("ac_technician", "/services/pest-control")).toBe(false);
  });
});

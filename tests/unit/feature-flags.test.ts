import { afterEach, describe, expect, it, vi } from "vitest";

type FeatureFlagsModule = typeof import("@/src/lib/featureFlags");

const ORIGINAL_ENV = { ...process.env };

async function loadFeatureFlags(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();

  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_FEATURE_FUTURE_PHASE: undefined,
    NEXT_PUBLIC_FF_REPORTS_MODULE: undefined,
    NEXT_PUBLIC_FF_SETTINGS_MODULE: undefined,
    ...overrides,
  };

  return import("@/src/lib/featureFlags") as Promise<FeatureFlagsModule>;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("feature flags", () => {
  it("freezes future-phase routes and nav items by default", async () => {
    const featureFlags = await loadFeatureFlags();

    expect(featureFlags.isRouteFrozen("/reports")).toBe(true);
    expect(featureFlags.isRouteFrozen("/dashboard")).toBe(false);
    expect(featureFlags.isNavHrefFrozen("/settings/branding")).toBe(true);
    expect(featureFlags.isNavItemFrozen("Asset Registry")).toBe(true);
  });

  it("allows individually enabled routes to be surfaced without enabling the full future phase", async () => {
    const featureFlags = await loadFeatureFlags({
      NEXT_PUBLIC_FF_REPORTS_MODULE: "true",
    });

    expect(featureFlags.isRouteFrozen("/reports/attendance")).toBe(false);
    expect(featureFlags.isRouteFrozen("/settings/branding")).toBe(true);
  });

  it("unfreezes all scoped routes when the future phase flag is enabled", async () => {
    const featureFlags = await loadFeatureFlags({
      NEXT_PUBLIC_FEATURE_FUTURE_PHASE: "true",
    });

    expect(featureFlags.isRouteFrozen("/reports")).toBe(false);
    expect(featureFlags.isNavHrefFrozen("/assets/qr-codes")).toBe(false);

    const filtered = featureFlags.filterNavigation([
      {
        title: "Reports",
        href: "/reports",
        children: [{ title: "Financial Health", href: "/reports/financial" }],
      },
      {
        title: "Settings",
        href: "/settings",
        children: [{ title: "Visual Branding", href: "/settings/branding" }],
      },
    ]);

    expect(filtered).toHaveLength(2);
    expect(filtered[1]?.children).toHaveLength(1);
  });

  it("filters frozen parents and children out of a navigation tree when the flags remain disabled", async () => {
    const featureFlags = await loadFeatureFlags();

    const filtered = featureFlags.filterNavigation([
      {
        title: "Reports",
        href: "/reports",
        children: [
          { title: "Financial Health", href: "/reports/financial" },
          { title: "Main Dashboard", href: "/dashboard" },
        ],
      },
      {
        title: "Settings",
        href: "/settings",
        children: [
          { title: "Visual Branding", href: "/settings/branding" },
          { title: "System Configuration", href: "/admin/config" },
        ],
      },
    ]);

    expect(filtered).toEqual([
      {
        title: "Settings",
        href: "/settings",
        children: [{ title: "System Configuration", href: "/admin/config" }],
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  getSystemConfigNumber,
  isSystemConfigKey,
  normalizeSystemConfigRows,
  SYSTEM_CONFIG_DEFAULTS,
} from "@/src/lib/platform/system-config";

describe("system config helpers", () => {
  it("recognizes only declared system config keys", () => {
    expect(isSystemConfigKey("guard_inactivity_threshold_minutes")).toBe(true);
    expect(isSystemConfigKey("unknown_config_key")).toBe(false);
  });

  it("fills missing rows from defaults and merges persisted overrides", () => {
    const normalized = normalizeSystemConfigRows([
      {
        key: "guard_inactivity_threshold_minutes",
        value: "45",
        description: "Custom threshold",
        updated_at: "2026-03-22T00:00:00.000Z",
        updated_by: "user-1",
      },
      {
        key: "unknown_key",
        value: "999",
      },
    ]);

    expect(normalized.guard_inactivity_threshold_minutes).toEqual({
      key: "guard_inactivity_threshold_minutes",
      value: "45",
      description: "Custom threshold",
      updatedAt: "2026-03-22T00:00:00.000Z",
      updatedBy: "user-1",
    });
    expect(normalized.default_geo_fence_radius_meters.value).toBe(
      SYSTEM_CONFIG_DEFAULTS.default_geo_fence_radius_meters
    );
  });

  it("parses numeric values and falls back to defaults when the stored value is invalid", () => {
    const normalized = normalizeSystemConfigRows([
      {
        key: "default_geo_fence_radius_meters",
        value: "not-a-number",
      },
    ]);

    expect(getSystemConfigNumber(normalized, "guard_inactivity_threshold_minutes")).toBe(30);
    expect(getSystemConfigNumber(normalized, "default_geo_fence_radius_meters")).toBe(50);
  });
});

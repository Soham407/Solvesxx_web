import {
  SYSTEM_CONFIG_KEYS,
  type SystemConfigEntry,
  type SystemConfigKey,
} from "@/src/types/platform";

export const SYSTEM_CONFIG_DEFAULTS: Record<SystemConfigKey, string> = {
  guard_inactivity_threshold_minutes: "30",
  default_geo_fence_radius_meters: "50",
  geo_breach_auto_punch_out_minutes: "5",
  checklist_completion_alert_threshold_percent: "50",
};

export const SYSTEM_CONFIG_METADATA: Record<
  SystemConfigKey,
  {
    label: string;
    description: string;
    min: number;
    max: number;
    step?: number;
  }
> = {
  guard_inactivity_threshold_minutes: {
    label: "Guard Inactivity Threshold",
    description: "Minutes of no movement before an inactivity alert is raised.",
    min: 5,
    max: 120,
  },
  default_geo_fence_radius_meters: {
    label: "Default Geo-Fence Radius",
    description: "Fallback radius, in meters, when a location does not define its own geo-fence.",
    min: 10,
    max: 500,
  },
  geo_breach_auto_punch_out_minutes: {
    label: "Geo-Breach Auto Punch-Out Delay",
    description: "Minutes a guard may remain outside the geo-fence before auto punch-out.",
    min: 1,
    max: 60,
  },
  checklist_completion_alert_threshold_percent: {
    label: "Checklist Alert Threshold",
    description: "Completion percentage below which checklist alerts should fire.",
    min: 1,
    max: 100,
    step: 1,
  },
};

export function isSystemConfigKey(value: string): value is SystemConfigKey {
  return (SYSTEM_CONFIG_KEYS as readonly string[]).includes(value);
}

export function normalizeSystemConfigRows(
  rows: Array<{
    key: string;
    value: string | null;
    description?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
  }>
): Record<SystemConfigKey, SystemConfigEntry> {
  const normalized = {} as Record<SystemConfigKey, SystemConfigEntry>;

  for (const key of SYSTEM_CONFIG_KEYS) {
    normalized[key] = {
      key,
      value: SYSTEM_CONFIG_DEFAULTS[key],
      description: SYSTEM_CONFIG_METADATA[key].description,
      updatedAt: null,
      updatedBy: null,
    };
  }

  for (const row of rows) {
    if (!isSystemConfigKey(row.key)) {
      continue;
    }

    normalized[row.key] = {
      key: row.key,
      value: row.value ?? SYSTEM_CONFIG_DEFAULTS[row.key],
      description: row.description ?? SYSTEM_CONFIG_METADATA[row.key].description,
      updatedAt: row.updated_at ?? null,
      updatedBy: row.updated_by ?? null,
    };
  }

  return normalized;
}

export function getSystemConfigNumber(
  config: Record<SystemConfigKey, SystemConfigEntry>,
  key: SystemConfigKey
): number {
  const parsed = Number(config[key]?.value ?? SYSTEM_CONFIG_DEFAULTS[key]);
  return Number.isFinite(parsed) ? parsed : Number(SYSTEM_CONFIG_DEFAULTS[key]);
}

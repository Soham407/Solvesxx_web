"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { insertAuditLog } from "@/src/lib/platform/audit";
import {
  getSystemConfigNumber,
  normalizeSystemConfigRows,
  SYSTEM_CONFIG_METADATA,
} from "@/src/lib/platform/system-config";
import { supabase } from "@/src/lib/supabaseClient";
import type { SystemConfigEntry, SystemConfigKey } from "@/src/types/platform";

type SystemConfigUpdateMap = Partial<Record<SystemConfigKey, string>>;

interface SystemConfigUpdateEntry {
  key: SystemConfigKey;
  value: string;
}

const ACCESS_ERROR = "Only admins can access system configuration.";
const UPDATE_ERROR = "Only admins can update system configuration.";

function getDefaultConfigRows(): SystemConfigEntry[] {
  return Object.values(normalizeSystemConfigRows([]));
}

function normalizeConfigValue(key: SystemConfigKey, rawValue: string): string {
  const metadata = SYSTEM_CONFIG_METADATA[key];
  const normalizedValue = rawValue.trim();

  if (!normalizedValue) {
    throw new Error(`${metadata.label} is required.`);
  }

  const numericValue = Number(normalizedValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${metadata.label} must be a number.`);
  }

  if (numericValue < metadata.min || numericValue > metadata.max) {
    throw new Error(
      `${metadata.label} must be between ${metadata.min} and ${metadata.max}.`
    );
  }

  return String(numericValue);
}

export function useSystemConfig() {
  const { role, userId, isLoading: isAuthLoading } = useAuth();

  const configQuery = useSupabaseQuery<SystemConfigEntry>(
    async () => {
      if (isAuthLoading || role !== "admin") {
        return getDefaultConfigRows();
      }

      const { data, error } = await supabase
        .from("system_config")
        .select("key, value, description, updated_at, updated_by")
        .order("key");

      if (error) {
        throw error;
      }

      return Object.values(normalizeSystemConfigRows(data ?? []));
    },
    [isAuthLoading, role]
  );

  const config = useMemo(() => {
    const normalized = normalizeSystemConfigRows([]);

    for (const entry of configQuery.data) {
      normalized[entry.key] = entry;
    }

    return normalized;
  }, [configQuery.data]);

  const entries = useMemo(() => Object.values(config), [config]);

  const { execute: updateConfig, isLoading: isSaving } = useSupabaseMutation<
    SystemConfigUpdateMap,
    Record<SystemConfigKey, SystemConfigEntry>
  >(
    async (nextValues) => {
      if (role !== "admin") {
        throw new Error(UPDATE_ERROR);
      }

      const updates = Object.entries(nextValues).filter(
        ([, value]) => typeof value === "string"
      ) as Array<[SystemConfigKey, string]>;

      if (updates.length === 0) {
        return config;
      }

      const normalizedValues = Object.fromEntries(
        updates.map(([key, value]) => [key, normalizeConfigValue(key, value)])
      ) as Record<SystemConfigKey, string>;

      const updatedAt = new Date().toISOString();
      const payload = updates.map(([key]) => ({
        key,
        value: normalizedValues[key],
        description: SYSTEM_CONFIG_METADATA[key].description,
        updated_by: userId ?? null,
        updated_at: updatedAt,
      }));

      const previousValues = Object.fromEntries(
        updates.map(([key]) => [key, config[key]])
      ) as Record<SystemConfigKey, SystemConfigEntry>;

      const nextConfig = {
        ...config,
        ...Object.fromEntries(
          updates.map(([key]) => [
            key,
            {
              ...config[key],
              value: normalizedValues[key],
              description: SYSTEM_CONFIG_METADATA[key].description,
              updatedAt,
              updatedBy: userId ?? null,
            },
          ])
        ),
      } as Record<SystemConfigKey, SystemConfigEntry>;

      const { error } = await supabase.from("system_config").upsert(payload);
      if (error) {
        throw error;
      }

      await insertAuditLog(supabase, {
        entityType: "system_config",
        entityId: updates.length === 1 ? updates[0][0] : null,
        action: "system_config.updated",
        actorId: userId ?? null,
        actorRole: role,
        oldData: previousValues,
        newData: Object.fromEntries(
          updates.map(([key]) => [key, nextConfig[key]])
        ),
        metadata: { keys: updates.map(([key]) => key) },
      });

      configQuery.refresh();

      return nextConfig;
    },
    { successMessage: "System configuration saved" }
  );

  const error =
    !isAuthLoading && role !== "admin" ? ACCESS_ERROR : configQuery.error;

  return {
    config,
    entries,
    isLoading: isAuthLoading || configQuery.isLoading,
    error,
    refresh: configQuery.refresh,
    updateConfig,
    updateEntry: (update: SystemConfigUpdateEntry) =>
      updateConfig({ [update.key]: update.value }),
    isSaving,
    canManage: role === "admin",
    getNumber: (key: SystemConfigKey) => getSystemConfigNumber(config, key),
  };
}

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

export function usePlatformConfig() {
  const { role } = useAuth();

  const configQuery = useSupabaseQuery<SystemConfigEntry>(
    async () => {
      const { data, error } = await (supabase as any)
        .from("system_config")
        .select("key, value, description, updated_at, updated_by")
        .order("key");

      if (error) throw error;

      return Object.values(
        normalizeSystemConfigRows((data as any[]) || [])
      );
    },
    []
  );

  const configMap = useMemo(
    () =>
      configQuery.data.reduce<Record<SystemConfigKey, SystemConfigEntry>>(
        (map, entry) => {
          map[entry.key] = entry;
          return map;
        },
        {} as Record<SystemConfigKey, SystemConfigEntry>
      ),
    [configQuery.data]
  );

  const { execute: updateConfig, isLoading: isSaving } = useSupabaseMutation<
    Record<SystemConfigKey, string>,
    Record<SystemConfigKey, SystemConfigEntry>
  >(
    async (nextValues) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const previousValues = configMap;
      const payload = Object.entries(nextValues).map(([key, value]) => ({
        key,
        value,
        description: SYSTEM_CONFIG_METADATA[key as SystemConfigKey].description,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await (supabase as any).from("system_config").upsert(payload);
      if (error) throw error;

      await insertAuditLog(supabase as any, {
        entityType: "system_config",
        action: "system_config.updated",
        actorId: user?.id ?? null,
        actorRole: role ?? null,
        oldData: previousValues,
        newData: nextValues,
        metadata: { keys: Object.keys(nextValues) },
      });

      configQuery.refresh();
      return configMap;
    },
    { successMessage: "System configuration saved" }
  );

  return {
    config: configMap,
    entries: configQuery.data,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    refresh: configQuery.refresh,
    updateConfig,
    isSaving,
    getNumber: (key: SystemConfigKey) => getSystemConfigNumber(configMap, key),
  };
}

"use client";

import { useMemo } from "react";

import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { normalizeAuditLogRow } from "@/src/lib/platform/audit";
import { supabase } from "@/src/lib/supabaseClient";
import type { PlatformAuditLog } from "@/src/types/platform";

export function usePlatformAuditLogs(limit = 200) {
  const auditQuery = useSupabaseQuery<PlatformAuditLog>(
    async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("*, actor:users!audit_logs_actor_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(normalizeAuditLogRow);
    },
    [limit]
  );

  const summary = useMemo(() => {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    return {
      total: auditQuery.data.length,
      recent: auditQuery.data.filter(
        (log) => new Date(log.createdAt).getTime() >= last24Hours
      ).length,
    };
  }, [auditQuery.data]);

  return {
    logs: auditQuery.data,
    summary,
    isLoading: auditQuery.isLoading,
    error: auditQuery.error,
    refresh: auditQuery.refresh,
  };
}

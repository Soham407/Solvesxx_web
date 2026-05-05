"use client";

import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import {
  normalizeAuditLogRow,
  summarizeAuditLogs,
} from "@/src/lib/platform/auditTransforms";
import { supabase } from "@/src/lib/supabaseClient";
import type { PlatformAuditLog } from "@/src/types/platform";

export function usePlatformAuditLogs(limit = 200) {
  const auditQuery = useSupabaseQuery<PlatformAuditLog>(
    async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, actor:users!audit_logs_actor_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(normalizeAuditLogRow);
    },
    [limit]
  );

  const summary = summarizeAuditLogs(auditQuery.data);

  return {
    logs: auditQuery.data,
    summary,
    isLoading: auditQuery.isLoading,
    error: auditQuery.error,
    refresh: auditQuery.refresh,
  };
}

// @ts-nocheck
"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
  // joined
  actor_name?: string;
}

export interface LogActionParams {
  entityType: string;
  entityId?: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
}

export function useAuditLogs(entityType?: string) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Enrich with actor display names from users table where possible
      const enriched = (data || []).map((log) => ({
        ...log,
        actor_name: log.actor_role
          ? `${log.actor_role.replace(/_/g, " ")}`
          : "System",
      }));

      setLogs(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  const logAction = useCallback(
    async ({
      entityType,
      entityId,
      action,
      actorId,
      actorRole,
      oldData,
      newData,
      metadata,
    }: LogActionParams) => {
      try {
        const { error: insertError } = await supabase
          .from("audit_logs")
          .insert({
            entity_type: entityType,
            entity_id: entityId || null,
            action,
            actor_id: actorId || null,
            actor_role: actorRole || null,
            old_data: oldData || null,
            new_data: newData || null,
            metadata: metadata || null,
          });
        if (insertError) throw insertError;
      } catch (err: any) {
        console.error("useAuditLogs.logAction error:", err.message);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("audit_logs_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  return { logs, isLoading, error, logAction, refresh: fetchLogs };
}

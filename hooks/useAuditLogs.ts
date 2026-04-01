"use client";

import { useCallback, useEffect, useState } from "react";

import type { Database } from "@/supabase-types";
import { supabase } from "@/src/lib/supabaseClient";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

type AuditActor = {
  full_name: string | null;
  email: string | null;
};

type AuditLogRecord = AuditLogRow & {
  actor?: AuditActor | AuditActor[] | null;
};

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  old_data: unknown;
  new_data: unknown;
  metadata: unknown;
  evidence_url: string | null;
  created_at: string;
  actor_name?: string;
  actor_email?: string | null;
}

export interface LogActionParams {
  entityType: string;
  entityId?: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  oldData?: unknown;
  newData?: unknown;
  metadata?: unknown;
  evidenceUrl?: string | null;
}

export interface AuditLogFilters {
  user?: string;
  action?: string;
  table_name?: string;
  tableName?: string;
  entityType?: string;
  date_from?: string;
  dateFrom?: string;
  date_to?: string;
  dateTo?: string;
  limit?: number;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toLocalDayStartIso(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toNextLocalDayStartIso(date: string) {
  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString();
}

function formatActorRole(actorRole: string | null) {
  return actorRole ? actorRole.replace(/_/g, " ") : "System";
}

function getActor(record: AuditLogRecord) {
  if (Array.isArray(record.actor)) {
    return record.actor[0] ?? null;
  }

  return record.actor ?? null;
}

function normalizeAuditLog(record: AuditLogRecord): AuditLog {
  const actor = getActor(record);
  const actorName = actor?.full_name ?? actor?.email ?? formatActorRole(record.actor_role);

  return {
    id: record.id,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    table_name: record.entity_type,
    record_id: record.entity_id,
    action: record.action,
    actor_id: record.actor_id,
    actor_role: record.actor_role,
    old_data: record.old_data,
    new_data: record.new_data,
    metadata: record.metadata,
    evidence_url: record.evidence_url,
    created_at: record.created_at ?? new Date().toISOString(),
    actor_name: actorName,
    actor_email: actor?.email ?? null,
  };
}

function matchesUserFilter(log: AuditLog, userFilter: string) {
  const searchValue = [
    log.actor_name ?? "",
    log.actor_email ?? "",
    log.actor_role ?? "",
    log.actor_id ?? "",
    log.actor_id ? "" : "system",
  ]
    .join(" ")
    .toLowerCase();

  return searchValue.includes(userFilter.toLowerCase());
}

async function findMatchingActorIds(userFilter: string) {
  const trimmedFilter = userFilter.trim();

  if (!trimmedFilter) {
    return [];
  }

  const actorIds = new Set<string>();

  if (looksLikeUuid(trimmedFilter)) {
    actorIds.add(trimmedFilter);
  }

  const likeValue = `%${trimmedFilter}%`;

  const [{ data: byName, error: nameError }, { data: byEmail, error: emailError }] =
    await Promise.all([
      supabase.from("users").select("id").ilike("full_name", likeValue).limit(25),
      supabase.from("users").select("id").ilike("email", likeValue).limit(25),
    ]);

  if (nameError) {
    throw nameError;
  }

  if (emailError) {
    throw emailError;
  }

  (byName ?? []).forEach((user) => {
    if (user.id) {
      actorIds.add(user.id);
    }
  });

  (byEmail ?? []).forEach((user) => {
    if (user.id) {
      actorIds.add(user.id);
    }
  });

  return Array.from(actorIds);
}

export function useAuditLogs(filtersOrEntityType?: string | AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userFilter =
    typeof filtersOrEntityType === "string"
      ? ""
      : (filtersOrEntityType?.user ?? "").trim();
  const actionFilter =
    typeof filtersOrEntityType === "string"
      ? ""
      : (filtersOrEntityType?.action ?? "").trim();
  const tableNameFilter =
    typeof filtersOrEntityType === "string"
      ? filtersOrEntityType.trim()
      : (
          filtersOrEntityType?.table_name ??
          filtersOrEntityType?.tableName ??
          filtersOrEntityType?.entityType ??
          ""
        ).trim();
  const dateFrom =
    typeof filtersOrEntityType === "string"
      ? ""
      : (filtersOrEntityType?.date_from ?? filtersOrEntityType?.dateFrom ?? "").trim();
  const dateTo =
    typeof filtersOrEntityType === "string"
      ? ""
      : (filtersOrEntityType?.date_to ?? filtersOrEntityType?.dateTo ?? "").trim();
  const limit =
    typeof filtersOrEntityType === "string"
      ? 500
      : Math.max(filtersOrEntityType?.limit ?? 500, 1);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const matchedActorIds = userFilter
        ? await findMatchingActorIds(userFilter)
        : [];

      let query = supabase
        .from("audit_logs")
        .select("*, actor:users!audit_logs_actor_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableNameFilter) {
        query = query.ilike("entity_type", `%${tableNameFilter}%`);
      }

      if (actionFilter) {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      if (dateFrom) {
        query = query.gte("created_at", toLocalDayStartIso(dateFrom));
      }

      if (dateTo) {
        query = query.lt("created_at", toNextLocalDayStartIso(dateTo));
      }

      if (matchedActorIds.length > 0) {
        query = query.in("actor_id", matchedActorIds);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const enriched = (data ?? []).map((record: AuditLogRecord) =>
        normalizeAuditLog(record)
      );

      const filteredLogs = userFilter
        ? enriched.filter((log) => matchesUserFilter(log, userFilter))
        : enriched;

      setLogs(filteredLogs);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load audit logs";
      setError(message);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo, limit, tableNameFilter, userFilter]);

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
      evidenceUrl,
    }: LogActionParams) => {
      try {
        const payload: Database["public"]["Tables"]["audit_logs"]["Insert"] = {
          entity_type: entityType,
          entity_id: entityId || null,
          action,
          actor_id: actorId || null,
          actor_role: actorRole || null,
          old_data: (oldData as any) || null,
          new_data: (newData as any) || null,
          metadata: (metadata as any) || null,
          evidence_url: evidenceUrl || null,
        };

        const { error: insertError } = await supabase
          .from("audit_logs")
          .insert(payload);
        if (insertError) throw insertError;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create audit log";
        console.error("useAuditLogs.logAction error:", message);
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
        { event: "*", schema: "public", table: "audit_logs" },
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

import type { PlatformAuditLog } from "@/src/types/platform";

export interface AuditActorRow {
  full_name: string | null;
}

export interface AuditLogRow {
  id?: string | null;
  entity_type?: string | null;
  table_name?: string | null;
  entity_id?: string | null;
  record_id?: string | null;
  action?: string | null;
  actor_id?: string | null;
  actor_role?: string | null;
  actor_name?: string | null;
  old_data?: unknown;
  new_data?: unknown;
  metadata?: unknown;
  evidence_url?: string | null;
  created_at?: string | null;
  actor?: AuditActorRow | AuditActorRow[] | null;
}

export function normalizeAuditLogRow(row: AuditLogRow): PlatformAuditLog {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;

  return {
    id: row.id ?? crypto.randomUUID(),
    entityType: row.entity_type ?? row.table_name ?? "unknown",
    entityId: row.entity_id ?? row.record_id ?? null,
    action: row.action ?? "unknown",
    actorId: row.actor_id ?? null,
    actorName: actor?.full_name ?? row.actor_name ?? null,
    actorRole: row.actor_role ?? null,
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
    metadata: row.metadata ?? null,
    evidenceUrl: row.evidence_url ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function summarizeAuditLogs(logs: PlatformAuditLog[]) {
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

  return {
    total: logs.length,
    recent: logs.filter((log) => new Date(log.createdAt).getTime() >= last24Hours).length,
  };
}

import type { PlatformAuditLog } from "@/src/types/platform";

interface AuditActorRow {
  full_name: string | null;
}

interface AuditLogRow {
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

export interface AuditInsertPayload {
  entityType: string;
  entityId?: string | null;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  oldData?: unknown;
  newData?: unknown;
  metadata?: unknown;
  evidenceUrl?: string | null;
}

export async function insertAuditLog(
  supabaseClient: {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
    };
  },
  payload: AuditInsertPayload
) {
  const { error } = await supabaseClient.from("audit_logs").insert({
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    action: payload.action,
    actor_id: payload.actorId ?? null,
    actor_role: payload.actorRole ?? null,
    old_data: payload.oldData ?? null,
    new_data: payload.newData ?? null,
    metadata: payload.metadata ?? null,
    evidence_url: payload.evidenceUrl ?? null,
  });

  if (error) {
    throw error;
  }
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

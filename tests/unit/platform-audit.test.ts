import { describe, expect, it } from "vitest";

import { insertAuditLog, normalizeAuditLogRow } from "@/src/lib/platform/audit";

describe("audit helpers", () => {
  it("normalizes audit rows from legacy and joined shapes", () => {
    const normalized = normalizeAuditLogRow({
      id: "audit-1",
      entity_type: "users",
      entity_id: "user-1",
      action: "admin.updated",
      actor_id: "actor-1",
      actor_role: "super_admin",
      actor: [{ full_name: "Ada Lovelace" }],
      old_data: { old: true },
      new_data: { old: false },
      metadata: { source: "test" },
      evidence_url: "https://example.com/evidence",
      created_at: "2026-03-22T00:00:00.000Z",
    });

    expect(normalized).toEqual({
      id: "audit-1",
      entityType: "users",
      entityId: "user-1",
      action: "admin.updated",
      actorId: "actor-1",
      actorName: "Ada Lovelace",
      actorRole: "super_admin",
      oldData: { old: true },
      newData: { old: false },
      metadata: { source: "test" },
      evidenceUrl: "https://example.com/evidence",
      createdAt: "2026-03-22T00:00:00.000Z",
    });
  });

  it("falls back to safe defaults when legacy fields are missing", () => {
    const normalized = normalizeAuditLogRow({
      table_name: "system_config",
      record_id: "cfg-1",
      actor_name: "Fallback Actor",
    });

    expect(normalized.entityType).toBe("system_config");
    expect(normalized.entityId).toBe("cfg-1");
    expect(normalized.actorName).toBe("Fallback Actor");
    expect(normalized.action).toBe("unknown");
    expect(normalized.id).toEqual(expect.any(String));
  });

  it("maps audit insert payloads onto the persisted column names", async () => {
    const insertedRows: Array<Record<string, unknown>> = [];
    const supabaseClient = {
      from(table: string) {
        expect(table).toBe("audit_logs");
        return {
          async insert(row: Record<string, unknown>) {
            insertedRows.push(row);
            return { error: null };
          },
        };
      },
    };

    await insertAuditLog(supabaseClient, {
      entityType: "users",
      entityId: "user-2",
      action: "admin.invited",
      actorId: "actor-2",
      actorRole: "super_admin",
      oldData: { old: null },
      newData: { invited: true },
      metadata: { invitation: "signup" },
      evidenceUrl: "https://example.com/invite",
    });

    expect(insertedRows).toEqual([
      {
        entity_type: "users",
        entity_id: "user-2",
        action: "admin.invited",
        actor_id: "actor-2",
        actor_role: "super_admin",
        old_data: { old: null },
        new_data: { invited: true },
        metadata: { invitation: "signup" },
        evidence_url: "https://example.com/invite",
      },
    ]);
  });

  it("surfaces audit insert failures", async () => {
    const supabaseClient = {
      from() {
        return {
          async insert() {
            return { error: new Error("write failed") };
          },
        };
      },
    };

    await expect(
      insertAuditLog(supabaseClient, {
        entityType: "users",
        action: "admin.updated",
      })
    ).rejects.toThrow("write failed");
  });
});

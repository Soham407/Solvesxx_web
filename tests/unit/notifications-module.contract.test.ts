import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("notifications module contracts", () => {
  it("hardens notifications inserts and keeps the table in the realtime publication", async () => {
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260316124145_notifications.sql"
    );
    const patchMigrationSource = await readRepoFile(
      "supabase/migrations/20260330000010_notify_001_notifications_hardening.sql"
    );

    expect(
      sourceContainsAll(migrationSource, [
        'DROP POLICY "notifications_insert" ON notifications;',
        'FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
        'CREATE POLICY "notifications_insert_service_role" ON notifications',
        "FOR INSERT TO service_role WITH CHECK (true);",
        "FROM pg_publication_tables",
        "pubname = 'supabase_realtime'",
        "tablename = 'notifications'",
        "ALTER PUBLICATION supabase_realtime ADD TABLE notifications;",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(patchMigrationSource, [
        'DROP POLICY IF EXISTS "notifications_insert_service_role" ON notifications;',
        'CREATE POLICY "notifications_insert_service_role" ON notifications',
        "FOR INSERT TO service_role",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(migrationSource, [
        "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);;",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(migrationSource, [
        "FOR INSERT TO authenticated WITH CHECK (true)",
      ])
    ).toBe(true);
  });

  it("persists read timestamps and keeps the notifications hook live-updating", async () => {
    const hookSource = await readRepoFile("hooks/useNotifications.ts");

    expect(
      sourceContainsAll(hookSource, [
        'import type { RealtimeChannel } from "@supabase/supabase-js";',
        "read_at: string | null;",
        ".update({ is_read: true, read_at: readAt })",
        '.eq("user_id", userId)',
        '{ event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }',
        '{ event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }',
        "mergeNotification",
        "const [error, setError] = useState<string | null>(null);",
        "return { notifications, isLoading, error, unreadCount, markAsRead, markAllRead };",
      ])
    ).toBe(true);

    expect(sourceContainsNone(hookSource, ["// @ts-nocheck"])).toBe(true);
  });

  it("keeps the bell wired to the hook and mounted in the app header", async () => {
    const bellSource = await readRepoFile(
      "components/layout/NotificationBell.tsx"
    );
    const topNavSource = await readRepoFile("components/layout/TopNav.tsx");

    expect(
      sourceContainsAll(bellSource, [
        "useNotifications",
        "unreadCount > 0",
        "useRouter",
        "router.push(actionUrl)",
        'actionUrl?.startsWith("/")',
        "bg-primary/10",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(bellSource, ["window.location.href", "bg-primary/3"])
    ).toBe(true);

    expect(
      sourceContainsAll(topNavSource, [
        'import { NotificationBell } from "./NotificationBell";',
        "<NotificationBell />",
      ])
    ).toBe(true);
  });
});

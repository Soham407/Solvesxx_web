import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("visitor lifecycle contracts", () => {
  it("keeps the VISITOR-001 database hardening migration in place", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260330000002_visitor_lifecycle_hardening.sql"
    );

    expect(
      sourceContainsAll(source, [
        "GRANT EXECUTE ON FUNCTION public.deny_visitor(UUID, UUID, TEXT) TO authenticated;",
        "CREATE TABLE IF NOT EXISTS public.visitor_bypass_audit",
        "CREATE TRIGGER tr_visitor_bypass_audit",
        "approved_by_resident IS NULL",
        "prior.is_frequent_visitor = true",
        "current_user = 'authenticated'",
      ])
    ).toBe(true);
  });

  it("patches the visitor RPC authorization gaps in the follow-up repair migration", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260330000009_visitor_lifecycle_rpc_repairs.sql"
    );

    expect(
      sourceContainsAll(source, [
        "if auth.uid() is distinct from p_user_id then",
        "visitors without a destination flat cannot be approved",
        "visitors without a destination flat cannot be denied",
        "only guards and visitor managers can check out visitors",
        "guards can only check out visitors from their assigned gate",
        "grant execute on function public.deny_visitor(uuid, uuid, text) to authenticated;",
        "alter function public.checkout_visitor(uuid, uuid) set search_path = public;",
        "v_bypassed_by_auth_user_id := auth.uid();",
        "elsif is_resident() and not is_admin() then",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(source, [
        "current_user = 'authenticated'",
      ])
    ).toBe(true);
  });

  it("scopes resident frequent visitor toggles to the resident flat and surfaces RLS misses", async () => {
    const source = await readRepoFile("hooks/useResident.ts");

    expect(
      sourceContainsAll(source, [
        '.eq("flat_id", state.resident.flat.id)',
        '.select("id")',
        ".single()",
        "Visitor not found or update not permitted",
      ])
    ).toBe(true);
  });

  it("keeps visitor lifecycle mutations on RPC paths from the browser hook", async () => {
    const source = await readRepoFile("hooks/useVisitors.ts");

    expect(
      sourceContainsAll(source, [
        '"checkout_visitor" as any',
        '"approve_visitor" as any',
        '"deny_visitor" as any',
      ])
    ).toBe(true);
  });

  it("keeps frequent visitor management off the guard-only service-role path", async () => {
    const routeSource = await readRepoFile("app/api/society/visitors/[visitorId]/route.ts");
    const pageSource = await readRepoFile("app/(dashboard)/society/visitors/page.tsx");

    const frequentRolesBlock = routeSource.match(
      /const FREQUENT_VISITOR_ROLES = new Set\(\[([\s\S]*?)\]\);/
    )?.[1] ?? "";

    expect(routeSource).toContain('if (!FREQUENT_VISITOR_ROLES.has(auth.roleName ?? ""))');
    expect(frequentRolesBlock).toContain('"security_supervisor"');
    expect(frequentRolesBlock).not.toContain('"security_guard"');
    expect(pageSource).toContain("canManageFrequentVisitors && (");
  });

  it("keeps a checkout surface on the guard station page", async () => {
    const source = await readRepoFile("app/(dashboard)/guard/page.tsx");

    expect(
      sourceContainsAll(source, [
        "Active Visitors",
        "Record departures from the guard station",
        "Log Exit for",
        "await checkOutVisitor(visitor.id);",
      ])
    ).toBe(true);
  });
});

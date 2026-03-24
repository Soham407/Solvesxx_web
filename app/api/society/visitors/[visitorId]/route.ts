import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const VisitorActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("issue_pass"),
  }),
  z.object({
    action: z.literal("set_frequent"),
    isFrequent: z.boolean(),
  }),
]);

const VISITOR_MANAGEMENT_ROLES = new Set([
  "admin",
  "super_admin",
  "society_manager",
]);

async function getAuthorizedVisitorManager() {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      roleName: null as string | null,
    };
  }

  const { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !userRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      roleName: null as string | null,
    };
  }

  const roleRecord = Array.isArray((userRecord as any)?.roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !VISITOR_MANAGEMENT_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      roleName,
      userId: null as string | null,
    };
  }

  return { error: null, roleName, userId: user.id };
}

async function canManageVisitor(visitorId: string) {
  // Use service role to bypass RLS for existence check; authorization is
  // already enforced by getAuthorizedVisitorManager (role check).
  const supabaseAdmin = createServiceRoleClient();
  const { data: visitorRecord, error: visitorError } = await supabaseAdmin
    .from("visitors")
    .select("id")
    .eq("id", visitorId)
    .maybeSingle();

  return !visitorError && !!visitorRecord;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ visitorId: string }> },
) {
  try {
    const auth = await getAuthorizedVisitorManager();
    if (auth.error) return auth.error;

    const { visitorId } = await context.params;
    const body = await request.json();
    const parsed = VisitorActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    if (
      auth.roleName === "society_manager" &&
      !(await canManageVisitor(visitorId))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createServiceRoleClient();

    if (parsed.data.action === "issue_pass") {
      const values = new Uint16Array(1);
      crypto.getRandomValues(values);
      const passNumber = `PASS-${(values[0] % 9000) + 1000}`;
      const { error } = await supabaseAdmin
        .from("visitors")
        .update({ visitor_pass_number: passNumber })
        .eq("id", visitorId);

      if (error) throw error;

      return NextResponse.json({ success: true, passNumber });
    }

    const { error } = await supabaseAdmin
      .from("visitors")
      .update({ is_frequent_visitor: parsed.data.isFrequent })
      .eq("id", visitorId);

    if (error) throw error;

    return NextResponse.json({ success: true, isFrequent: parsed.data.isFrequent });
  } catch (error: unknown) {
    console.error("Visitor mutation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update visitor" },
      { status: 500 },
    );
  }
}

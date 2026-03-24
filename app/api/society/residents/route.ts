import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const CreateResidentSchema = z.object({
  flat_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(20).optional().default(""),
  relation: z.string().trim().min(1).max(50),
});

const RESIDENT_MANAGEMENT_ROLES = new Set([
  "admin",
  "super_admin",
  "society_manager",
]);

async function getAuthorizedResidentManager() {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null as string | null,
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
      userId: null as string | null,
    };
  }

  const roleRecord = Array.isArray((userRecord as any)?.roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !RESIDENT_MANAGEMENT_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
      roleName: null as string | null,
    };
  }

  return { error: null, userId: user.id, roleName };
}

async function canManageFlat(flatId: string) {
  const supabase = await createServerClient();
  const { data: flatRecord, error: flatError } = await supabase
    .from("flats")
    .select("id")
    .eq("id", flatId)
    .maybeSingle();

  return !flatError && !!flatRecord;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedResidentManager();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = CreateResidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    if (
      auth.roleName === "society_manager" &&
      !(await canManageFlat(parsed.data.flat_id))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const residentCode = `RES-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()}`;

    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin
      .from("residents")
      .insert({
        flat_id: parsed.data.flat_id,
        full_name: parsed.data.full_name,
        is_active: true,
        phone: parsed.data.phone || null,
        relation: parsed.data.relation,
        resident_code: residentCode,
      })
      .select("id, full_name, resident_code")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, resident: data });
  } catch (error: unknown) {
    console.error("Resident creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create resident" },
      { status: 500 },
    );
  }
}

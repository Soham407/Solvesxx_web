import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { insertAuditLog } from "@/src/lib/platform/audit";
import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const SOCIETY_ADMIN_ROLES = new Set(["admin", "super_admin", "society_manager"]);

async function getAuthorizedSocietyAdmin() {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  const { data: callerRecord } = await supabaseAdmin
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  const roleRecord = Array.isArray((callerRecord as any)?.roles)
    ? (callerRecord as any).roles[0]
    : (callerRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !SOCIETY_ADMIN_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  return { error: null, supabaseAdmin, callerUserId: user.id };
}

const ImportRowSchema = z.object({
  society_code: z.string().trim().min(1).max(20),
  society_name: z.string().trim().max(200).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  pincode: z.string().trim().max(10).default(""),
  address: z.string().trim().default(""),
  building_code: z.string().trim().max(20).default(""),
  building_name: z.string().trim().max(100).default(""),
  total_floors: z.coerce.number().int().nonnegative().optional(),
  flat_number: z.string().trim().max(20).default(""),
  flat_type: z.string().trim().toLowerCase().optional(),
  floor_number: z.coerce.number().int().optional(),
  area_sqft: z.coerce.number().nonnegative().optional(),
  ownership_type: z.string().trim().toLowerCase().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error!;

  try {
    const body = await request.json();

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (body.rows.length > 2000) {
      return NextResponse.json({ error: "Maximum 2000 rows per import" }, { status: 400 });
    }

    const parsed = z.array(ImportRowSchema).safeParse(body.rows);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const rows = parsed.data;
    const db = auth.supabaseAdmin;
    const actorId = auth.callerUserId;

    // Cache IDs to avoid repeated lookups for the same society/building
    const societyMap = new Map<string, string>(); // society_code → id
    const buildingMap = new Map<string, string>(); // `${societyId}:${building_code}` → id

    let societiesCreated = 0,
      societiesSkipped = 0;
    let buildingsCreated = 0,
      buildingsSkipped = 0;
    let flatsCreated = 0,
      flatsSkipped = 0;

    for (const row of rows) {
      // ── Society ──────────────────────────────────────────────────────────
      let societyId = societyMap.get(row.society_code);

      if (!societyId) {
        const { data: existing } = await db
          .from("societies")
          .select("id")
          .eq("society_code", row.society_code)
          .maybeSingle();

        if (existing) {
          societyId = (existing as any).id;
          societiesSkipped++;
        } else {
          const { data: created, error: createErr } = await db
            .from("societies")
            .insert({
              society_code: row.society_code,
              society_name: row.society_name || row.society_code,
              city: row.city || null,
              state: row.state || null,
              pincode: row.pincode || null,
              address: row.address || null,
              is_active: true,
            })
            .select("id")
            .single();

          if (createErr || !created) continue;
          societyId = (created as any).id;
          societiesCreated++;

          await insertAuditLog(db, {
            entityType: "societies",
            entityId: societyId,
            action: "society.created",
            actorId,
            newData: { society_code: row.society_code, society_name: row.society_name },
          });
        }

        societyMap.set(row.society_code, societyId!);
      }

      if (!societyId || !row.building_code) continue;

      // ── Building ──────────────────────────────────────────────────────────
      const buildingKey = `${societyId}:${row.building_code}`;
      let buildingId = buildingMap.get(buildingKey);

      if (!buildingId) {
        const { data: existing } = await db
          .from("buildings")
          .select("id")
          .eq("society_id", societyId)
          .eq("building_code", row.building_code)
          .maybeSingle();

        if (existing) {
          buildingId = (existing as any).id;
          buildingsSkipped++;
        } else {
          const { data: created, error: createErr } = await db
            .from("buildings")
            .insert({
              building_code: row.building_code,
              building_name: row.building_name || row.building_code,
              society_id: societyId,
              total_floors: row.total_floors ?? null,
              is_active: true,
            })
            .select("id")
            .single();

          if (createErr || !created) continue;
          buildingId = (created as any).id;
          buildingsCreated++;

          await insertAuditLog(db, {
            entityType: "buildings",
            entityId: buildingId,
            action: "building.created",
            actorId,
            newData: { building_code: row.building_code, building_name: row.building_name },
            metadata: { society_id: societyId },
          });
        }

        buildingMap.set(buildingKey, buildingId!);
      }

      if (!buildingId || !row.flat_number) continue;

      // ── Flat ──────────────────────────────────────────────────────────────
      const { data: existingFlat } = await db
        .from("flats")
        .select("id")
        .eq("building_id", buildingId)
        .eq("flat_number", row.flat_number)
        .maybeSingle();

      if (existingFlat) {
        flatsSkipped++;
      } else {
        const validFlatType = ["1bhk", "2bhk", "3bhk", "penthouse"].includes(row.flat_type ?? "")
          ? row.flat_type
          : null;
        const validOwnershipType = ["owner", "tenant"].includes(row.ownership_type ?? "")
          ? row.ownership_type
          : null;

        const { error: createErr } = await db.from("flats").insert({
          flat_number: row.flat_number,
          building_id: buildingId,
          floor_number: row.floor_number ?? null,
          flat_type: validFlatType ?? null,
          area_sqft: row.area_sqft ?? null,
          ownership_type: validOwnershipType ?? null,
          is_occupied: false,
          is_active: true,
        });

        if (!createErr) flatsCreated++;
      }
    }

    return NextResponse.json({
      data: {
        societiesCreated,
        societiesSkipped,
        buildingsCreated,
        buildingsSkipped,
        flatsCreated,
        flatsSkipped,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}

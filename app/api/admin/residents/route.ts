import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { insertAuditLog } from "@/src/lib/platform/audit";
import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const SOCIETY_ADMIN_ROLES = new Set(["admin", "super_admin", "society_manager"]);

interface RoleLookupRecord {
  roles:
    | {
        role_name?: string | null;
      }
    | Array<{
        role_name?: string | null;
      }>
    | null;
}

interface FlatSocietyLookup {
  id: string;
  flat_number: string | null;
  is_occupied: boolean | null;
  building:
    | {
        id: string;
        building_name: string | null;
        society_id: string | null;
      }
    | Array<{
        id: string;
        building_name: string | null;
        society_id: string | null;
      }>
    | null;
}

interface ResidentListQueryRecord {
  id: string;
  resident_code: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  auth_user_id: string | null;
  flat_id: string | null;
  created_at: string | null;
  flat:
    | {
        id?: string | null;
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }
    | Array<{
        id?: string | null;
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }>
    | null;
}

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

  const { data: callerRecord, error: callerError } = await supabaseAdmin
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError || !callerRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  const typedCallerRecord = callerRecord as RoleLookupRecord;
  const roleRecord = Array.isArray(typedCallerRecord.roles)
    ? typedCallerRecord.roles[0]
    : typedCallerRecord.roles;
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

const CreateResidentSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  email: z.string().trim().email("Valid email is required"),
  flat_id: z.string().uuid("Flat is required"),
  society_id: z.string().uuid("Society is required"),
});

function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

function splitFullName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" ") || "",
  };
}

function getNestedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function fetchResidentRoleId(supabaseAdmin: ReturnType<typeof createServiceRoleClient>) {
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_name", "resident")
    .single();

  if (roleError || !roleRow) {
    throw roleError ?? new Error("Resident role not found");
  }

  return (roleRow as { id: string }).id;
}

async function fetchResidentList(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  societyId?: string | null,
) {
  const query = supabaseAdmin
    .from("residents")
    .select(`
      id,
      resident_code,
      full_name,
      phone,
      email,
      is_active,
      auth_user_id,
      flat_id,
      created_at,
      flat:flats!inner(
        id,
        flat_number,
        building:buildings!inner(
          id,
          building_name,
          society_id,
          society:societies!inner(
            id,
            society_name
          )
        )
      )
    `)
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const enriched = ((data ?? []) as ResidentListQueryRecord[]).map((resident) => {
    const flat = getNestedRecord(resident.flat);
    const building = getNestedRecord(flat?.building);
    const society = getNestedRecord(building?.society);
    const nameParts = splitFullName(resident.full_name);

    return {
      id: resident.id,
      resident_code: resident.resident_code ?? null,
      full_name: resident.full_name ?? "",
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      phone: resident.phone ?? "",
      email: resident.email ?? "",
      is_active: resident.is_active !== false,
      auth_user_id: resident.auth_user_id ?? null,
      flat_id: resident.flat_id ?? flat?.id ?? null,
      created_at: resident.created_at ?? null,
      flat_number: flat?.flat_number ?? null,
      building_id: building?.id ?? null,
      building_name: building?.building_name ?? null,
      society_id: building?.society_id ?? society?.id ?? null,
      society_name: society?.society_name ?? null,
    };
  });

  return societyId
    ? enriched.filter((resident) => resident.society_id === societyId)
    : enriched;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const societyId = searchParams.get("societyId");
    const data = await fetchResidentList(auth.supabaseAdmin, societyId);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch residents" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthorizedSocietyAdmin();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateResidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const fullName = buildFullName(payload.first_name, payload.last_name);

    const { data: flatRow, error: flatError } = await auth.supabaseAdmin
      .from("flats")
      .select("id, flat_number, is_occupied, building:buildings!inner(id, building_name, society_id)")
      .eq("id", payload.flat_id)
      .eq("is_active", true)
      .maybeSingle();

    if (flatError) throw flatError;

    if (!flatRow) {
      return NextResponse.json({ error: "Flat not found" }, { status: 404 });
    }

    const typedFlatRow = flatRow as FlatSocietyLookup;
    const building = getNestedRecord(typedFlatRow.building);

    if (!building || building.society_id !== payload.society_id) {
      return NextResponse.json(
        { error: "Selected flat does not belong to the selected society" },
        { status: 400 },
      );
    }

    if (typedFlatRow.is_occupied) {
      return NextResponse.json({ error: "Selected flat is already occupied" }, { status: 409 });
    }

    const { data: existingResident, error: existingResidentError } = await auth.supabaseAdmin
      .from("residents")
      .select("id")
      .eq("flat_id", payload.flat_id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingResidentError) throw existingResidentError;

    if (existingResident) {
      return NextResponse.json(
        { error: "An active resident is already linked to this flat" },
        { status: 409 },
      );
    }

    const residentRoleId = await fetchResidentRoleId(auth.supabaseAdmin);

    const { data: authUser, error: createAuthError } = await auth.supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      phone: payload.phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        role: "resident",
        full_name: fullName,
      },
    });

    if (createAuthError || !authUser.user) {
      if (
        createAuthError?.message?.includes("already registered") ||
        createAuthError?.message?.includes("already been registered")
      ) {
        return NextResponse.json({ error: "A user with this email or phone already exists" }, { status: 409 });
      }

      throw createAuthError ?? new Error("Failed to create auth user");
    }

    const authUserId = authUser.user.id;
    const residentCode = `RES-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const usernameBase = payload.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const username = `${usernameBase}_${Date.now().toString(36)}`.slice(0, 64);

    let residentRow: Record<string, unknown> | null = null;

    try {
      const { data: insertedResident, error: residentInsertError } = await auth.supabaseAdmin
        .from("residents")
        .insert({
          auth_user_id: authUserId,
          flat_id: payload.flat_id,
          resident_code: residentCode,
          full_name: fullName,
          phone: payload.phone,
          email: payload.email,
          relation: "Owner",
          is_primary_contact: true,
          is_active: true,
        })
        .select("*")
        .single();

      if (residentInsertError || !insertedResident) {
        throw residentInsertError ?? new Error("Resident insert failed");
      }

      residentRow = insertedResident as Record<string, unknown>;

      const { error: userInsertError } = await auth.supabaseAdmin.from("users").insert({
        id: authUserId,
        full_name: fullName,
        email: payload.email,
        phone: payload.phone,
        role_id: residentRoleId,
        username,
        must_change_password: false,
        is_active: true,
      });

      if (userInsertError) {
        throw userInsertError;
      }

      const { error: occupancyError } = await auth.supabaseAdmin
        .from("flats")
        .update({ is_occupied: true })
        .eq("id", payload.flat_id);

      if (occupancyError) {
        throw occupancyError;
      }
    } catch (error) {
      if (residentRow?.id) {
        await auth.supabaseAdmin.from("residents").delete().eq("id", residentRow.id as string);
      }

      await auth.supabaseAdmin.from("users").delete().eq("id", authUserId);
      await auth.supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw error;
    }

    await insertAuditLog(auth.supabaseAdmin, {
      entityType: "residents",
      entityId: residentRow.id as string,
      action: "resident.created",
      actorId: auth.callerUserId,
      newData: residentRow,
      metadata: {
        flat_id: payload.flat_id,
        society_id: payload.society_id,
      },
    });

    const data = await fetchResidentList(auth.supabaseAdmin, payload.society_id);
    const createdResident = data.find((resident) => resident.id === residentRow?.id) ?? null;

    return NextResponse.json({ data: createdResident }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create resident" },
      { status: 500 },
    );
  }
}

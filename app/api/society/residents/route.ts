import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const CreateResidentSchema = z.object({
  flat_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(20).optional().default(""),
  relation: z.string().trim().min(1).max(50),
  // Optional login account creation
  email: z.string().email().optional().or(z.literal("")),
  temp_password: z.string().min(8).optional().or(z.literal("")),
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

export async function GET() {
  try {
    const auth = await getAuthorizedResidentManager();
    if (auth.error) return auth.error;

    const supabaseAdmin = createServiceRoleClient();
    const { data: residents, error: residentsError } = await supabaseAdmin
      .from("residents")
      .select(`
        id,
        resident_code,
        full_name,
        phone,
        relation,
        is_active,
        auth_user_id,
        flat_id,
        flats(
          flat_number,
          buildings(building_name)
        )
      `)
      .eq("is_active", true)
      .order("full_name");

    if (residentsError) throw residentsError;

    const authUserIds = (residents ?? [])
      .map((resident: any) => resident.auth_user_id)
      .filter((value: string | null): value is string => Boolean(value));

    const userLookup = new Map<
      string,
      { role_name: string | null; must_change_password: boolean | null; phone: string | null }
    >();

    if (authUserIds.length > 0) {
      const { data: linkedUsers, error: linkedUsersError } = await supabaseAdmin
        .from("users")
        .select("id, phone, must_change_password, roles(role_name)")
        .in("id", authUserIds);

      if (linkedUsersError) throw linkedUsersError;

      for (const record of linkedUsers ?? []) {
        const roleRecord = Array.isArray((record as any).roles)
          ? (record as any).roles[0]
          : (record as any).roles;
        userLookup.set((record as any).id, {
          role_name: roleRecord?.role_name ?? null,
          must_change_password: (record as any).must_change_password ?? null,
          phone: (record as any).phone ?? null,
        });
      }
    }

    const payload = (residents ?? []).map((resident: any) => {
      const linkedUser = resident.auth_user_id ? userLookup.get(resident.auth_user_id) : null;
      const flatRecord = Array.isArray(resident.flats) ? resident.flats[0] : resident.flats;
      const buildingRecord = Array.isArray(flatRecord?.buildings) ? flatRecord?.buildings[0] : flatRecord?.buildings;

      return {
        id: resident.id,
        resident_code: resident.resident_code,
        full_name: resident.full_name,
        phone: resident.phone || linkedUser?.phone || null,
        relation: resident.relation,
        flat_id: resident.flat_id,
        flat_number: flatRecord?.flat_number || null,
        building_name: buildingRecord?.building_name || null,
        auth_user_id: resident.auth_user_id,
        auth_linked: Boolean(resident.auth_user_id),
        role_name: linkedUser?.role_name ?? null,
        must_change_password: linkedUser?.must_change_password ?? false,
      };
    });

    const residentIds = payload.map((resident) => resident.id);
    const linkedAuthUserIds = payload
      .map((resident) => resident.auth_user_id)
      .filter((value): value is string => Boolean(value));

    const [visitorCountsResult, notificationCountsResult, pushTokenCountsResult] = await Promise.all([
      residentIds.length > 0
        ? supabaseAdmin
            .from("visitors")
            .select("resident_id, approved_by_resident")
            .in("resident_id", residentIds)
        : Promise.resolve({ data: [], error: null }),
      linkedAuthUserIds.length > 0
        ? supabaseAdmin
            .from("notifications")
            .select("user_id, is_read")
            .in("user_id", linkedAuthUserIds)
        : Promise.resolve({ data: [], error: null }),
      linkedAuthUserIds.length > 0
        ? supabaseAdmin
            .from("push_tokens")
            .select("user_id, is_active")
            .in("user_id", linkedAuthUserIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (visitorCountsResult.error) throw visitorCountsResult.error;
    if (notificationCountsResult.error) throw notificationCountsResult.error;
    if (pushTokenCountsResult.error) throw pushTokenCountsResult.error;

    const visitorStatsByResident = new Map<
      string,
      { total: number; pending: number; denied: number }
    >();
    for (const record of visitorCountsResult.data ?? []) {
      const residentId = (record as any).resident_id as string | null;
      if (!residentId) continue;
      const current = visitorStatsByResident.get(residentId) ?? {
        total: 0,
        pending: 0,
        denied: 0,
      };
      current.total += 1;
      if ((record as any).approved_by_resident === null) current.pending += 1;
      if ((record as any).approved_by_resident === false) current.denied += 1;
      visitorStatsByResident.set(residentId, current);
    }

    const unreadNotificationsByUser = new Map<string, number>();
    for (const record of notificationCountsResult.data ?? []) {
      const userId = (record as any).user_id as string | null;
      if (!userId) continue;
      if ((record as any).is_read === false) {
        unreadNotificationsByUser.set(userId, (unreadNotificationsByUser.get(userId) ?? 0) + 1);
      }
    }

    const activePushTokensByUser = new Map<string, number>();
    for (const record of pushTokenCountsResult.data ?? []) {
      const userId = (record as any).user_id as string | null;
      if (!userId) continue;
      if ((record as any).is_active !== false) {
        activePushTokensByUser.set(userId, (activePushTokensByUser.get(userId) ?? 0) + 1);
      }
    }

    const enrichedPayload = payload.map((resident) => {
      const visitorStats = visitorStatsByResident.get(resident.id) ?? {
        total: 0,
        pending: 0,
        denied: 0,
      };
      return {
        ...resident,
        active_push_tokens: resident.auth_user_id
          ? activePushTokensByUser.get(resident.auth_user_id) ?? 0
          : 0,
        unread_notifications: resident.auth_user_id
          ? unreadNotificationsByUser.get(resident.auth_user_id) ?? 0
          : 0,
        total_visitors: visitorStats.total,
        pending_visitors: visitorStats.pending,
        denied_visitors: visitorStats.denied,
      };
    });

    return NextResponse.json({ residents: enrichedPayload });
  } catch (error) {
    console.error("Residents list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch residents" },
      { status: 500 },
    );
  }
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

    const newResidentId = (data as any).id;
    const { email, temp_password } = parsed.data;

    // Optionally create a login account for this resident
    if (email && temp_password) {
      let newAuthUserId: string | null = null;

      try {
        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: temp_password,
          email_confirm: true,
          phone: parsed.data.phone || undefined,
          phone_confirm: Boolean(parsed.data.phone),
        });

        if (authError) {
          if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
            // Roll back resident record
            await supabaseAdmin.from("residents").delete().eq("id", newResidentId);
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
          }
          throw authError;
        }

        newAuthUserId = authUser.user.id;

        // Look up resident role_id
        const { data: roleRow, error: roleError } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("role_name", "resident")
          .single();

        if (roleError || !roleRow) throw new Error("Resident role not found");

        // Generate username from email
        const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
        const username = `${baseUsername}_${Date.now().toString(36)}`;

        // Insert users row
        const { error: userInsertError } = await supabaseAdmin.from("users").insert({
          id: newAuthUserId,
          full_name: parsed.data.full_name,
          email,
          phone: parsed.data.phone || null,
          role_id: (roleRow as any).id,
          username,
          must_change_password: true,
          is_active: true,
        });

        if (userInsertError) throw userInsertError;

        // Link auth_user_id on the resident record
        const { error: linkError } = await supabaseAdmin
          .from("residents")
          .update({ auth_user_id: newAuthUserId })
          .eq("id", newResidentId);

        if (linkError) throw linkError;

      } catch (accountError: unknown) {
        // Roll back: delete auth user and resident record
        if (newAuthUserId) await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
        await supabaseAdmin.from("residents").delete().eq("id", newResidentId);
        console.error("Account creation failed, rolled back resident:", accountError);
        return NextResponse.json(
          { error: accountError instanceof Error ? accountError.message : "Failed to create login account" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, resident: data });
  } catch (error: unknown) {
    console.error("Resident creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create resident" },
      { status: 500 },
    );
  }
}

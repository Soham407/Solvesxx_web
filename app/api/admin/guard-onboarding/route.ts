import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const GUARD_MANAGER_ROLES = new Set(["admin", "super_admin", "society_manager"]);

const GuardOnboardingSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  assigned_location_id: z.string().uuid(),
  shift_id: z.string().uuid().optional().or(z.literal("")),
  designation_id: z.string().uuid().optional().or(z.literal("")),
  grade: z.enum(["A", "B", "C", "D"]).default("C"),
});

async function getAuthorizedGuardManager() {
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

  const roleRecord = Array.isArray((callerRecord as any).roles)
    ? (callerRecord as any).roles[0]
    : (callerRecord as any).roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !GUARD_MANAGER_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      callerUserId: null as string | null,
    };
  }

  return {
    error: null,
    supabaseAdmin,
    callerUserId: user.id,
  };
}

function buildFallbackEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `guard.${digits || Date.now().toString(36)}.${Date.now().toString(36)}@demo.facility.local`;
}

function makeCode(prefix: string) {
  const timePart = Date.now().toString(36).slice(-6);
  const randomPart = crypto.randomBytes(2).toString("hex").slice(0, 4);
  return `${prefix}-${timePart}-${randomPart}`.toUpperCase();
}

export async function POST(request: NextRequest) {
  const auth = await getAuthorizedGuardManager();
  if (auth.error || !auth.supabaseAdmin || !auth.callerUserId) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = GuardOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const supabaseAdmin = auth.supabaseAdmin;
    const payload = parsed.data;
    const email = payload.email?.trim() || buildFallbackEmail(payload.phone);

    const [
      roleResult,
      locationResult,
      shiftResult,
      existingUserByPhoneResult,
      existingEmployeeByPhoneResult,
    ] = await Promise.all([
      supabaseAdmin.from("roles").select("id").eq("role_name", "security_guard").single(),
      supabaseAdmin.from("company_locations").select("id, location_name").eq("id", payload.assigned_location_id).maybeSingle(),
      payload.shift_id
        ? supabaseAdmin.from("shifts").select("id, shift_name").eq("id", payload.shift_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin.from("users").select("id").eq("phone", payload.phone).limit(1).maybeSingle(),
      supabaseAdmin.from("employees").select("id").eq("phone", payload.phone).limit(1).maybeSingle(),
    ]);

    if (roleResult.error || !roleResult.data) {
      throw roleResult.error ?? new Error("Security guard role not found");
    }

    if (locationResult.error || !locationResult.data) {
      return NextResponse.json({ error: "Assigned location was not found" }, { status: 400 });
    }

    if (payload.shift_id && (shiftResult.error || !shiftResult.data)) {
      return NextResponse.json({ error: "Selected shift was not found" }, { status: 400 });
    }

    if (existingUserByPhoneResult.data || existingEmployeeByPhoneResult.data) {
      return NextResponse.json(
        { error: "This phone number is already linked to another account" },
        { status: 409 },
      );
    }

    const tempPassword = crypto.randomBytes(8).toString("hex");
    const nameParts = payload.full_name.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? payload.full_name;
    const lastName = nameParts.slice(1).join(" ") || "-";
    const employeeCode = makeCode("EMP");
    const guardCode = makeCode("GRD");
    const usernameBase = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const username = `${usernameBase}_${Date.now().toString(36)}`.slice(0, 64);

    let authUserId: string | null = null;
    let employeeId: string | null = null;
    let guardId: string | null = null;
    let shiftAssignmentId: string | null = null;

    try {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: payload.full_name,
          role: "security_guard",
          phone: payload.phone,
        },
      });

      if (authUserError || !authUser.user) {
        if (
          authUserError?.message?.includes("already registered") ||
          authUserError?.message?.includes("already been registered")
        ) {
          return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }
        throw authUserError ?? new Error("Failed to create auth user");
      }

      authUserId = authUser.user.id;

      const { data: employeeRow, error: employeeError } = await supabaseAdmin
        .from("employees")
        .insert({
          employee_code: employeeCode,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: payload.phone,
          department: "security",
          designation_id: payload.designation_id || null,
          date_of_joining: new Date().toISOString().split("T")[0],
          auth_user_id: authUserId,
          is_active: true,
        })
        .select("id")
        .single();

      if (employeeError || !employeeRow) {
        throw employeeError ?? new Error("Failed to create employee");
      }

      employeeId = (employeeRow as { id: string }).id;

      const { error: publicUserError } = await supabaseAdmin.from("users").insert({
        id: authUserId,
        full_name: payload.full_name,
        email,
        phone: payload.phone,
        username,
        role_id: roleResult.data.id,
        employee_id: employeeId,
        must_change_password: true,
        is_active: true,
      });

      if (publicUserError) {
        throw publicUserError;
      }

      const { data: guardRow, error: guardError } = await supabaseAdmin
        .from("security_guards")
        .insert({
          employee_id: employeeId,
          guard_code: guardCode,
          grade: payload.grade,
          assigned_location_id: payload.assigned_location_id,
          // Shift assignments live in employee_shift_assignments; this field only accepts
          // short labels such as day/night/rotating in the current schema.
          shift_timing: null,
          is_active: true,
        })
        .select("id")
        .single();

      if (guardError || !guardRow) {
        throw guardError ?? new Error("Failed to create security guard profile");
      }

      guardId = (guardRow as { id: string }).id;

      if (payload.shift_id) {
        const { data: shiftAssignmentRow, error: shiftAssignmentError } = await supabaseAdmin
          .from("employee_shift_assignments")
          .insert({
            employee_id: employeeId,
            shift_id: payload.shift_id,
            assigned_from: new Date().toISOString().split("T")[0],
            is_active: true,
            assigned_by: null,
          })
          .select("id")
          .single();

        if (shiftAssignmentError || !shiftAssignmentRow) {
          throw shiftAssignmentError ?? new Error("Failed to assign shift");
        }

        shiftAssignmentId = (shiftAssignmentRow as { id: string }).id;
      }

      return NextResponse.json(
        {
          success: true,
          password: tempPassword,
          auth_user_id: authUserId,
          employee_id: employeeId,
          guard_id: guardId,
          shift_assignment_id: shiftAssignmentId,
          email,
          location_name: locationResult.data.location_name,
          shift_name: shiftResult.data?.shift_name ?? null,
          guard_code: guardCode,
        },
        { status: 201 },
      );
    } catch (error) {
      if (shiftAssignmentId) {
        await supabaseAdmin.from("employee_shift_assignments").delete().eq("id", shiftAssignmentId);
      }
      if (guardId) {
        await supabaseAdmin.from("security_guards").delete().eq("id", guardId);
      }
      if (employeeId) {
        await supabaseAdmin.from("employees").delete().eq("id", employeeId);
      }
      if (authUserId) {
        await supabaseAdmin.from("users").delete().eq("id", authUserId);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      throw error;
    }
  } catch (error) {
    console.error("Guard onboarding failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to onboard guard" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

interface RoleRecord {
  role_name: string | null;
}

interface CallerRecord {
  roles: RoleRecord | RoleRecord[] | null;
}

const ALLOWED_ROLES = new Set(["admin", "super_admin", "society_manager", "security_supervisor"]);

const UpdateGuardSchema = z.object({
  assigned_location_id: z.string().uuid(),
  shift_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.is_active && !value.shift_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["shift_id"],
      message: "Active guards must have an assigned shift",
    });
  }
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeGuardAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase,
      userId: null as string | null,
    };
  }

  const { data: callerRecord, error: callerError } = await supabase
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError || !callerRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabase,
      userId: null as string | null,
    };
  }

  const roleRecord = Array.isArray(callerRecord.roles)
    ? callerRecord.roles[0]
    : callerRecord.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !ALLOWED_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabase,
      userId: null as string | null,
    };
  }

  return {
    error: null,
    supabase,
    userId: user.id,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authorizeGuardAdmin();
  if (auth.error) {
    return auth.error;
  }

  try {
    const params = await context.params;
    const body = await request.json();
    const parsed = UpdateGuardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const shiftId = parsed.data.shift_id || null;

    const { data: guardRecord, error: guardError } = await supabaseAdmin
      .from("security_guards")
      .select("id, employee_id")
      .eq("id", params.id)
      .maybeSingle();

    if (guardError || !guardRecord) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 });
    }

    const [{ data: locationRecord, error: locationError }, shiftResult, employeeResult] = await Promise.all([
      supabaseAdmin
        .from("company_locations")
        .select("id, location_name")
        .eq("id", parsed.data.assigned_location_id)
        .maybeSingle(),
      shiftId
        ? supabaseAdmin.from("shifts").select("id, shift_name").eq("id", shiftId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin
        .from("employees")
        .select("id, auth_user_id")
        .eq("id", guardRecord.employee_id)
        .maybeSingle(),
    ]);

    if (locationError || !locationRecord) {
      return NextResponse.json({ error: "Assigned location not found" }, { status: 400 });
    }

    if (shiftId && (shiftResult.error || !shiftResult.data)) {
      return NextResponse.json({ error: "Selected shift not found" }, { status: 400 });
    }

    if (parsed.data.is_active && !shiftId) {
      return NextResponse.json({ error: "Active guards must have an assigned shift" }, { status: 400 });
    }

    if (employeeResult.error || !employeeResult.data) {
      return NextResponse.json({ error: "Linked employee not found" }, { status: 400 });
    }

    const employeeId = employeeResult.data.id;
    const authUserId = employeeResult.data.auth_user_id;

    const { error: guardUpdateError } = await supabaseAdmin
      .from("security_guards")
      .update({
        assigned_location_id: parsed.data.assigned_location_id,
        shift_timing: null,
        is_active: parsed.data.is_active,
      })
      .eq("id", params.id);

    if (guardUpdateError) throw guardUpdateError;

    const { error: employeeUpdateError } = await supabaseAdmin
      .from("employees")
      .update({ is_active: parsed.data.is_active })
      .eq("id", employeeId);

    if (employeeUpdateError) throw employeeUpdateError;

    if (authUserId) {
      const { error: userUpdateError } = await supabaseAdmin
        .from("users")
        .update({ is_active: parsed.data.is_active })
        .eq("id", authUserId);

      if (userUpdateError) throw userUpdateError;

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: parsed.data.is_active ? "0s" : "876600h",
      });

      if (authUpdateError) throw authUpdateError;
    }

    await supabaseAdmin
      .from("employee_shift_assignments")
      .update({
        is_active: false,
        assigned_to: new Date().toISOString().split("T")[0],
      })
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    let shiftAssignmentId: string | null = null;
    if (shiftId) {
      const { data: shiftAssignment, error: shiftAssignmentError } = await supabaseAdmin
        .from("employee_shift_assignments")
        .insert({
          employee_id: employeeId,
          shift_id: shiftId,
          assigned_from: new Date().toISOString().split("T")[0],
          is_active: true,
          assigned_by: null,
        })
        .select("id")
        .single();

      if (shiftAssignmentError) throw shiftAssignmentError;
      shiftAssignmentId = (shiftAssignment as { id: string }).id;
    }

    return NextResponse.json({
      success: true,
      location_name: locationRecord.location_name,
      shift_name: shiftResult.data?.shift_name ?? null,
      shift_assignment_id: shiftAssignmentId,
      is_active: parsed.data.is_active,
    });
  } catch (error) {
    console.error("Guard update failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update guard" },
      { status: 500 },
    );
  }
}

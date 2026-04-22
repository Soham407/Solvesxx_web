import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { insertAuditLog } from "@/src/lib/platform/audit";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "society_manager", "security_supervisor"]);

const UpdateGuardSchema = z.object({
  assigned_location_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  society_id: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  const isAssignmentUpdate =
    value.assigned_location_id !== undefined ||
    value.is_active !== undefined ||
    value.shift_id !== undefined;

  if (isAssignmentUpdate && !value.assigned_location_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["assigned_location_id"],
      message: "Assigned location is required",
    });
  }

  if (isAssignmentUpdate && value.is_active === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["is_active"],
      message: "Status is required",
    });
  }

  if (value.is_active && !value.shift_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["shift_id"],
      message: "Active guards must have an assigned shift",
    });
  }

  if (!isAssignmentUpdate && !value.society_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["society_id"],
      message: "No guard update payload provided",
    });
  }
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeGuardAdmin() {
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
      userId: null as string | null,
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
      supabaseAdmin: null as ReturnType<typeof createServiceRoleClient> | null,
      userId: null as string | null,
    };
  }

  return {
    error: null,
    supabaseAdmin,
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

    if (!auth.supabaseAdmin || !auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = auth.supabaseAdmin;
    const shiftId = parsed.data.shift_id || null;

    const { data: guardRecord, error: guardError } = await supabaseAdmin
      .from("security_guards")
      .select("id, employee_id, society_id")
      .eq("id", params.id)
      .maybeSingle();

    if (guardError || !guardRecord) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 });
    }

    const isSocietyOnlyUpdate =
      !!parsed.data.society_id &&
      parsed.data.assigned_location_id === undefined &&
      parsed.data.is_active === undefined;

    if (isSocietyOnlyUpdate) {
      const { data: societyRecord, error: societyError } = await supabaseAdmin
        .from("societies")
        .select("id, society_name")
        .eq("id", parsed.data.society_id as string)
        .eq("is_active", true)
        .maybeSingle();

      if (societyError || !societyRecord) {
        return NextResponse.json({ error: "Selected society not found" }, { status: 400 });
      }

      const { data: updatedGuard, error: societyUpdateError } = await supabaseAdmin
        .from("security_guards")
        .update({ society_id: parsed.data.society_id })
        .eq("id", params.id)
        .select("id, employee_id, society_id")
        .single();

      if (societyUpdateError || !updatedGuard) {
        throw societyUpdateError ?? new Error("Failed to update guard society");
      }

      await insertAuditLog(supabaseAdmin, {
        entityType: "security_guards",
        entityId: params.id,
        action: "guard.society_assigned",
        actorId: auth.userId,
        oldData: { society_id: guardRecord.society_id ?? null },
        newData: updatedGuard,
        metadata: {
          employee_id: guardRecord.employee_id,
          society_id: parsed.data.society_id,
          society_name: societyRecord.society_name,
        },
      });

      return NextResponse.json({
        success: true,
        society_id: parsed.data.society_id,
        society_name: societyRecord.society_name,
      });
    }

    const [{ data: locationRecord, error: locationError }, shiftResult, employeeResult] = await Promise.all([
      supabaseAdmin
        .from("company_locations")
        .select("id, location_name")
        .eq("id", parsed.data.assigned_location_id as string)
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
        assigned_location_id: parsed.data.assigned_location_id!,
        shift_timing: null,
        is_active: parsed.data.is_active!,
      })
      .eq("id", params.id);

    if (guardUpdateError) throw guardUpdateError;

    const { error: employeeUpdateError } = await supabaseAdmin
      .from("employees")
      .update({ is_active: parsed.data.is_active! })
      .eq("id", employeeId);

    if (employeeUpdateError) throw employeeUpdateError;

    if (authUserId) {
      const { error: userUpdateError } = await supabaseAdmin
        .from("users")
        .update({ is_active: parsed.data.is_active! })
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

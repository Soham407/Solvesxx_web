import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "society_manager"]);

const UpdateEmployeeSchema = z.object({
  is_active: z.boolean(),
});

const DeleteEmployeeSchema = z.object({
  confirm_name: z.string().trim().min(1),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authorizeEmployeeAdmin() {
  const supabase = await createServerClient();
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

  const { data: callerRecord, error: callerError } = await supabase
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .maybeSingle();

  if (callerError || !callerRecord) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  const roleRecord = Array.isArray((callerRecord as any).roles)
    ? (callerRecord as any).roles[0]
    : (callerRecord as any).roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !ALLOWED_ROLES.has(roleName)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: null as string | null,
    };
  }

  return {
    error: null,
    userId: user.id,
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function getEmployeeRecord(employeeId: string) {
  const supabaseAdmin = createAdminClient();
  const { data: employeeRecord, error } = await supabaseAdmin
    .from("employees")
    .select("id, first_name, last_name, is_active, auth_user_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return employeeRecord;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authorizeEmployeeAdmin();
  if (auth.error) {
    return auth.error;
  }

  try {
    const params = await context.params;
    const body = await request.json();
    const parsed = UpdateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const employeeRecord = await getEmployeeRecord(params.id);

    if (!employeeRecord) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { error: employeeUpdateError } = await supabaseAdmin
      .from("employees")
      .update({ is_active: parsed.data.is_active })
      .eq("id", params.id);

    if (employeeUpdateError) throw employeeUpdateError;

    const { error: guardUpdateError } = await supabaseAdmin
      .from("security_guards")
      .update({ is_active: parsed.data.is_active })
      .eq("employee_id", params.id);

    if (guardUpdateError) throw guardUpdateError;

    const authUserId = employeeRecord.auth_user_id;
    if (authUserId) {
      const { error: publicUserError } = await supabaseAdmin
        .from("users")
        .update({ is_active: parsed.data.is_active })
        .eq("id", authUserId);

      if (publicUserError) throw publicUserError;

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        ban_duration: parsed.data.is_active ? "0s" : "876600h",
      });

      if (authUpdateError) throw authUpdateError;
    }

    return NextResponse.json({
      success: true,
      is_active: parsed.data.is_active,
    });
  } catch (error) {
    console.error("Employee status update failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update employee status" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authorizeEmployeeAdmin();
  if (auth.error) {
    return auth.error;
  }

  try {
    const params = await context.params;
    const body = await request.json();
    const parsed = DeleteEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const employeeRecord = await getEmployeeRecord(params.id);

    if (!employeeRecord) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeName =
      [employeeRecord.first_name, employeeRecord.last_name].filter(Boolean).join(" ").trim() ||
      "Employee";

    if (normalizeName(parsed.data.confirm_name) !== normalizeName(employeeName)) {
      return NextResponse.json(
        { error: `Type "${employeeName}" exactly to confirm deletion.` },
        { status: 400 },
      );
    }

    const [
      guardResult,
      attendanceResult,
      checklistResult,
      shiftResult,
      leaveResult,
      documentResult,
      userLinkResult,
    ] = await Promise.all([
      supabaseAdmin.from("security_guards").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("attendance_logs").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("checklist_responses").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("employee_shift_assignments").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("leave_applications").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("employee_documents").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("employee_id", params.id),
    ]);

    const blockers: string[] = [];
    if ((userLinkResult.count || 0) > 0 || employeeRecord.auth_user_id) blockers.push("linked login account");
    if ((guardResult.count || 0) > 0) blockers.push("guard profile");
    if ((attendanceResult.count || 0) > 0) blockers.push("attendance history");
    if ((checklistResult.count || 0) > 0) blockers.push("checklist history");
    if ((shiftResult.count || 0) > 0) blockers.push("shift assignments");
    if ((leaveResult.count || 0) > 0) blockers.push("leave applications");
    if ((documentResult.count || 0) > 0) blockers.push("employee documents");

    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: `Permanent delete is blocked because this employee has ${blockers.join(", ")}.`,
          blockers,
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabaseAdmin.from("employees").delete().eq("id", params.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Employee delete failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete employee" },
      { status: 500 },
    );
  }
}

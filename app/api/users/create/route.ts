import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const ALLOWED_ROLES = ["admin", "super_admin"];
const ADMIN_TIER_ROLES = new Set(["admin", "super_admin"]);

/**
 * Roles that map to staff employees and require an employee record.
 * Buyer, supplier, vendor, and resident do NOT need one.
 */
const STAFF_ROLES = new Set([
  "security_guard",
  "security_supervisor",
  "service_boy",
  "ac_technician",
  "pest_control_technician",
  "storekeeper",
  "site_supervisor",
  "delivery_boy",
  "company_hod",
  "account",
]);

export async function POST(req: NextRequest) {
  try {
    // --- Authentication check ---
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Authorization check: resolve caller's role ---
    const { data: callerRecord, error: callerError } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", user.id)
      .single();

    if (callerError || !callerRecord) {
      return NextResponse.json({ error: "Forbidden — could not resolve user role" }, { status: 403 });
    }

    const callerRole = (callerRecord as any)?.roles?.role_name as string | undefined;

    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- Validate request body ---
    const { full_name, email, phone, role_id, temp_password } = await req.json();

    if (!full_name || !email || !role_id || !temp_password) {
      return NextResponse.json({ error: "full_name, email, role_id, and temp_password are required" }, { status: 400 });
    }

    if (temp_password.length < 8) {
      return NextResponse.json({ error: "Temporary password must be at least 8 characters" }, { status: 400 });
    }

    // --- Verify target role exists and is not admin-tier ---
    const { data: targetRole, error: roleError } = await supabase
      .from("roles")
      .select("id, role_name")
      .eq("id", role_id)
      .single();

    if (roleError || !targetRole) {
      return NextResponse.json({ error: "Invalid role_id" }, { status: 400 });
    }

    const roleName: string = (targetRole as any).role_name;

    if (ADMIN_TIER_ROLES.has(roleName)) {
      return NextResponse.json({ error: "Cannot provision admin-tier accounts via this endpoint" }, { status: 403 });
    }

    // --- Create auth user via admin API ---
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes("already registered") || createError.message?.includes("already been registered")) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
      throw createError;
    }

    const newUserId = newAuthUser.user.id;

    // Generate a unique username from the email local-part
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const username = `${baseUsername}_${Date.now().toString(36)}`;

    // --- Auto-create employee record for staff roles ---
    let employeeId: string | null = null;

    if (STAFF_ROLES.has(roleName)) {
      // Split full_name into first/last (first word = first name, rest = last name)
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

      // Generate unique employee code
      const employeeCode = `EMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

      const { data: newEmployee, error: empError } = await supabaseAdmin
        .from("employees")
        .insert({
          employee_code: employeeCode,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          date_of_joining: new Date().toISOString().split("T")[0],
          auth_user_id: newUserId,
          is_active: true,
        })
        .select("id")
        .single();

      if (empError) {
        // Roll back auth user
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw empError;
      }

      employeeId = (newEmployee as any).id;
    }

    // --- Insert into public.users ---
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: newUserId,
        full_name,
        email,
        phone: phone || null,
        role_id,
        username,
        employee_id: employeeId,
        must_change_password: true,
        is_active: true,
      });

    if (insertError) {
      // Roll back employee and auth user
      if (employeeId) {
        await supabaseAdmin.from("employees").delete().eq("id", employeeId);
      }
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw insertError;
    }

    return NextResponse.json({ success: true, user_id: newUserId }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating user:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

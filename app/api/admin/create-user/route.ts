import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient as createServerClient } from "@/src/lib/supabase/server";
import crypto from "crypto";

const ALLOWED_ROLES = ["admin", "super_admin"];
const ADMIN_TIER_ROLES = new Set(["admin", "super_admin"]);

/**
 * Roles that map to staff employees and require an employee record.
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
    const supabase = await createServerClient();
    const {
      data: { user: callerUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !callerUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Authorization check: resolve caller's role ---
    const { data: callerRecord, error: callerError } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", callerUser.id)
      .single();

    if (callerError || !callerRecord) {
      return NextResponse.json({ error: "Forbidden — could not resolve user role" }, { status: 403 });
    }

    const callerRole = (callerRecord as any)?.roles?.role_name as string | undefined;

    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- Validate request body ---
    const { full_name, email, phone, role_id, employee_id, resident_id, supplier_id } = await req.json();

    if (!full_name || !email || !role_id) {
      return NextResponse.json({ error: "full_name, email, and role_id are required" }, { status: 400 });
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

    // --- Auto-generate password ---
    const tempPassword = crypto.randomBytes(8).toString("hex");

    // --- Create auth user via admin API ---
    const supabaseAdmin = createAdminClient();

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: roleName,
        full_name: full_name
      }
    });

    if (createError) {
      if (createError.message?.includes("already registered")) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
      }
      throw createError;
    }

    const newUserId = newAuthUser.user.id;

    // Generate a unique username
    const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const username = `${baseUsername}_${Date.now().toString(36)}`;

    let finalEmployeeId = employee_id || null;
    let finalSupplierId = supplier_id || null;
    let linkedResidentId: string | null = null;

    // --- Link existing or create new employee record for staff roles ---
    if (STAFF_ROLES.has(roleName) && !finalEmployeeId) {
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
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
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw empError;
      }
      finalEmployeeId = (newEmployee as any).id;
    } else if (finalEmployeeId) {
       // Link existing employee
       await supabaseAdmin.from("employees").update({ auth_user_id: newUserId }).eq("id", finalEmployeeId);
    }

    // --- Link resident record if role is resident ---
    if (roleName === "resident") {
      if (!resident_id) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json({ error: "resident_id is required for resident role" }, { status: 400 });
      }
      const { data: residentLinkRecord, error: residentLinkError } = await supabaseAdmin
        .from("residents")
        .update({ auth_user_id: newUserId })
        .eq("id", resident_id)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();

      if (residentLinkError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        throw residentLinkError;
      }

      if (!residentLinkRecord) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json(
          { error: "Resident not found or already linked to another account" },
          { status: 409 }
        );
      }

      linkedResidentId = resident_id;
    }

    // --- Link supplier record if role is supplier ---
    if (roleName === "supplier" && finalSupplierId) {
       // Assuming suppliers table might have auth_user_id or we link it in public.users
       // Based on Row definition, suppliers doesn't have auth_user_id, but users has supplier_id
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
        employee_id: finalEmployeeId,
        supplier_id: finalSupplierId,
        must_change_password: true,
        is_active: true,
      });

    if (insertError) {
      if (linkedResidentId) {
        await supabaseAdmin
          .from("residents")
          .update({ auth_user_id: null })
          .eq("id", linkedResidentId)
          .eq("auth_user_id", newUserId);
      }
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      user_id: newUserId, 
      password: tempPassword // Returned once as per spec
    }, { status: 201 });

  } catch (err: any) {
    console.error("Error creating user:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

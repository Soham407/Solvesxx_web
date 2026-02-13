import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client lazily to avoid build-time errors
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Create Supabase client from user's auth token for verification
function getSupabaseFromRequest(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = request.headers.get("Authorization");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/** Roles that are allowed to manage QR codes. */
const QR_MANAGEMENT_ROLES = ["admin", "account", "security_supervisor"];

/**
 * Verify the request is from an authenticated user.
 * Returns the user or a NextResponse error.
 */
async function authenticateRequest(request: NextRequest) {
  const supabase = getSupabaseFromRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      role: null,
      error: NextResponse.json(
        { error: "Unauthorized - valid authentication required" },
        { status: 401 }
      ),
    };
  }

  return { user, role: null as string | null, error: null };
}

/**
 * After authentication, verify the user has a role that permits QR code management.
 * Queries the employees table to find the user's role.
 */
async function authorizeQrManagement(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: employee, error } = await supabase
    .from("employees")
    .select("role")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Role lookup error:", error);
    return {
      authorized: false,
      role: null,
      error: NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      ),
    };
  }

  if (!employee || !QR_MANAGEMENT_ROLES.includes(employee.role)) {
    return {
      authorized: false,
      role: employee?.role ?? null,
      error: NextResponse.json(
        { error: "Forbidden - insufficient permissions for QR code management" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, role: employee.role, error: null };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    // Authorize: verify user has QR management permissions
    const authz = await authorizeQrManagement(auth.user!.id);
    if (authz.error) return authz.error;

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { count, societyId, warehouseId, prefix } = body;

    // Validate inputs
    if (!count || count < 1 || count > 1000) {
      return NextResponse.json(
        { error: "Count must be between 1 and 1000" },
        { status: 400 }
      );
    }

    if (!societyId) {
      return NextResponse.json(
        { error: "Society ID is required" },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = `batch-${Date.now()}`;
    const timestamp = Date.now();

    // Build all QR code records in memory
    const qrCodeRecords = Array.from({ length: count }, (_, i) => {
      const sequenceNumber = i + 1;
      return {
        society_id: societyId,
        warehouse_id: warehouseId || null,
        batch_id: batchId,
        qr_code: `${prefix || "QR"}-${timestamp}-${sequenceNumber.toString().padStart(4, "0")}`,
        is_active: true,
        is_linked: false,
        sequence_number: sequenceNumber,
      };
    });

    // Bulk insert all QR codes in a single database call
    const { data: generatedQrCodes, error: insertError } = await supabase
      .from("qr_codes")
      .insert(qrCodeRecords)
      .select();

    if (insertError) {
      console.error("Error generating QR codes:", insertError);
      throw insertError;
    }

    // Log batch generation with the authenticated user's ID
    await supabase.from("qr_batch_logs").insert({
      batch_id: batchId,
      society_id: societyId,
      warehouse_id: warehouseId || null,
      count: count,
      generated_at: new Date().toISOString(),
      generated_by: auth.user!.id,
    });

    return NextResponse.json({
      success: true,
      batchId,
      count: generatedQrCodes?.length ?? 0,
      qrCodes: generatedQrCodes ?? [],
      downloadUrl: `/api/assets/qr-batch/${batchId}/download`,
    });
  } catch (error: unknown) {
    console.error("QR Batch Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR codes" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    // Authorize: verify user has QR management permissions
    const authz = await authorizeQrManagement(auth.user!.id);
    if (authz.error) return authz.error;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const societyId = searchParams.get("societyId");
    const batchId = searchParams.get("batchId");

    if (!societyId && !batchId) {
      return NextResponse.json(
        { error: "Society ID or Batch ID is required" },
        { status: 400 }
      );
    }

    let query = supabase.from("qr_codes").select("*");

    if (batchId) {
      query = query.eq("batch_id", batchId);
    } else if (societyId) {
      query = query.eq("society_id", societyId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      qrCodes: data || [],
    });
  } catch (error: unknown) {
    console.error("QR Batch Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch QR codes" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Roles that are allowed to download QR batches. Must match generate-qr-batch. */
const QR_MANAGEMENT_ROLES = ["admin", "account", "security_supervisor"];

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function authenticateAndAuthorize(request: NextRequest): Promise<{
  user: any | null;
  error: NextResponse | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = request.headers.get("Authorization");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized - valid authentication required" },
        { status: 401 }
      ),
    };
  }

  // Verify the user has a role that permits QR code management
  const admin = getSupabaseAdmin();
  const { data: employee, error: roleError } = await admin
    .from("employees")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (roleError) {
    console.error("[qr-batch/download] Role lookup error:", roleError);
    return {
      user: null,
      error: NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      ),
    };
  }

  if (!employee || !QR_MANAGEMENT_ROLES.includes(employee.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Forbidden - insufficient permissions for QR code management" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await authenticateAndAuthorize(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    // Fetch batch log first to verify ownership:
    // Only the user who generated the batch (or an admin) can download it.
    const { data: batchInfo, error: batchError } = await supabase
      .from("qr_batch_logs")
      .select("generated_by, generated_at")
      .eq("batch_id", batchId)
      .single();

    if (batchError || !batchInfo) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Ownership check: requester must have generated the batch OR be an admin/super_admin
    const { data: employee } = await supabase
      .from("employees")
      .select("role")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    const isAdmin = employee?.role === "admin";
    const isOwner = batchInfo.generated_by === auth.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Forbidden - you can only download batches you generated" },
        { status: 403 }
      );
    }

    // Fetch QR codes for this batch
    const { data: qrCodes, error } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("batch_id", batchId)
      .order("sequence_number", { ascending: true });

    if (error) throw error;

    if (!qrCodes || qrCodes.length === 0) {
      return NextResponse.json(
        { error: "No QR codes found for this batch" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
      generatedAt: batchInfo.generated_at,
      count: qrCodes.length,
      qrCodes: qrCodes.map((qr) => ({
        id: qr.id,
        qrCode: qr.qr_code,
        sequenceNumber: qr.sequence_number,
        isLinked: qr.is_linked,
      })),
    });
  } catch (error: unknown) {
    console.error("[qr-batch/download] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch" },
      { status: 500 }
    );
  }
}

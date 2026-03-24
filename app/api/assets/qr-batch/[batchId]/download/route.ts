import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

/** Roles that are allowed to download QR batches. Must match generate-qr-batch. */
const QR_MANAGEMENT_ROLES = ["admin", "account", "security_supervisor"];

function getSupabaseAdmin() {
  return createServiceRoleClient();
}

async function authenticateAndAuthorize(request: NextRequest): Promise<{
  user: any | null;
  error: NextResponse | null;
}> {
  const supabase = await createServerClient();

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

  const { data: userRecord, error: roleError } = await supabase
    .from("users")
    .select("roles(role_name)")
    .eq("id", user.id)
    .single();

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

  const roleRecord = Array.isArray((userRecord as any)?.roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !QR_MANAGEMENT_ROLES.includes(roleName)) {
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
    const { data: userRecord } = await supabase
      .from("users")
      .select("roles(role_name)")
      .eq("id", auth.user.id)
      .single();
    const roleRecord = Array.isArray((userRecord as any)?.roles)
      ? (userRecord as any).roles[0]
      : (userRecord as any)?.roles;

    const isAdmin = roleRecord?.role_name === "admin" || roleRecord?.role_name === "super_admin";
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

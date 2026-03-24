import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX_REGEX = /^[A-Z0-9-]{1,20}$/;

const GenerateBatchSchema = z.object({
  count: z.number().int().min(1).max(1000),
  societyId: z.string().regex(UUID_REGEX, "societyId must be a valid UUID"),
  warehouseId: z.string().regex(UUID_REGEX, "warehouseId must be a valid UUID").optional().nullable(),
  prefix: z
    .string()
    .regex(PREFIX_REGEX, "prefix must be 1-20 uppercase alphanumeric characters or hyphens")
    .optional(),
});

function getSupabaseAdmin() {
  return createServiceRoleClient();
}

/** Roles that are allowed to manage QR codes. */
const QR_MANAGEMENT_ROLES = ["admin", "account", "security_supervisor"];

/**
 * Verify the request is from an authenticated user.
 * Returns the user or a NextResponse error.
 */
async function authenticateRequest(): Promise<{
  user: any | null;
  role: string | null;
  error: NextResponse | null;
}> {
  // Route handlers should authenticate from the browser session cookies first.
  const supabase = await createServerClient();
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
 * After authentication, verify the user has a shared app role that permits QR code management.
 */
async function authorizeQrManagement(userId: string) {
  const supabase = await createServerClient();

  const { data: userRecord, error } = await supabase
    .from("users")
    .select("roles(role_name)")
    .eq("id", userId)
    .single();

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

  const roleRecord = Array.isArray((userRecord as any)?.roles)
    ? (userRecord as any).roles[0]
    : (userRecord as any)?.roles;
  const roleName = roleRecord?.role_name ?? null;

  if (!roleName || !QR_MANAGEMENT_ROLES.includes(roleName)) {
    return {
      authorized: false,
      role: roleName,
      error: NextResponse.json(
        { error: "Forbidden - insufficient permissions for QR code management" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, role: roleName, error: null };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    // Authorize: verify user has QR management permissions
    const authz = await authorizeQrManagement(auth.user!.id);
    if (authz.error) return authz.error;

    const supabase = getSupabaseAdmin();
    const body = await request.json();

    // Validate and parse inputs
    const parseResult = GenerateBatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }
    const { count, societyId, warehouseId, prefix } = parseResult.data;

    // Generate unpredictable batch ID
    const batchId = `batch-${crypto.randomUUID()}`;
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
    const auth = await authenticateRequest();
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

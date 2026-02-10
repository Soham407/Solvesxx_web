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
      error: NextResponse.json(
        { error: "Unauthorized - valid authentication required" },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

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
    const generatedQrCodes = [];

    // Generate QR codes in batch
    for (let i = 0; i < count; i++) {
      const sequenceNumber = i + 1;
      const qrCode = `${prefix || "QR"}-${Date.now()}-${sequenceNumber.toString().padStart(4, "0")}`;
      
      const { data, error } = await supabase
        .from("qr_codes")
        .insert({
          society_id: societyId,
          warehouse_id: warehouseId || null,
          batch_id: batchId,
          qr_code: qrCode,
          is_active: true,
          is_linked: false,
          sequence_number: sequenceNumber,
        })
        .select()
        .single();

      if (error) {
        console.error("Error generating QR code:", error);
        throw error;
      }

      generatedQrCodes.push(data);
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
      count: generatedQrCodes.length,
      qrCodes: generatedQrCodes,
      downloadUrl: `/api/assets/qr-batch/${batchId}/download`,
    });
  } catch (error: unknown) {
    console.error("QR Batch Generation Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate QR codes";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

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
    const message = error instanceof Error ? error.message : "Failed to fetch QR codes";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

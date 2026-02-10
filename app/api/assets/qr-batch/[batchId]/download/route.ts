import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client lazily to avoid build-time errors
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Verify the request is from an authenticated user.
 */
async function authenticateRequest(request: NextRequest) {
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

  return { user, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
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

    // Fetch batch info
    const { data: batchInfo } = await supabase
      .from("qr_batch_logs")
      .select("*")
      .eq("batch_id", batchId)
      .single();

    return NextResponse.json({
      success: true,
      batchId,
      generatedAt: batchInfo?.generated_at,
      count: qrCodes.length,
      qrCodes: qrCodes.map((qr) => ({
        id: qr.id,
        qrCode: qr.qr_code,
        sequenceNumber: qr.sequence_number,
        isLinked: qr.is_linked,
        downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/assets/qr/${qr.id}/image`,
      })),
    });
  } catch (error: unknown) {
    console.error("QR Batch Download Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch batch";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

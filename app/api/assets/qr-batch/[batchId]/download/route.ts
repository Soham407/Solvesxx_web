import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = getSupabaseClient();
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
  } catch (error: any) {
    console.error("QR Batch Download Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch batch" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createDemoOtpSession,
  getDemoOtpCode,
  isDemoOtpEnabled,
  normalizeDemoPhoneNumber,
} from "@/src/lib/mobile/demoOtp";

const VerifyDemoOtpSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  otp: z.string().trim().length(6),
});

/**
 * Public staging-only endpoint for backend-controlled demo OTP verification.
 * Safe because it is env-gated, phone-whitelisted, role-validated, and returns a real Supabase session only after linkage checks pass.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDemoOtpEnabled()) {
      return NextResponse.json({ error: "Demo OTP is disabled." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = VerifyDemoOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    if (parsed.data.otp !== getDemoOtpCode()) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
    }

    const normalizedPhone = normalizeDemoPhoneNumber(parsed.data.phone);
    const result = await createDemoOtpSession(normalizedPhone);

    return NextResponse.json({
      ok: true,
      phone: normalizedPhone,
      role: result.user.roleName,
      session: result.session,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify demo OTP." },
      { status: 400 },
    );
  }
}

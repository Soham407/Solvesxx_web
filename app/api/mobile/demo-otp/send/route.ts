import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  isDemoOtpEnabled,
  normalizeDemoPhoneNumber,
  resolveDemoOtpUser,
} from "@/src/lib/mobile/demoOtp";

const SendDemoOtpSchema = z.object({
  phone: z.string().trim().min(6).max(20),
});

/**
 * Public staging-only endpoint for demo OTP initiation.
 * Safe because it only validates env-gated, whitelisted phone numbers and does not create a session.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDemoOtpEnabled()) {
      return NextResponse.json({ error: "Demo OTP is disabled." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = SendDemoOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeDemoPhoneNumber(parsed.data.phone);
    const resolvedUser = await resolveDemoOtpUser(normalizedPhone);

    return NextResponse.json({
      ok: true,
      phone: normalizedPhone,
      role: resolvedUser.roleName,
      message: "Demo OTP sent.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start demo OTP sign-in." },
      { status: 400 },
    );
  }
}

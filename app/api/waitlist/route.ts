import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, company } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: email.toLowerCase().trim(), name: name?.trim() || null, company: company?.trim() || null });

  if (error) {
    // Unique constraint violation — already on the list
    if (error.code === "23505") {
      return NextResponse.json({ message: "You're already on the waitlist! We'll be in touch soon." });
    }
    console.error("[waitlist] insert error:", error);
    return NextResponse.json({ error: "Failed to join waitlist. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ message: "You're on the waitlist! We'll notify you at launch. 🎉" });
}

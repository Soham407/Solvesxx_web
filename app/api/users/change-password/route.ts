import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/src/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    // --- Authentication check ---
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Validate request body ---
    const { new_password } = await req.json();

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // --- Update password via admin API ---
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) throw updateError;

    // --- Clear the must_change_password flag ---
    const { error: flagError } = await supabaseAdmin
      .from("users")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (flagError) {
      // Password was changed but the flag could not be cleared.
      // Log with user ID so an operator can manually clear must_change_password.
      console.error(`[change-password] Failed to clear must_change_password for user ${user.id}:`, flagError);
      return NextResponse.json(
        { error: "Password changed but account could not be fully updated. Please contact your administrator." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error changing password:", err);
    return NextResponse.json({ error: err.message || "Failed to change password" }, { status: 500 });
  }
}

const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizePhoneNumber(input) {
  const trimmed = String(input || "").trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return trimmed;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload;
}

async function validatePhone(label, expectedRole, phone, context) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const sendPayload = await postJson(`${context.baseUrl}/api/mobile/demo-otp/send`, {
    phone: normalizedPhone,
  });

  if (sendPayload.role !== expectedRole) {
    throw new Error(`${label}: expected send role ${expectedRole}, received ${sendPayload.role}`);
  }

  const verifyPayload = await postJson(`${context.baseUrl}/api/mobile/demo-otp/verify`, {
    phone: normalizedPhone,
    otp: context.demoOtpCode,
  });

  if (verifyPayload.role !== expectedRole) {
    throw new Error(`${label}: expected verify role ${expectedRole}, received ${verifyPayload.role}`);
  }

  if (!verifyPayload.session?.access_token || !verifyPayload.session?.refresh_token) {
    throw new Error(`${label}: demo OTP verify did not return a complete session`);
  }

  const accessToken = verifyPayload.session.access_token;
  const { data: userData, error: userError } = await context.anonClient.auth.getUser(accessToken);

  if (userError) {
    throw userError;
  }

  const authUser = userData?.user;
  if (!authUser?.id) {
    throw new Error(`${label}: session did not resolve to an auth user`);
  }

  if (normalizePhoneNumber(authUser.phone || "") !== normalizedPhone) {
    throw new Error(`${label}: auth user phone mismatch`);
  }

  const { data: platformUser, error: platformUserError } = await context.serviceClient
    .from("users")
    .select("id, is_active, employee_id, phone, roles(role_name)")
    .eq("id", authUser.id)
    .single();

  if (platformUserError) {
    throw platformUserError;
  }

  const roleRecord = Array.isArray(platformUser.roles) ? platformUser.roles[0] : platformUser.roles;
  if (roleRecord?.role_name !== expectedRole) {
    throw new Error(`${label}: public.users role mismatch`);
  }

  if (platformUser.is_active === false) {
    throw new Error(`${label}: public.users is inactive`);
  }

  if (expectedRole === "security_guard") {
    if (!platformUser.employee_id) {
      throw new Error(`${label}: guard missing employee linkage`);
    }

    const { data: guardRow, error: guardError } = await context.serviceClient
      .from("security_guards")
      .select("id, assigned_location_id, is_active")
      .eq("employee_id", platformUser.employee_id)
      .single();

    if (guardError) {
      throw guardError;
    }

    if (!guardRow.assigned_location_id) {
      throw new Error(`${label}: guard missing assigned location`);
    }

    if (guardRow.is_active === false) {
      throw new Error(`${label}: guard profile inactive`);
    }
  }

  if (expectedRole === "resident") {
    const { data: residentRow, error: residentError } = await context.serviceClient
      .from("residents")
      .select("id, flat_id, is_active, auth_user_id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (residentError) {
      throw residentError;
    }

    if (!residentRow.flat_id) {
      throw new Error(`${label}: resident missing flat linkage`);
    }

    if (residentRow.is_active === false) {
      throw new Error(`${label}: resident inactive`);
    }
  }

  return {
    label,
    role: expectedRole,
    phone: normalizedPhone,
    authUserId: authUser.id,
    status: "validated",
  };
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
  const demoOtpCode = requireEnv("DEMO_OTP_CODE");
  const guardPhone = requireEnv("DEMO_OTP_TEST_GUARD_PHONE");
  const residentPhone = requireEnv("DEMO_OTP_TEST_RESIDENT_PHONE");

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const context = {
    baseUrl,
    demoOtpCode,
    serviceClient,
    anonClient,
  };

  const results = [];
  results.push(await validatePhone("guard", "security_guard", guardPhone, context));
  results.push(await validatePhone("resident", "resident", residentPhone, context));

  console.table(results);
}

main().catch((error) => {
  console.error("Demo OTP validation failed.");
  console.error(error);
  process.exit(1);
});

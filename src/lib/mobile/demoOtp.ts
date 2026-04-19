import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/src/lib/platform/server";

type DemoRole = "resident" | "security_guard";

type DemoResolvedUser = {
  authUserId: string;
  employeeId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  roleName: DemoRole;
};

const DEFAULT_ALLOWED_ROLES = new Set<DemoRole>(["resident", "security_guard"]);

export function normalizeDemoPhoneNumber(input: string) {
  const trimmed = input.trim();
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

function buildPhoneCandidates(phone: string) {
  const normalized = normalizeDemoPhoneNumber(phone);
  const digits = normalized.replace(/\D/g, "");
  const candidates = new Set<string>([normalized, digits]);

  if (digits.length >= 10) {
    const lastTen = digits.slice(-10);
    candidates.add(lastTen);
    candidates.add(`+91${lastTen}`);
  }

  return [...candidates].filter(Boolean);
}

export function isDemoOtpEnabled() {
  return process.env.DEMO_OTP_ENABLED === "true";
}

export function getDemoOtpCode() {
  return (process.env.DEMO_OTP_CODE || "").trim();
}

export function getAllowedDemoRoles() {
  const configured = (process.env.DEMO_OTP_ALLOWED_ROLES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as DemoRole[];

  if (configured.length === 0) {
    return DEFAULT_ALLOWED_ROLES;
  }

  return new Set(configured.filter((value): value is DemoRole => DEFAULT_ALLOWED_ROLES.has(value)));
}

export function isAllowedDemoPhone(phone: string) {
  const configured = (process.env.DEMO_OTP_ALLOWED_PHONES || "")
    .split(",")
    .map((value) => normalizeDemoPhoneNumber(value))
    .filter(Boolean);

  if (configured.length === 0) {
    return false;
  }

  const candidateSet = new Set(buildPhoneCandidates(phone));
  return configured.some((value) => candidateSet.has(value));
}

function createAnonAuthClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public env is not configured.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

async function findResidentByPhone(phone: string) {
  const supabaseAdmin = createServiceRoleClient();

  for (const candidate of buildPhoneCandidates(phone)) {
    const { data, error } = await supabaseAdmin
      .from("residents")
      .select("id, auth_user_id, full_name, flat_id, is_active, phone, alternate_phone")
      .or(`phone.eq.${candidate},alternate_phone.eq.${candidate}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return data;
    }
  }

  return null;
}

async function findGuardUserByPhone(phone: string) {
  const supabaseAdmin = createServiceRoleClient();

  for (const candidate of buildPhoneCandidates(phone)) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, employee_id, full_name, email, is_active, phone, roles(role_name)")
      .eq("phone", candidate)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return data;
    }
  }

  for (const candidate of buildPhoneCandidates(phone)) {
    const { data: employeeRecord, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, auth_user_id")
      .eq("phone", candidate)
      .limit(1)
      .maybeSingle();

    if (employeeError) throw employeeError;
    if (!employeeRecord?.auth_user_id) continue;

    const { data: linkedUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, employee_id, full_name, email, is_active, phone, roles(role_name)")
      .eq("id", employeeRecord.auth_user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (linkedUser) {
      return linkedUser;
    }
  }

  return null;
}

export async function resolveDemoOtpUser(phone: string): Promise<DemoResolvedUser> {
  const normalizedPhone = normalizeDemoPhoneNumber(phone);
  const allowedRoles = getAllowedDemoRoles();
  const supabaseAdmin = createServiceRoleClient();

  if (!isDemoOtpEnabled()) {
    throw new Error("Demo OTP is disabled.");
  }

  if (!getDemoOtpCode()) {
    throw new Error("DEMO_OTP_CODE is not configured.");
  }

  if (!isAllowedDemoPhone(normalizedPhone)) {
    throw new Error("This phone number is not enabled for demo OTP.");
  }

  const resident = await findResidentByPhone(normalizedPhone);
  if (resident) {
    if (!allowedRoles.has("resident")) {
      throw new Error("Resident demo OTP is not enabled.");
    }

    if (!resident.auth_user_id) {
      throw new Error("Resident is not linked to an auth user.");
    }

    if (resident.is_active === false) {
      throw new Error("Resident account is inactive.");
    }

    if (!resident.flat_id) {
      throw new Error("Resident is not linked to a flat.");
    }

    const { data: linkedUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, is_active, roles(role_name)")
      .eq("id", resident.auth_user_id)
      .maybeSingle();

    if (userError) throw userError;
    if (!linkedUser) {
      throw new Error("Resident auth linkage is incomplete.");
    }

    const roleRecord = Array.isArray((linkedUser as any).roles)
      ? (linkedUser as any).roles[0]
      : (linkedUser as any).roles;
    if (roleRecord?.role_name !== "resident") {
      throw new Error("Linked auth user does not have resident role.");
    }

    if ((linkedUser as any).is_active === false) {
      throw new Error("Resident login account is inactive.");
    }

    return {
      authUserId: resident.auth_user_id,
      employeeId: null,
      fullName: resident.full_name,
      phone: normalizedPhone,
      email: (linkedUser as any).email ?? null,
      roleName: "resident",
    };
  }

  const guardUser = await findGuardUserByPhone(normalizedPhone);
  if (!guardUser) {
    throw new Error("No demo-enabled user was found for this phone number.");
  }

  const roleRecord = Array.isArray((guardUser as any).roles)
    ? (guardUser as any).roles[0]
    : (guardUser as any).roles;
  const roleName = roleRecord?.role_name as DemoRole | undefined;

  if (roleName !== "security_guard" || !allowedRoles.has("security_guard")) {
    throw new Error("This phone number is not linked to a demo-enabled guard account.");
  }

  if ((guardUser as any).is_active === false) {
    throw new Error("Guard login account is inactive.");
  }

  if (!(guardUser as any).employee_id) {
    throw new Error("Guard account is not linked to an employee record.");
  }

  const { data: guardRecord, error: guardError } = await supabaseAdmin
    .from("security_guards")
    .select("id, assigned_location_id, is_active")
    .eq("employee_id", (guardUser as any).employee_id)
    .maybeSingle();

  if (guardError) throw guardError;
  if (!guardRecord) {
    throw new Error("Guard profile is not linked.");
  }
  if (guardRecord.is_active === false) {
    throw new Error("Guard profile is inactive.");
  }
  if (!guardRecord.assigned_location_id) {
    throw new Error("Guard is not assigned to a location.");
  }

  const { data: shiftAssignment, error: shiftError } = await supabaseAdmin
    .from("employee_shift_assignments")
    .select("id")
    .eq("employee_id", (guardUser as any).employee_id)
    .eq("is_active", true)
    .order("assigned_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shiftError) throw shiftError;
  if (!shiftAssignment) {
    throw new Error("Guard does not have an active shift assignment.");
  }

  return {
    authUserId: (guardUser as any).id,
    employeeId: (guardUser as any).employee_id,
    fullName: (guardUser as any).full_name,
    phone: normalizedPhone,
    email: (guardUser as any).email ?? null,
    roleName: "security_guard",
  };
}

export async function createDemoOtpSession(phone: string) {
  const supabaseAdmin = createServiceRoleClient();
  const anonAuthClient = createAnonAuthClient();
  const resolvedUser = await resolveDemoOtpUser(phone);
  const oneTimePassword = `Demo!${crypto.randomUUID()}Aa1`;

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(resolvedUser.authUserId, {
    password: oneTimePassword,
    phone: resolvedUser.phone,
    phone_confirm: true,
  });

  if (updateError) {
    throw updateError;
  }

  const { data, error } = await anonAuthClient.auth.signInWithPassword({
    phone: resolvedUser.phone,
    password: oneTimePassword,
  });

  if (error) {
    const message = error.message.toLowerCase();
    const phoneProviderDisabled =
      message.includes("phone logins are disabled") ||
      message.includes("unsupported phone provider");

    if (!phoneProviderDisabled || !resolvedUser.email) {
      throw error;
    }

    const emailSignIn = await anonAuthClient.auth.signInWithPassword({
      email: resolvedUser.email,
      password: oneTimePassword,
    });

    if (emailSignIn.error) {
      throw emailSignIn.error;
    }

    if (!emailSignIn.data.session) {
      throw new Error("Demo OTP sign-in did not return a session.");
    }

    return {
      session: emailSignIn.data.session,
      user: resolvedUser,
    };
  }

  if (!data.session) {
    throw new Error("Demo OTP sign-in did not return a session.");
  }

  return {
    session: data.session,
    user: resolvedUser,
  };
}

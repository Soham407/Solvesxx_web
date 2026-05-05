import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/src/lib/platform/server";
import { resolveWorkforceIdentityByPhone } from "@/src/lib/workforce/boundary";

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

export async function resolveDemoOtpUser(phone: string): Promise<DemoResolvedUser> {
  const normalizedPhone = normalizeDemoPhoneNumber(phone);
  const allowedRoles = getAllowedDemoRoles();

  if (!isDemoOtpEnabled()) {
    throw new Error("Demo OTP is disabled.");
  }

  if (!getDemoOtpCode()) {
    throw new Error("DEMO_OTP_CODE is not configured.");
  }

  if (!isAllowedDemoPhone(normalizedPhone)) {
    throw new Error("This phone number is not enabled for demo OTP.");
  }

  const identity = await resolveWorkforceIdentityByPhone(normalizedPhone);
  if (identity?.actorKind === "resident") {
    if (!allowedRoles.has("resident")) {
      throw new Error("Resident demo OTP is not enabled.");
    }

    if (!identity.authUserId) {
      throw new Error("Resident is not linked to an auth user.");
    }

    if (!identity.flatId) {
      throw new Error("Resident is not linked to a flat.");
    }

    if (identity.roleName !== "resident") {
      throw new Error("Linked auth user does not have resident role.");
    }

    return {
      authUserId: identity.authUserId,
      employeeId: null,
      fullName: identity.fullName,
      phone: normalizedPhone,
      email: identity.email,
      roleName: "resident",
    };
  }

  if (!identity || identity.actorKind !== "guard") {
    throw new Error("No demo-enabled user was found for this phone number.");
  }

  if (!allowedRoles.has("security_guard")) {
    throw new Error("This phone number is not linked to a demo-enabled guard account.");
  }

  if (!identity.employeeId) {
    throw new Error("Guard account is not linked to an employee record.");
  }

  return {
    authUserId: identity.authUserId,
    employeeId: identity.employeeId,
    fullName: identity.fullName,
    phone: normalizedPhone,
    email: identity.email,
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

type MaybeRelation<T> = T | T[] | null | undefined;

function readSingleRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export type WorkforceUserRecord = {
  id: string;
  employee_id: string | null;
  full_name: string | null;
  role_name?: string | null;
};

export type WorkforceEmployeeRecord = {
  id: string;
  employee_code: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type BoundaryGuardRecord = {
  id: string;
  guard_code: string | null;
};

export type BoundaryResidentRecord = {
  id: string;
  resident_code: string | null;
  full_name: string | null;
  flat_id: string | null;
};

export type WorkforceActor =
  | {
      actorKind: "employee" | "guard";
      authUserId: string;
      employeeId: string;
      userId: string | null;
      roleName: string | null;
      fullName: string | null;
      employeeCode: string | null;
      guardId: string | null;
      guardCode: string | null;
      residentId: null;
      flatId: null;
    }
  | {
      actorKind: "resident";
      authUserId: string;
      employeeId: null;
      userId: string | null;
      roleName: string | null;
      fullName: string | null;
      employeeCode: string | null;
      guardId: null;
      guardCode: null;
      residentId: string;
      flatId: string | null;
    };

export type WorkforceDirectoryInput = {
  employees: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  guards: Array<Record<string, unknown>>;
  shifts: Array<Record<string, unknown>>;
};

export type WorkforcePhoneIdentity =
  | {
      actorKind: "resident";
      authUserId: string;
      employeeId: null;
      fullName: string | null;
      email: string | null;
      roleName: "resident";
      residentId: string;
      flatId: string | null;
    }
  | {
      actorKind: "employee" | "guard";
      authUserId: string;
      employeeId: string;
      fullName: string | null;
      email: string | null;
      roleName: "security_guard" | "employee";
      residentId: null;
      flatId: null;
      guardId: string | null;
      guardCode: string | null;
    };

type WorkforceDirectoryUserRecord = {
  id?: string | null;
  employee_id?: string | null;
  must_change_password?: boolean | null;
  roles?: MaybeRelation<{ role_name?: string | null }>;
};

type WorkforceDirectoryGuardRecord = {
  id?: string | null;
  employee_id?: string | null;
  guard_code?: string | null;
  assigned_location_id?: string | null;
  assigned_location?: MaybeRelation<{ location_name?: string | null }>;
  is_active?: boolean | null;
};

type WorkforceDirectoryShiftRecord = {
  employee_id?: string | null;
  shift_id?: string | null;
  shifts?: MaybeRelation<{ shift_name?: string | null }>;
};

type WorkforceDirectoryEmployeeRecord = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  designations?: MaybeRelation<{ designation_name?: string | null }>;
};

export function deriveWorkforceActor(input: {
  authUserId: string;
  userRecord: WorkforceUserRecord | null;
  employeeRecord: WorkforceEmployeeRecord | null;
  guardRecord: BoundaryGuardRecord | null;
  residentRecord: BoundaryResidentRecord | null;
}): WorkforceActor | null {
  const { authUserId, userRecord, employeeRecord, guardRecord, residentRecord } = input;

  if (residentRecord && !employeeRecord) {
    return {
      actorKind: "resident",
      authUserId,
      employeeId: null,
      userId: userRecord?.id ?? null,
      roleName: userRecord?.role_name ?? "resident",
      fullName: residentRecord.full_name,
      employeeCode: residentRecord.resident_code,
      guardId: null,
      guardCode: null,
      residentId: residentRecord.id,
      flatId: residentRecord.flat_id,
    };
  }

  if (!employeeRecord && !userRecord) {
    return null;
  }

  const employeeId = employeeRecord?.id ?? userRecord?.employee_id ?? null;
  if (!employeeId) {
    return null;
  }

  const roleName = userRecord?.role_name ?? (guardRecord ? "security_guard" : "employee");
  return {
    actorKind: guardRecord ? "guard" : "employee",
    authUserId,
    employeeId,
    userId: userRecord?.id ?? null,
    roleName,
    fullName: employeeRecord ? buildFullName(employeeRecord.first_name, employeeRecord.last_name) : userRecord?.full_name ?? null,
    employeeCode: employeeRecord?.employee_code ?? null,
    guardId: guardRecord?.id ?? null,
    guardCode: guardRecord?.guard_code ?? null,
    residentId: null,
    flatId: null,
  };
}

export function getCanonicalEmployeeIdFromActor(actor: WorkforceActor | null | undefined) {
  if (!actor?.employeeId) {
    throw new Error("Employee record not found for the authenticated user.");
  }

  return actor.employeeId;
}

function normalizePhoneCandidates(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  const candidates = new Set<string>([trimmed, digits]);

  if (trimmed.startsWith("+")) {
    candidates.add(`+${digits}`);
  }

  if (digits.length >= 10) {
    const lastTen = digits.slice(-10);
    candidates.add(lastTen);
    candidates.add(`+91${lastTen}`);
  }

  return [...candidates].filter(Boolean);
}

export async function resolveWorkforceIdentityByPhone(phone: string): Promise<WorkforcePhoneIdentity | null> {
  const { createServiceRoleClient } = await import("@/src/lib/platform/server");
  const supabaseAdmin = createServiceRoleClient();

  for (const candidate of normalizePhoneCandidates(phone)) {
    const { data, error } = await supabaseAdmin
      .from("residents")
      .select("id, auth_user_id, full_name, flat_id, is_active, phone, alternate_phone")
      .or(`phone.eq.${candidate},alternate_phone.eq.${candidate}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", data.auth_user_id)
        .maybeSingle();

      return {
        actorKind: "resident",
        authUserId: data.auth_user_id ?? "",
        employeeId: null,
        fullName: data.full_name ?? null,
        email: userData?.email ?? null,
        roleName: "resident",
        residentId: data.id,
        flatId: data.flat_id ?? null,
      };
    }
  }

  for (const candidate of normalizePhoneCandidates(phone)) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, employee_id, full_name, email, is_active, phone, roles(role_name)")
      .eq("phone", candidate)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const roleRelation = Array.isArray(data.roles) ? data.roles[0] : data.roles;
      if (roleRelation?.role_name !== "security_guard") {
        continue;
      }

      const { data: guardRecord, error: guardError } = await supabaseAdmin
        .from("security_guards")
        .select("id, guard_code")
        .eq("employee_id", data.employee_id)
        .maybeSingle();

      if (guardError) throw guardError;

      return {
        actorKind: guardRecord ? "guard" : "employee",
        authUserId: data.id,
        employeeId: data.employee_id ?? "",
        fullName: data.full_name ?? null,
        email: data.email ?? null,
        roleName: roleRelation?.role_name === "security_guard" ? "security_guard" : "employee",
        residentId: null,
        flatId: null,
        guardId: guardRecord?.id ?? null,
        guardCode: guardRecord?.guard_code ?? null,
      };
    }
  }

  for (const candidate of normalizePhoneCandidates(phone)) {
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
    if (!linkedUser) continue;

    const roleRelation = Array.isArray(linkedUser.roles) ? linkedUser.roles[0] : linkedUser.roles;
    if (roleRelation?.role_name !== "security_guard") {
      continue;
    }

    const { data: guardRecord, error: guardError } = await supabaseAdmin
      .from("security_guards")
      .select("id, guard_code")
      .eq("employee_id", employeeRecord.id)
      .maybeSingle();

    if (guardError) throw guardError;

    return {
      actorKind: guardRecord ? "guard" : "employee",
      authUserId: linkedUser.id,
      employeeId: employeeRecord.id,
      fullName: linkedUser.full_name ?? null,
      email: linkedUser.email ?? null,
      roleName: "security_guard",
      residentId: null,
      flatId: null,
      guardId: guardRecord?.id ?? null,
      guardCode: guardRecord?.guard_code ?? null,
    };
  }

  return null;
}

export async function resolveCurrentWorkforceActor() {
  const { supabase } = await import("@/src/lib/supabaseClient");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated. Please log in and try again.");
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      `
        id,
        employee_id,
        full_name,
        roles (
          role_name
        )
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (userError && userError.code !== "PGRST116") {
    throw userError;
  }

  const userRecord = userData
    ? {
        id: userData.id,
        employee_id: userData.employee_id ?? null,
        full_name: userData.full_name ?? null,
        role_name: readSingleRelation(userData.roles)?.role_name ?? null,
      }
    : null;

  let employeeRecord: WorkforceEmployeeRecord | null = null;
  if (userRecord?.employee_id) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_code, first_name, last_name")
      .eq("id", userRecord.employee_id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    employeeRecord = data
      ? {
          id: data.id,
          employee_code: data.employee_code ?? null,
          first_name: data.first_name ?? null,
          last_name: data.last_name ?? null,
        }
      : null;
  } else {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_code, first_name, last_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    employeeRecord = data
      ? {
          id: data.id,
          employee_code: data.employee_code ?? null,
          first_name: data.first_name ?? null,
          last_name: data.last_name ?? null,
        }
      : null;
  }

  let guardRecord: BoundaryGuardRecord | null = null;
  if (employeeRecord?.id) {
    const { data, error } = await supabase
      .from("security_guards")
      .select("id, guard_code")
      .eq("employee_id", employeeRecord.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    guardRecord = data ? { id: data.id, guard_code: data.guard_code ?? null } : null;
  }

  let residentRecord: BoundaryResidentRecord | null = null;
  if (!employeeRecord) {
    const { data, error } = await supabase
      .from("residents")
      .select("id, resident_code, full_name, flat_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    residentRecord = data
      ? {
          id: data.id,
          resident_code: data.resident_code ?? null,
          full_name: data.full_name ?? null,
          flat_id: data.flat_id ?? null,
        }
      : null;
  }

  const actor = deriveWorkforceActor({
    authUserId: user.id,
    userRecord,
    employeeRecord,
    guardRecord,
    residentRecord,
  });

  if (!actor) {
    throw new Error("User profile not set up. Please contact admin.");
  }

  return actor;
}

export async function getCanonicalEmployeeId() {
  const actor = await resolveCurrentWorkforceActor();
  return getCanonicalEmployeeIdFromActor(actor);
}

export function assembleEmployeeDirectory(input: WorkforceDirectoryInput) {
  const userMap = new Map<
    string,
    {
      linked_user_id: string | null;
      role_name: string | null;
      must_change_password: boolean;
    }
  >();

  (input.users || []).forEach((record) => {
    const userRecord = record as WorkforceDirectoryUserRecord;
    if (!userRecord?.employee_id || userMap.has(userRecord.employee_id)) return;
    const roleRecord = readSingleRelation(userRecord.roles);
    userMap.set(userRecord.employee_id, {
      linked_user_id: userRecord.id ?? null,
      role_name: roleRecord?.role_name ?? null,
      must_change_password: Boolean(userRecord.must_change_password),
    });
  });

  const guardMap = new Map<
    string,
    {
      guard_profile_id: string | null;
      guard_code: string | null;
      assigned_location_id: string | null;
      assigned_location_name: string | null;
      guard_is_active: boolean;
    }
  >();

  (input.guards || []).forEach((record) => {
    const guardRecord = record as WorkforceDirectoryGuardRecord;
    if (!guardRecord?.employee_id || guardMap.has(guardRecord.employee_id)) return;
    const assignedLocation = readSingleRelation(guardRecord.assigned_location);
    guardMap.set(guardRecord.employee_id, {
      guard_profile_id: guardRecord.id ?? null,
      guard_code: guardRecord.guard_code ?? null,
      assigned_location_id: guardRecord.assigned_location_id ?? null,
      assigned_location_name: assignedLocation?.location_name ?? null,
      guard_is_active: guardRecord.is_active !== false,
    });
  });

  const shiftMap = new Map<string, { shift_id: string | null; shift_name: string | null }>();

  (input.shifts || []).forEach((record) => {
    const shiftRecordInput = record as WorkforceDirectoryShiftRecord;
    if (!shiftRecordInput?.employee_id || shiftMap.has(shiftRecordInput.employee_id)) return;
    const shiftRecord = readSingleRelation(shiftRecordInput.shifts);
    shiftMap.set(shiftRecordInput.employee_id, {
      shift_id: shiftRecordInput.shift_id ?? null,
      shift_name: shiftRecord?.shift_name ?? null,
    });
  });

  return (input.employees || []).map((employee) => {
    const employeeRecord = employee as WorkforceDirectoryEmployeeRecord;
    const designation = readSingleRelation(employeeRecord.designations);
    const linkedUser = userMap.get(employeeRecord.id);
    const linkedGuard = guardMap.get(employeeRecord.id);
    const shift = shiftMap.get(employeeRecord.id);

    return {
      ...employeeRecord,
      full_name: buildFullName(employeeRecord.first_name, employeeRecord.last_name) ?? "Unknown",
      designation_name: designation?.designation_name || employeeRecord.department || "Employee",
      linked_user_id: linkedUser?.linked_user_id ?? null,
      role_name: linkedUser?.role_name ?? null,
      must_change_password: linkedUser?.must_change_password ?? false,
      guard_profile_id: linkedGuard?.guard_profile_id ?? null,
      guard_code: linkedGuard?.guard_code ?? null,
      assigned_location_id: linkedGuard?.assigned_location_id ?? null,
      assigned_location_name: linkedGuard?.assigned_location_name ?? null,
      guard_is_active: linkedGuard?.guard_is_active ?? false,
      shift_id: shift?.shift_id ?? null,
      shift_name: shift?.shift_name ?? null,
    };
  });
}

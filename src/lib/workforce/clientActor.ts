import { supabase } from "@/src/lib/supabaseClient";
import { buildFullName, readSingleRelation } from "@/src/lib/workforce/workforceDirectory";

type WorkforceUserRecord = {
  id: string;
  employee_id: string | null;
  full_name: string | null;
  role_name?: string | null;
};

type WorkforceEmployeeRecord = {
  id: string;
  employee_code: string | null;
  first_name: string | null;
  last_name: string | null;
};

type BoundaryGuardRecord = {
  id: string;
  guard_code: string | null;
};

type BoundaryResidentRecord = {
  id: string;
  resident_code: string | null;
  full_name: string | null;
  flat_id: string | null;
};

export type ClientWorkforceActor =
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

function deriveClientWorkforceActor(input: {
  authUserId: string;
  userRecord: WorkforceUserRecord | null;
  employeeRecord: WorkforceEmployeeRecord | null;
  guardRecord: BoundaryGuardRecord | null;
  residentRecord: BoundaryResidentRecord | null;
}): ClientWorkforceActor | null {
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

export async function resolveCurrentWorkforceActorClient() {
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

  const actor = deriveClientWorkforceActor({
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

export async function getCanonicalEmployeeIdClient() {
  const actor = await resolveCurrentWorkforceActorClient();

  if (!actor.employeeId) {
    throw new Error("Employee record not found for the authenticated user.");
  }

  return actor.employeeId;
}

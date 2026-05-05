type MaybeRelation<T> = T | T[] | null | undefined;

export function readSingleRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function buildFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

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

export type WorkforceDirectoryInput = {
  employees: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  guards: Array<Record<string, unknown>>;
  shifts: Array<Record<string, unknown>>;
};

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
      full_name: buildFullName(employeeRecord.first_name, employeeRecord.last_name),
      designation_name: designation?.designation_name ?? null,
      linked_user_id: linkedUser?.linked_user_id ?? null,
      role_name: linkedUser?.role_name ?? null,
      must_change_password: linkedUser?.must_change_password ?? false,
      assigned_location_id: linkedGuard?.assigned_location_id ?? null,
      assigned_location_name: linkedGuard?.assigned_location_name ?? null,
      guard_profile_id: linkedGuard?.guard_profile_id ?? null,
      guard_code: linkedGuard?.guard_code ?? null,
      guard_is_active: linkedGuard?.guard_is_active ?? false,
      shift_id: shift?.shift_id ?? null,
      shift_name: shift?.shift_name ?? null,
    };
  });
}

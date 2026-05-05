import { describe, expect, it } from "vitest";

import {
  assembleEmployeeDirectory,
  deriveWorkforceActor,
  getCanonicalEmployeeIdFromActor,
} from "@/src/lib/workforce/boundary";

describe("workforce boundary", () => {
  it("resolves a linked guard account to a canonical employee id", () => {
    const actor = deriveWorkforceActor({
      authUserId: "auth-1",
      userRecord: {
        id: "auth-1",
        employee_id: "emp-1",
        full_name: "Guard Person",
        role_name: "security_guard",
      },
      employeeRecord: {
        id: "emp-1",
        employee_code: "EMP-001",
        first_name: "Guard",
        last_name: "Person",
      },
      guardRecord: {
        id: "guard-1",
        guard_code: "GRD-001",
      },
      residentRecord: null,
    });

    expect(actor).not.toBeNull();
    expect(actor?.actorKind).toBe("guard");
    expect(actor?.employeeId).toBe("emp-1");
    expect(actor?.guardId).toBe("guard-1");
    expect(getCanonicalEmployeeIdFromActor(actor)).toBe("emp-1");
  });

  it("resolves a partially linked resident account when no employee linkage exists", () => {
    const actor = deriveWorkforceActor({
      authUserId: "auth-res-1",
      userRecord: null,
      employeeRecord: null,
      guardRecord: null,
      residentRecord: {
        id: "res-1",
        resident_code: "RES-001",
        full_name: "Resident Person",
        flat_id: "flat-1",
      },
    });

    expect(actor).not.toBeNull();
    expect(actor?.actorKind).toBe("resident");
    expect(actor?.residentId).toBe("res-1");
    expect(actor?.employeeId).toBeNull();
    expect(actor?.roleName).toBe("resident");
  });

  it("assembles employee directory rows with role, shift, guard profile, and location", () => {
    const directory = assembleEmployeeDirectory({
      employees: [
        {
          id: "emp-1",
          first_name: "Ava",
          last_name: "Ng",
          employee_code: "EMP-100",
          email: "ava@example.com",
          phone: "123",
          department: "Security",
          designation_id: "desig-1",
          is_active: true,
          created_at: "2026-04-01T00:00:00Z",
          photo_url: null,
          date_of_joining: "2026-04-01",
          designations: { designation_name: "Guard" },
        },
      ],
      users: [
        {
          id: "user-1",
          employee_id: "emp-1",
          must_change_password: true,
          roles: { role_name: "security_guard" },
        },
      ],
      guards: [
        {
          id: "guard-1",
          employee_id: "emp-1",
          guard_code: "GRD-100",
          assigned_location_id: "loc-1",
          is_active: true,
          assigned_location: { location_name: "Tower A" },
        },
      ],
      shifts: [
        {
          employee_id: "emp-1",
          shift_id: "shift-1",
          shifts: { shift_name: "Night" },
        },
      ],
    });

    expect(directory).toHaveLength(1);
    expect(directory[0]).toMatchObject({
      id: "emp-1",
      full_name: "Ava Ng",
      role_name: "security_guard",
      guard_profile_id: "guard-1",
      guard_code: "GRD-100",
      assigned_location_id: "loc-1",
      assigned_location_name: "Tower A",
      shift_id: "shift-1",
      shift_name: "Night",
      must_change_password: true,
    });
  });
});

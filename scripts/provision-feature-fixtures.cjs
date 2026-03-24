const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const ROLE_MATRIX_PATH = path.join(process.cwd(), "e2e", "role-matrix.data.json");
const FIXTURE_STATE_PATH = path.join(process.cwd(), "e2e", ".feature-fixtures.json");
const roleMatrix = JSON.parse(fs.readFileSync(ROLE_MATRIX_PATH, "utf8"));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stableUuid(seed) {
  const hex = crypto.createHash("sha1").update(`feature-fixture:${seed}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function runMutation(promise) {
  const { data, error } = await promise;
  if (error) {
    throw error;
  }
  return data;
}

async function maybeSingle(promise) {
  const { data, error } = await promise;
  if (error && error.code !== "PGRST116") {
    throw error;
  }
  return data || null;
}

async function findByEq(supabase, table, column, value, select = "*") {
  return maybeSingle(supabase.from(table).select(select).eq(column, value).maybeSingle());
}

async function ensureDesignation(supabase, { id, code, name, department }) {
  const existing =
    (await findByEq(supabase, "designations", "designation_code", code)) ||
    (await findByEq(supabase, "designations", "id", id));

  if (existing) {
    return existing;
  }

  return runMutation(
    supabase
      .from("designations")
      .insert({
        id,
        designation_code: code,
        designation_name: name,
        department,
        is_active: true,
      })
      .select()
      .single()
  );
}

async function ensureEmployee(supabase, user, options) {
  let employee =
    (user.employee_id ? await findByEq(supabase, "employees", "id", user.employee_id) : null) ||
    (await findByEq(supabase, "employees", "auth_user_id", user.id));

  if (!employee) {
    employee = await runMutation(
      supabase
        .from("employees")
        .insert({
          id: options.id,
          employee_code: options.code,
          first_name: options.firstName,
          last_name: options.lastName,
          email: user.email,
          date_of_joining: "2026-01-01",
          designation_id: options.designationId,
          department: options.department,
          is_active: true,
          auth_user_id: user.id,
        })
        .select()
        .single()
    );
  }

  if (user.employee_id !== employee.id) {
    await runMutation(
      supabase.from("users").update({ employee_id: employee.id, updated_at: new Date().toISOString() }).eq("id", user.id)
    );
    user.employee_id = employee.id;
  }

  return employee;
}

async function ensureShiftAssignment(supabase, employeeId, shiftId) {
  const existing = await maybeSingle(
    supabase
      .from("employee_shift_assignments")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("shift_id", shiftId)
      .eq("is_active", true)
      .maybeSingle()
  );

  if (existing) {
    return existing;
  }

  return runMutation(
    supabase
      .from("employee_shift_assignments")
      .insert({
        id: stableUuid(`shift:${employeeId}:${shiftId}`),
        employee_id: employeeId,
        shift_id: shiftId,
        assigned_from: "2026-01-01",
        is_active: true,
      })
      .select()
      .single()
  );
}

async function ensureTechnicianProfile(supabase, employeeId, skills, specialization) {
  const existing = await findByEq(supabase, "technician_profiles", "employee_id", employeeId);
  if (existing) {
    const nextSkills = JSON.stringify(skills);
    const currentSkills = JSON.stringify(existing.skills || []);
    const nextCertifications = JSON.stringify(["E2E_CERTIFIED"]);
    const currentCertifications = JSON.stringify(existing.certifications || []);

    if (
      currentSkills !== nextSkills ||
      currentCertifications !== nextCertifications ||
      existing.specialization !== specialization ||
      existing.is_active !== true
    ) {
      return runMutation(
        supabase
          .from("technician_profiles")
          .update({
            skills,
            certifications: ["E2E_CERTIFIED"],
            specialization,
            is_active: true,
          })
          .eq("id", existing.id)
          .select()
          .single()
      );
    }

    return existing;
  }

  return runMutation(
    supabase
      .from("technician_profiles")
      .insert({
        id: stableUuid(`technician:${employeeId}`),
        employee_id: employeeId,
        skills,
        certifications: ["E2E_CERTIFIED"],
        specialization,
        is_active: true,
      })
      .select()
      .single()
  );
}

async function ensureEmployeeDocument(supabase, employeeId, actorUserId) {
  const documentName = "E2E Safety Clearance";
  const existing = await maybeSingle(
    supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("document_name", documentName)
      .maybeSingle()
  );

  if (existing) {
    return existing;
  }

  return runMutation(
    supabase
      .from("employee_documents")
      .insert({
        id: stableUuid(`employee-document:${employeeId}`),
        employee_id: employeeId,
        document_code: "E2E-DOC-001",
        document_name: documentName,
        document_type: "other",
        file_name: "e2e-safety.txt",
        file_path: "e2e/e2e-safety.txt",
        mime_type: "text/plain",
        status: "verified",
        verified_at: new Date().toISOString(),
        notes: "E2E baseline document",
        verified_by: actorUserId,
        created_by: actorUserId,
      })
      .select()
      .single()
  );
}

async function ensureBehaviorTicket(supabase, employeeId, reportedBy) {
  const description = "E2E_BASELINE_BEHAVIOR";
  const existing = await maybeSingle(
    supabase
      .from("employee_behavior_tickets")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("description", description)
      .maybeSingle()
  );

  if (existing) {
    return existing;
  }

  return runMutation(
    supabase
      .from("employee_behavior_tickets")
      .insert({
        id: stableUuid(`behavior-ticket:${employeeId}`),
        employee_id: employeeId,
        category: "late_arrival",
        severity: "medium",
        description,
        reported_by: reportedBy,
        status: "under_review",
        ticket_number: "E2E-BEH-001",
      })
      .select()
      .single()
  );
}

function isBrokenEmployeeDocumentTrigger(error) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    message.includes('invalid input value for enum document_type: "id_proof"') ||
    message.includes('invalid input value for enum document_status: "approved"') ||
    message.includes("column employees.bgv_completed_docs does not exist") ||
    message.includes("column employee_documents.document_url does not exist")
  );
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const emails = roleMatrix.map((entry) => entry.email.toLowerCase());
  const users = await runMutation(
    supabase
      .from("users")
      .select("id, email, full_name, username, employee_id, supplier_id")
      .in("email", emails)
  );

  const userByEmail = Object.fromEntries(users.map((user) => [String(user.email).toLowerCase(), user]));
  for (const entry of roleMatrix) {
    if (!userByEmail[entry.email.toLowerCase()]) {
      throw new Error(`Role user ${entry.email} not found. Run provision-role-test-users first.`);
    }
  }

  const location =
    (await maybeSingle(supabase.from("company_locations").select("*").order("created_at").limit(1).maybeSingle())) ||
    (await runMutation(
      supabase
        .from("company_locations")
        .insert({
          id: stableUuid("location:main-gate"),
          location_code: "E2E-GATE",
          location_name: "E2E Main Gate",
          location_type: "gate",
          latitude: 18.5194,
          longitude: 73.8519,
          geo_fence_radius: 250,
          is_active: true,
        })
        .select()
        .single()
    ));

  const shift =
    (await maybeSingle(supabase.from("shifts").select("*").eq("shift_code", "MORN01").maybeSingle())) ||
    (await runMutation(
      supabase
        .from("shifts")
        .insert({
          id: stableUuid("shift:morning"),
          shift_code: "MORN01",
          shift_name: "Morning Shift",
          start_time: "08:00:00",
          end_time: "16:00:00",
          duration_hours: 8,
          is_active: true,
        })
        .select()
        .single()
    ));

  const leaveType =
    (await maybeSingle(supabase.from("leave_types").select("*").eq("leave_type", "sick_leave").maybeSingle())) ||
    (await maybeSingle(supabase.from("leave_types").select("*").order("created_at").limit(1).maybeSingle()));

  const paymentMethod =
    (await maybeSingle(supabase.from("payment_methods").select("*").order("created_at").limit(1).maybeSingle())) ||
    (await runMutation(
      supabase
        .from("payment_methods")
        .insert({
          id: stableUuid("payment-method:e2e"),
          method_name: "E2E Transfer",
          gateway: "manual",
          is_active: true,
          config: {},
        })
        .select()
        .single()
    ));

  const serviceRows = await runMutation(supabase.from("services").select("id, service_code, service_name"));
  const acService =
    serviceRows.find((row) => row.service_code === "AC-REP") ||
    serviceRows.find((row) => String(row.service_name).toLowerCase().includes("ac")) ||
    serviceRows[0];
  const pestService =
    serviceRows.find((row) => String(row.service_name).toLowerCase().includes("pest")) ||
    serviceRows.find((row) => row.service_code !== "AC-REP") ||
    serviceRows[0];

  const product =
    (await maybeSingle(supabase.from("products").select("*").order("created_at").limit(1).maybeSingle()));
  const supplierUser = userByEmail["supplier@test.com"];
  const supplier =
    (supplierUser?.supplier_id && (await findByEq(supabase, "suppliers", "id", supplierUser.supplier_id))) ||
    (await maybeSingle(supabase.from("suppliers").select("*").order("created_at").limit(1).maybeSingle()));

  const residentUser = userByEmail["resident@test.com"];
  const resident =
    (await findByEq(supabase, "residents", "email", residentUser.email)) ||
    (await maybeSingle(supabase.from("residents").select("*").order("created_at").limit(1).maybeSingle()));

  if (!resident) {
    throw new Error("No resident row available for resident@test.com.");
  }

  if (resident.auth_user_id !== residentUser.id) {
    await runMutation(
      supabase.from("residents").update({ auth_user_id: residentUser.id }).eq("id", resident.id)
    );
  }

  const flat = await findByEq(supabase, "flats", "id", resident.flat_id);
  const society =
    (await maybeSingle(supabase.from("societies").select("*").eq("id", "11111111-1111-1111-1111-111111111111").maybeSingle())) ||
    (await maybeSingle(supabase.from("societies").select("*").order("created_at").limit(1).maybeSingle()));

  const designations = {
    admin: await ensureDesignation(supabase, {
      id: stableUuid("designation:admin"),
      code: "E2E-DESG-ADMIN",
      name: "Platform Administrator",
      department: "Administration",
    }),
    superAdmin: await ensureDesignation(supabase, {
      id: stableUuid("designation:super-admin"),
      code: "E2E-DESG-SUPER",
      name: "Super Administrator",
      department: "Administration",
    }),
    societyManager: await ensureDesignation(supabase, {
      id: stableUuid("designation:society-manager"),
      code: "E2E-DESG-SOCIETY",
      name: "Society Manager",
      department: "Society",
    }),
    siteSupervisor: await ensureDesignation(supabase, {
      id: stableUuid("designation:site-supervisor"),
      code: "E2E-DESG-SITE",
      name: "Site Supervisor",
      department: "Operations",
    }),
    acTech: await ensureDesignation(supabase, {
      id: stableUuid("designation:ac-tech"),
      code: "E2E-DESG-ACTECH",
      name: "AC Technician",
      department: "Services",
    }),
    pestTech: await ensureDesignation(supabase, {
      id: stableUuid("designation:pest-tech"),
      code: "E2E-DESG-PEST",
      name: "Pest Control Technician",
      department: "Services",
    }),
  };

  const employees = {
    admin: await ensureEmployee(supabase, userByEmail["admin@test.com"], {
      id: stableUuid("employee:admin"),
      code: "E2E-ADMIN",
      firstName: "Platform",
      lastName: "Admin",
      department: "Administration",
      designationId: designations.admin.id,
    }),
    superAdmin: await ensureEmployee(supabase, userByEmail["superadmin@test.com"], {
      id: stableUuid("employee:super-admin"),
      code: "E2E-SUPERADMIN",
      firstName: "Super",
      lastName: "Admin",
      department: "Administration",
      designationId: designations.superAdmin.id,
    }),
    societyManager: await ensureEmployee(supabase, userByEmail["societymanager@test.com"], {
      id: stableUuid("employee:society-manager"),
      code: "E2E-SOCIETYMGR",
      firstName: "Society",
      lastName: "Manager",
      department: "Society",
      designationId: designations.societyManager.id,
    }),
    siteSupervisor: await ensureEmployee(supabase, userByEmail["sitesupervisor@test.com"], {
      id: stableUuid("employee:site-supervisor"),
      code: "E2E-SITESUP",
      firstName: "Site",
      lastName: "Supervisor",
      department: "Operations",
      designationId: designations.siteSupervisor.id,
    }),
    acTechnician: await ensureEmployee(supabase, userByEmail["actech@test.com"], {
      id: stableUuid("employee:ac-technician"),
      code: "E2E-ACTECH",
      firstName: "AC",
      lastName: "Technician",
      department: "Services",
      designationId: designations.acTech.id,
    }),
    pestTechnician: await ensureEmployee(supabase, userByEmail["pesttech@test.com"], {
      id: stableUuid("employee:pest-technician"),
      code: "E2E-PESTTECH",
      firstName: "Pest",
      lastName: "Technician",
      department: "Services",
      designationId: designations.pestTech.id,
    }),
    guard: await ensureEmployee(supabase, userByEmail["guard@test.com"], {
      id: stableUuid("employee:guard"),
      code: "E2E-GUARD",
      firstName: "Security",
      lastName: "Guard",
      department: "Security",
      designationId: designations.siteSupervisor.id,
    }),
    serviceBoy: await ensureEmployee(supabase, userByEmail["serviceboy@test.com"], {
      id: stableUuid("employee:service-boy"),
      code: "E2E-SERVICEBOY",
      firstName: "Service",
      lastName: "Boy",
      department: "Services",
      designationId: designations.acTech.id,
    }),
    account: await ensureEmployee(supabase, userByEmail["account@test.com"], {
      id: stableUuid("employee:account"),
      code: "E2E-ACCOUNT",
      firstName: "Account",
      lastName: "Officer",
      department: "Finance",
      designationId: designations.admin.id,
    }),
    buyer: await ensureEmployee(supabase, userByEmail["buyer@test.com"], {
      id: stableUuid("employee:buyer"),
      code: "E2E-BUYER",
      firstName: "Buyer",
      lastName: "Officer",
      department: "Procurement",
      designationId: designations.admin.id,
    }),
    storekeeper: await ensureEmployee(supabase, userByEmail["storekeeper@test.com"], {
      id: stableUuid("employee:storekeeper"),
      code: "E2E-STOREKEEPER",
      firstName: "Store",
      lastName: "Keeper",
      department: "Inventory",
      designationId: designations.admin.id,
    }),
    supervisor: await ensureEmployee(supabase, userByEmail["supervisor@test.com"], {
      id: stableUuid("employee:supervisor"),
      code: "E2E-SUPERVISOR",
      firstName: "Security",
      lastName: "Supervisor",
      department: "Security",
      designationId: designations.siteSupervisor.id,
    }),
  };

  for (const employeeId of [
    employees.guard.id,
    employees.acTechnician.id,
    employees.pestTechnician.id,
    employees.serviceBoy.id,
  ]) {
    await ensureShiftAssignment(supabase, employeeId, shift.id);
  }

  await ensureTechnicianProfile(supabase, employees.acTechnician.id, ["HVAC", "Gas Charging"], "ac");
  await ensureTechnicianProfile(
    supabase,
    employees.pestTechnician.id,
    ["Pest Control", "Chemical Handling"],
    "pest_control"
  );
  await ensureTechnicianProfile(supabase, employees.serviceBoy.id, ["Field Service", "Resident Support"], "general");

  let employeeDocumentsSeeded = true;
  try {
    await ensureEmployeeDocument(supabase, employees.acTechnician.id, userByEmail["admin@test.com"].id);
  } catch (error) {
    if (!isBrokenEmployeeDocumentTrigger(error)) {
      throw error;
    }

    employeeDocumentsSeeded = false;
    console.warn(
      "Skipping employee document seed because the linked database still has the obsolete employee_documents BGV trigger."
    );
  }

  await ensureBehaviorTicket(supabase, employees.guard.id, employees.supervisor.id);

  const guardRecord =
    (await findByEq(supabase, "security_guards", "employee_id", employees.guard.id)) ||
    (await runMutation(
      supabase
        .from("security_guards")
        .insert({
          id: stableUuid("security-guard:e2e"),
          employee_id: employees.guard.id,
          guard_code: "E2E-GRD-001",
          grade: "B",
          is_armed: false,
          assigned_location_id: location.id,
          shift_timing: "day",
          is_active: true,
        })
        .select()
        .single()
    ));

  const state = {
    generatedAt: new Date().toISOString(),
    runId: `RUN-${Date.now()}`,
    ids: {
      superAdminUserId: userByEmail["superadmin@test.com"].id,
      adminUserId: userByEmail["admin@test.com"].id,
      buyerUserId: userByEmail["buyer@test.com"].id,
      buyerEmployeeId: employees.buyer.id,
      accountUserId: userByEmail["account@test.com"].id,
      accountEmployeeId: employees.account.id,
      storekeeperUserId: userByEmail["storekeeper@test.com"].id,
      guardUserId: userByEmail["guard@test.com"].id,
      guardEmployeeId: employees.guard.id,
      guardRecordId: guardRecord.id,
      residentUserId: residentUser.id,
      residentId: resident.id,
      flatId: flat.id,
      societyId: society.id,
      societyManagerUserId: userByEmail["societymanager@test.com"].id,
      societyManagerEmployeeId: employees.societyManager.id,
      siteSupervisorUserId: userByEmail["sitesupervisor@test.com"].id,
      siteSupervisorEmployeeId: employees.siteSupervisor.id,
      acTechnicianUserId: userByEmail["actech@test.com"].id,
      acTechnicianEmployeeId: employees.acTechnician.id,
      pestTechnicianUserId: userByEmail["pesttech@test.com"].id,
      pestTechnicianEmployeeId: employees.pestTechnician.id,
      serviceBoyUserId: userByEmail["serviceboy@test.com"].id,
      serviceBoyEmployeeId: employees.serviceBoy.id,
      supervisorEmployeeId: employees.supervisor.id,
      locationId: location.id,
      shiftId: shift.id,
      leaveTypeId: leaveType.id,
      paymentMethodId: paymentMethod.id,
      acServiceId: acService.id,
      pestServiceId: pestService.id,
      productId: product.id,
      supplierId: supplier.id,
    },
    slugs: {
      sharedPrefix: "E2E_SHARED",
      visitorPrefix: "E2E_VISITOR",
      procurementPrefix: "E2E_CHAIN",
      acWorkflowPrefix: "E2E_AC",
      residentFlatSearch: String(flat.flat_number),
    },
    notes: [
      "Feature fixtures normalize employee links for role test users.",
      "Shared reference rows use stable E2E_* identifiers; workflow rows should remain run-scoped.",
      employeeDocumentsSeeded
        ? "Employee document baseline is present for HRMS document coverage."
        : "Employee document baseline was skipped because the linked database still has the obsolete employee_documents BGV trigger.",
    ],
  };

  fs.writeFileSync(FIXTURE_STATE_PATH, JSON.stringify(state, null, 2));

  console.table([
    { key: "locationId", value: state.ids.locationId },
    { key: "societyId", value: state.ids.societyId },
    { key: "flatId", value: state.ids.flatId },
    { key: "acTechnicianEmployeeId", value: state.ids.acTechnicianEmployeeId },
    { key: "pestTechnicianEmployeeId", value: state.ids.pestTechnicianEmployeeId },
    { key: "guardRecordId", value: state.ids.guardRecordId },
  ]);
}

main().catch((error) => {
  console.error("Failed to provision scope-driven feature fixtures.");
  console.error(error);
  process.exit(1);
});

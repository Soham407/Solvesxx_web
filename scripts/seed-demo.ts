import crypto from "node:crypto";

import { loadEnvConfig } from "@next/env";

import { createServiceRoleClient } from "../src/lib/platform/server";

loadEnvConfig(process.cwd());

const DEMO_PASSWORD = "Demo@1234";
const DEMO_SOCIETY_CODE = "DEMO-001";
const DEMO_SOCIETY_NAME = "Green Valley Heights";

const BUILDINGS = [
  {
    building_code: "BLK-A",
    building_name: "Block A",
    total_floors: 5,
    total_flats: 10,
  },
  {
    building_code: "BLK-B",
    building_name: "Block B",
    total_floors: 3,
    total_flats: 6,
  },
] as const;

const FLATS = [
  {
    flat_number: "A-101",
    floor_number: 1,
    flat_type: "2bhk",
    is_occupied: false,
    is_active: true,
  },
  {
    flat_number: "A-102",
    floor_number: 1,
    flat_type: "2bhk",
    is_occupied: false,
    is_active: true,
  },
  {
    flat_number: "A-201",
    floor_number: 2,
    flat_type: "3bhk",
    is_occupied: false,
    is_active: true,
  },
  {
    flat_number: "A-202",
    floor_number: 2,
    flat_type: "1bhk",
    is_occupied: false,
    is_active: true,
  },
] as const;

const RESIDENTS = [
  {
    email: "resident1@demo.com",
    phone: "+919876543210",
    password: DEMO_PASSWORD,
    first_name: "Rahul",
    last_name: "Sharma",
    flat_number: "A-101",
  },
  {
    email: "resident2@demo.com",
    phone: "+919876543211",
    password: DEMO_PASSWORD,
    first_name: "Priya",
    last_name: "Mehta",
    flat_number: "A-102",
  },
] as const;

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

type AuthAdminUser = {
  email?: string | null;
  id: string;
};

function logStep(message: string) {
  console.log(message);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function buildResidentCode() {
  return `RES-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function buildUsername(email: string) {
  const usernameBase = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${usernameBase}_${Date.now().toString(36)}`.slice(0, 64);
}

async function listAllAuthUsers(supabaseAdmin: SupabaseAdmin) {
  const users: AuthAdminUser[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const batch = (data?.users ?? []) as AuthAdminUser[];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function findAuthUserByEmail(supabaseAdmin: SupabaseAdmin, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const authUsers = await listAllAuthUsers(supabaseAdmin);

  return (
    authUsers.find((user) => normalizeEmail(user.email ?? "") === normalizedEmail) ?? null
  );
}

async function getRoleId(supabaseAdmin: SupabaseAdmin, roleName: string) {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("role_name", roleName)
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`Role "${roleName}" not found`);
  }

  return String(data.id);
}

async function ensureSociety(supabaseAdmin: SupabaseAdmin) {
  logStep("Creating society...");

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("societies")
    .select("id, society_name, society_code")
    .eq("society_code", DEMO_SOCIETY_CODE)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    console.log(`Demo society already exists: ${existing.society_name} (${existing.society_code}).`);
    return { society: existing, alreadyExists: true };
  }

  const { data, error } = await supabaseAdmin
    .from("societies")
    .insert({
      society_code: DEMO_SOCIETY_CODE,
      society_name: DEMO_SOCIETY_NAME,
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      is_active: true,
    })
    .select("id, society_name, society_code")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("Failed to create society");
  }

  logStep(`Created: ${data.society_name}`);
  return { society: data, alreadyExists: false };
}

async function ensureBuilding(
  supabaseAdmin: SupabaseAdmin,
  societyId: string,
  building: (typeof BUILDINGS)[number],
) {
  logStep(`Creating building: ${building.building_name}...`);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("buildings")
    .select("id, building_name, building_code")
    .eq("society_id", societyId)
    .eq("building_code", building.building_code)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    logStep(`Created: ${existing.building_name} (already existed)`);
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("buildings")
    .insert({
      ...building,
      society_id: societyId,
      is_active: true,
    })
    .select("id, building_name, building_code")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`Failed to create building ${building.building_name}`);
  }

  logStep(`Created: ${data.building_name}`);
  return data;
}

async function ensureFlat(
  supabaseAdmin: SupabaseAdmin,
  buildingId: string,
  flat: (typeof FLATS)[number],
) {
  logStep(`Creating flat: ${flat.flat_number}...`);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("flats")
    .select("id, flat_number")
    .eq("building_id", buildingId)
    .eq("flat_number", flat.flat_number)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    logStep(`Created: ${existing.flat_number} (already existed)`);
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("flats")
    .insert({
      ...flat,
      building_id: buildingId,
    })
    .select("id, flat_number")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`Failed to create flat ${flat.flat_number}`);
  }

  logStep(`Created: ${data.flat_number}`);
  return data;
}

async function ensureAuthUser(
  supabaseAdmin: SupabaseAdmin,
  input: (typeof RESIDENTS)[number],
  fullName: string,
) {
  let authUser = await findAuthUserByEmail(supabaseAdmin, input.email);

  if (authUser) {
    logStep(`Auth user exists for ${input.email}, reusing account.`);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: input.password,
      email: input.email,
      phone: input.phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "resident",
      },
    });

    if (updateError) {
      throw updateError;
    }

    return authUser.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    phone: input.phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "resident",
    },
  });

  if (error || !data?.user?.id) {
    if (
      error?.message?.includes("already registered") ||
      error?.message?.includes("already been registered")
    ) {
      authUser = await findAuthUserByEmail(supabaseAdmin, input.email);

      if (authUser?.id) {
        return authUser.id;
      }
    }

    throw error ?? new Error(`Failed to create auth user for ${input.email}`);
  }

  logStep(`Created auth user: ${input.email}`);
  return data.user.id;
}

async function ensurePublicUser(
  supabaseAdmin: SupabaseAdmin,
  authUserId: string,
  fullName: string,
  email: string,
  phone: string,
  residentRoleId: string,
) {
  const { data: existingById, error: existingByIdError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("id", authUserId)
    .maybeSingle();

  if (existingByIdError) {
    throw existingByIdError;
  }

  if (existingById?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        full_name: fullName,
        email,
        phone,
        role_id: residentRoleId,
        is_active: true,
      })
      .eq("id", authUserId);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { data: existingByEmail, error: existingByEmailError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingByEmailError) {
    throw existingByEmailError;
  }

  if (existingByEmail?.id && existingByEmail.id !== authUserId) {
    throw new Error(
      `public.users row for ${email} already exists with a different id (${existingByEmail.id}).`,
    );
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authUserId,
    full_name: fullName,
    email,
    phone,
    role_id: residentRoleId,
    username: buildUsername(email),
    must_change_password: false,
    is_active: true,
  });

  if (insertError) {
    throw insertError;
  }
}

async function ensureResident(
  supabaseAdmin: SupabaseAdmin,
  residentRoleId: string,
  flatId: string,
  input: (typeof RESIDENTS)[number],
) {
  const fullName = buildFullName(input.first_name, input.last_name);

  logStep(`Creating resident: ${fullName}...`);

  const authUserId = await ensureAuthUser(supabaseAdmin, input, fullName);
  await ensurePublicUser(
    supabaseAdmin,
    authUserId,
    fullName,
    input.email,
    input.phone,
    residentRoleId,
  );

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("residents")
    .select("id, auth_user_id, flat_id, full_name")
    .eq("email", input.email)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("residents")
      .update({
        auth_user_id: authUserId,
        flat_id: flatId,
        full_name: fullName,
        phone: input.phone,
        email: input.email,
        relation: "Owner",
        is_primary_contact: true,
        is_active: true,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    logStep(`Created: ${fullName} (already existed)`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from("residents")
    .insert({
      auth_user_id: authUserId,
      flat_id: flatId,
      resident_code: buildResidentCode(),
      full_name: fullName,
      phone: input.phone,
      email: input.email,
      relation: "Owner",
      is_primary_contact: true,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw error ?? new Error(`Failed to create resident ${fullName}`);
  }

  logStep(`Created: ${fullName}`);
  return data.id;
}

async function markFlatOccupied(supabaseAdmin: SupabaseAdmin, flatId: string, flatNumber: string) {
  const { error } = await supabaseAdmin
    .from("flats")
    .update({ is_occupied: true, is_active: true })
    .eq("id", flatId);

  if (error) {
    throw error;
  }

  logStep(`Marked occupied: ${flatNumber}`);
}

async function ensureAnnouncement(supabaseAdmin: SupabaseAdmin, societyId: string) {
  const today = new Date().toISOString().split("T")[0];
  const title = "Welcome to Green Valley Heights!";

  logStep("Creating announcement...");

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("company_events")
    .select("id, title")
    .eq("society_id", societyId)
    .eq("title", title)
    .maybeSingle();

  if (existingError) {
    if (existingError.code === "42703") {
      console.log(
        "Skipping announcement seed: company_events.society_id does not exist in this database.",
      );
      return null;
    }
    throw existingError;
  }

  if (existing?.id) {
    logStep(`Created: ${existing.title} (already existed)`);
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("company_events")
    .insert({
      title,
      event_name: title,
      description:
        "This is a demo society. Guards, residents, and managers can now log in and test all features.",
      event_date: today,
      event_time: "09:00:00",
      venue: DEMO_SOCIETY_NAME,
      category: "Notice",
      status: "Scheduled",
      society_id: societyId,
      is_active: true,
      created_by: null,
    } as any)
    .select("id, title")
    .single();

  if (error?.code === "42703") {
    console.log(
      "Skipping announcement seed: company_events.society_id does not exist in this database.",
    );
    return null;
  }

  if (error || !data?.id) {
    throw error ?? new Error("Failed to create announcement");
  }

  logStep(`Created: ${data.title}`);
  return data;
}

async function main() {
  const supabaseAdmin = createServiceRoleClient();

  try {
    const { society } = await ensureSociety(supabaseAdmin);

    const residentRoleId = await getRoleId(supabaseAdmin, "resident");

    const buildingMap = new Map<string, { id: string; building_name: string }>();

    for (const building of BUILDINGS) {
      const createdBuilding = await ensureBuilding(supabaseAdmin, society.id, building);
      buildingMap.set(building.building_code, {
        id: String(createdBuilding.id),
        building_name: String(createdBuilding.building_name),
      });
    }

    const blockA = buildingMap.get("BLK-A");

    if (!blockA) {
      throw new Error("Block A was not created.");
    }

    const flatMap = new Map<string, { id: string; flat_number: string }>();

    for (const flat of FLATS) {
      const createdFlat = await ensureFlat(supabaseAdmin, blockA.id, flat);
      flatMap.set(flat.flat_number, {
        id: String(createdFlat.id),
        flat_number: String(createdFlat.flat_number),
      });
    }

    for (const resident of RESIDENTS) {
      const flat = flatMap.get(resident.flat_number);

      if (!flat) {
        throw new Error(`Flat ${resident.flat_number} not found for resident seeding.`);
      }

      await ensureResident(supabaseAdmin, residentRoleId, flat.id, resident);
      await markFlatOccupied(supabaseAdmin, flat.id, flat.flat_number);
    }

    await ensureAnnouncement(supabaseAdmin, String(society.id));

    console.log("");
    console.log("=== DEMO SEED COMPLETE ===");
    console.log(`Society: ${DEMO_SOCIETY_NAME} (${DEMO_SOCIETY_CODE})`);
    console.log("Buildings: Block A, Block B");
    console.log("Flats: A-101, A-102, A-201, A-202");
    console.log("");
    console.log("Test Credentials:");
    console.log("Resident 1: resident1@demo.com / Demo@1234  (Flat A-101)");
    console.log("Resident 2: resident2@demo.com / Demo@1234  (Flat A-102)");
    console.log("");
    console.log("Next steps:");
    console.log("Assign guards to DEMO-001 via /admin/guards");
    console.log("Create a society manager via /admin/users");
    console.log("========================");
  } catch (error) {
    console.error("Demo seed failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();

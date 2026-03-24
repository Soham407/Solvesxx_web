const fs = require("node:fs");
const path = require("node:path");

const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const ROLE_TEST_PASSWORD = "Test@1234";
const ROLE_MATRIX_PATH = path.join(process.cwd(), "e2e", "role-matrix.data.json");
const roleMatrix = JSON.parse(fs.readFileSync(ROLE_MATRIX_PATH, "utf8"));

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const roleNames = roleMatrix.map((entry) => entry.role);
  const emails = roleMatrix.map((entry) => normalizeEmail(entry.email));

  const [{ data: roles, error: rolesError }, authUsers, { data: publicUsers, error: publicError }] =
    await Promise.all([
      supabase.from("roles").select("id, role_name").in("role_name", roleNames),
      listAllAuthUsers(supabase),
      supabase
        .from("users")
        .select("id, email, username, full_name, is_active, role_id")
        .in("email", emails),
    ]);

  if (rolesError) {
    throw rolesError;
  }

  if (publicError) {
    throw publicError;
  }

  const roleIdByName = Object.fromEntries((roles ?? []).map((role) => [role.role_name, role.id]));

  for (const roleName of roleNames) {
    if (!roleIdByName[roleName]) {
      throw new Error(`Role "${roleName}" was not found in public.roles.`);
    }
  }

  const authByEmail = new Map(
    authUsers.map((user) => [normalizeEmail(user.email || ""), user]).filter(([email]) => Boolean(email))
  );
  const publicByEmail = new Map(
    (publicUsers ?? []).map((user) => [normalizeEmail(user.email || ""), user]).filter(([email]) => Boolean(email))
  );

  const results = [];

  for (const entry of roleMatrix) {
    const email = normalizeEmail(entry.email);
    const notes = [];
    let status = "unchanged";
    let authUser = authByEmail.get(email);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: entry.email,
        password: ROLE_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: entry.fullName,
          role: entry.role,
        },
      });

      if (error || !data?.user) {
        throw error || new Error(`Failed to create auth user for ${entry.email}`);
      }

      authUser = data.user;
      authByEmail.set(email, authUser);
      notes.push("created auth user");
      status = "created";
    } else {
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: ROLE_TEST_PASSWORD,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          full_name: entry.fullName,
          role: entry.role,
        },
      });

      if (error) {
        throw error;
      }

      notes.push("normalized password");
      if (status === "unchanged") {
        status = "updated";
      }
    }

    let publicUser = publicByEmail.get(email);
    const publicPayload = {
      id: authUser.id,
      email: entry.email,
      full_name: entry.fullName,
      username: entry.username,
      role_id: roleIdByName[entry.role],
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (!publicUser) {
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...publicPayload,
          created_at: new Date().toISOString(),
        })
        .select("id, email")
        .single();

      if (error || !data) {
        throw error || new Error(`Failed to create public.users row for ${entry.email}`);
      }

      publicUser = {
        ...publicPayload,
        email: data.email,
        id: data.id,
      };
      publicByEmail.set(email, publicUser);
      notes.push("created public.users row");
      status = status === "created" ? "created" : "updated";
    } else if (publicUser.id !== authUser.id) {
      const { data, error } = await supabase
        .from("users")
        .update(publicPayload)
        .eq("id", publicUser.id)
        .select("id")
        .single();

      if (error || !data) {
        throw error || new Error(`Failed to repair public.users id for ${entry.email}`);
      }

      publicUser = {
        ...publicUser,
        ...publicPayload,
        id: data.id,
      };
      publicByEmail.set(email, publicUser);
      notes.push("repaired public.users id linkage");
      status = "repaired";
    } else {
      const needsUpdate =
        publicUser.full_name !== entry.fullName ||
        publicUser.username !== entry.username ||
        publicUser.role_id !== roleIdByName[entry.role] ||
        publicUser.is_active !== true;

      if (needsUpdate) {
        const { error } = await supabase
          .from("users")
          .update(publicPayload)
          .eq("id", publicUser.id);

        if (error) {
          throw error;
        }

        notes.push("updated public.users profile");
        if (status === "unchanged") {
          status = "updated";
        }
      }
    }

    results.push({
      role: entry.role,
      email: entry.email,
      authUserId: authUser.id,
      publicUserId: publicUser.id,
      status,
      notes: notes.length > 0 ? notes.join("; ") : "already normalized",
    });
  }

  console.table(results);
}

main().catch((error) => {
  console.error("Failed to provision deterministic role test users.");
  console.error(error);
  process.exit(1);
});

import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

export type FeatureFixtureState = {
  generatedAt: string;
  runId: string;
  ids: Record<string, string>;
  slugs: Record<string, string>;
  notes: string[];
};

const FIXTURE_STATE_PATH = path.join(process.cwd(), "e2e", ".feature-fixtures.json");

let serviceRoleClient: SupabaseClient | null = null;

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getFeatureFixtureStatePath() {
  return FIXTURE_STATE_PATH;
}

export function createServiceRoleClient() {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return serviceRoleClient;
}

export function readFeatureFixtureState(): FeatureFixtureState {
  if (!fs.existsSync(FIXTURE_STATE_PATH)) {
    throw new Error(
      `Feature fixture state file not found at ${FIXTURE_STATE_PATH}. Did global setup run?`
    );
  }

  return JSON.parse(fs.readFileSync(FIXTURE_STATE_PATH, "utf8")) as FeatureFixtureState;
}

export async function getTableCount(table: string) {
  const { count, error } = await createServiceRoleClient()
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getRowsById<TRecord extends { id: string }>(
  table: string,
  ids: string[]
) {
  const { data, error } = await createServiceRoleClient()
    .from(table)
    .select("*")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data ?? []) as TRecord[];
}

export async function getLatestRow<TRecord>(
  table: string,
  orderColumn = "created_at"
) {
  const { data, error } = await createServiceRoleClient()
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TRecord | null;
}

import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("Resident module contracts", () => {
  it("uses the privacy-safe resident_directory view for the society resident directory page", async () => {
    const source = await readRepoFile("app/(dashboard)/society/residents/page.tsx");

    expect(
      sourceContainsAll(source, [
        '.from("resident_directory")',
        'select("id, full_name, flat_number, building_name, is_primary_contact, masked_phone")',
      ])
    ).toBe(true);

    expect(sourceContainsNone(source, ['.from("residents")'])).toBe(true);
  });

  it("resolves resident profiles strictly through auth_user_id and no longer relies on the email fallback", async () => {
    const source = await readRepoFile("hooks/useResidentProfile.ts");

    expect(
      sourceContainsAll(source, [
        '.from("residents")',
        '.eq("auth_user_id", user.id)',
        'No resident profile found. Please contact support.',
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(source, [
        '.eq("email", user.email)',
        "fallback to email lookup",
      ])
    ).toBe(true);
  });

  it("keeps the resident test-auth migration fixture-scoped instead of blindly creating a backdoor account", async () => {
    const source = await readRepoFile("supabase/migrations/20260209125207_link_resident_auth_v3.sql");

    expect(
      sourceContainsAll(source, [
        "has_fixture_resident",
        "Skipping resident test auth seed because fixture resident",
        "AND auth_user_id IS NULL",
      ])
    ).toBe(true);
  });

  it("exposes an authenticated resident provisioning route that sets must_change_password on new resident accounts", async () => {
    const source = await readRepoFile("app/api/residents/unlinked/route.ts");

    expect(
      sourceContainsAll(source, [
        "export async function post",
        "createuser",
        'role_name", "resident"',
        "must_change_password: true",
        "Resident is already linked to a login account",
      ])
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { readRepoFile, sourceContainsAll } from "../helpers/source-files";
import * as fs from "node:fs";
import * as path from "node:path";

describe("procurement rate verification gate contracts", () => {
  it("enforces rate verification in the buyer requests hook", async () => {
    const hookSource = await readRepoFile("hooks/useBuyerRequests.ts");

    expect(
      sourceContainsAll(hookSource, [
        "validate_indent_rate",
        "Pre-flight Rate Verification",
        "rpc(\"validate_indent_rate\"",
        "No active rate contract found for this indent",
      ])
    ).toBe(true);
  });

  it("displays rate verification summary in the admin service indents page", async () => {
    const pageSource = await readRepoFile("app/(dashboard)/admin/service-indents/page.tsx");

    expect(
      sourceContainsAll(pageSource, [
        "activeRate",
        "fetchActiveRate",
        "handleSupplierChange",
        "Rate Verification Summary Card",
        "Verifying rate contracts...",
        "Active Rate Contract Found",
        "No active rate contract",
        "disabled={isGeneratingIndent || !selectedSupplierId || !activeRate || isLoadingRate}",
      ])
    ).toBe(true);
  });

  it("has the database migration for rate verification", async () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const files = fs.readdirSync(migrationsDir);
    const rateMigration = files.find(f => f.includes("procurement_rate_verification_gate"));

    expect(rateMigration).toBeDefined();

    const migrationSource = fs.readFileSync(path.join(migrationsDir, rateMigration!), "utf-8");

    expect(
      sourceContainsAll(migrationSource, [
        "CREATE TABLE IF NOT EXISTS public.service_rates",
        "CREATE OR REPLACE FUNCTION public.validate_indent_rate",
        "is_service_request = TRUE",
        "supplier_rates",
        "CREATE TRIGGER trg_check_rate_before_forward",
        "BEFORE UPDATE ON public.requests",
      ])
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("Designation Master CRUD & Architecture", () => {
  it("verifies the page uses the hook layer and has no inline queries", async () => {
    const pageSource = await readRepoFile("app/(dashboard)/company/designations/page.tsx");
    
    // Should use the hook
    expect(sourceContainsAll(pageSource, ["useDesignations", "designations", "isLoading", "error"])).toBe(true);
    
    // Should NOT have inline Supabase queries
    expect(sourceContainsNone(pageSource, ["supabase.from(", "createClient("])).toBe(true);
    
    // Should have DataTable with department filter
    expect(sourceContainsAll(pageSource, [
      "DataTable",
      "departmentFilter",
      "Select value={departmentFilter}",
      "searchKey=\"designation_name\"",
    ])).toBe(true);

    // Should have delete confirmation
    expect(sourceContainsAll(pageSource, [
      "AlertDialog",
      "confirmDelete",
      "deleteDesignation",
    ])).toBe(true);
  });

  it("verifies the useDesignations hook follows standardized patterns", async () => {
    const hookSource = await readRepoFile("hooks/useDesignations.ts");
    
    expect(sourceContainsAll(hookSource, [
      "useSupabaseQuery",
      "useSupabaseMutation",
      "createDesignation",
      "updateDesignation",
      "deleteDesignation",
      "refresh",
      '.from("designations")',
    ])).toBe(true);
  });

  it("verifies the DesignationDialog has all required fields", async () => {
    const dialogSource = await readRepoFile("components/dialogs/DesignationDialog.tsx");
    
    expect(sourceContainsAll(dialogSource, [
      "designation_name",
      "department",
      "level",
      "junior",
      "senior",
      "lead",
      "head",
      "z.enum",
      "useForm",
    ])).toBe(true);
  });
});

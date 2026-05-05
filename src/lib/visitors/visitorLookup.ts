import { supabase } from "@/src/lib/supabaseClient";

interface EmployeeLookupClient {
  from: (table: "employees") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null }>;
      };
    };
  };
}

function normalizeEmployeeLookupClient(client: typeof supabase): EmployeeLookupClient {
  return client as unknown as EmployeeLookupClient;
}

export async function getEmployeeIdByUserId(userId: string): Promise<string | null> {
  const employeeClient = normalizeEmployeeLookupClient(supabase);
  const employeeQuery = employeeClient
    .from("employees")
    .select("id")
    .eq("user_id", userId);

  const employeeResult = await employeeQuery.maybeSingle();
  return employeeResult.data?.id ?? null;
}

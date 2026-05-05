import { getCanonicalEmployeeIdClient } from "@/src/lib/workforce/clientActor";

export async function getCurrentEmployeeId() {
  return getCanonicalEmployeeIdClient();
}

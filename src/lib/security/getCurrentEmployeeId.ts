import { getCanonicalEmployeeId } from "@/src/lib/workforce/boundary";

export async function getCurrentEmployeeId() {
  return getCanonicalEmployeeId();
}

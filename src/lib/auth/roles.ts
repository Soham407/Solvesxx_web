export type AppRole =
  | "admin"
  | "company_md"
  | "company_hod"
  | "account"
  | "delivery_boy"
  | "buyer"
  | "supplier"
  | "vendor"
  | "security_guard"
  | "security_supervisor"
  | "society_manager"
  | "service_boy"
  | "resident"
  | "storekeeper"
  | "site_supervisor"
  | "super_admin"
  | "ac_technician"
  | "pest_control_technician";

/**
 * Role-based access mapping
 * Each role can access paths starting with these prefixes
 */
export const ROLE_ACCESS: Record<AppRole, string[]> = {
  admin: ["/"], // Admin can access everything
  company_md: ["/dashboard", "/reports", "/finance"],
  company_hod: ["/dashboard", "/hrms", "/service-requests", "/tickets", "/services", "/company"],
  account: ["/dashboard", "/finance", "/reports", "/hrms/payroll", "/inventory/supplier-products"],
  delivery_boy: ["/dashboard", "/delivery", "/test-delivery", "/logistics"],
  buyer: ["/dashboard", "/buyer"],
  supplier: ["/dashboard", "/supplier"],
  vendor: ["/dashboard", "/supplier"],
  security_guard: ["/dashboard", "/guard", "/test-guard", "/tickets", "/society", "/hrms/attendance", "/hrms/leave"],
  security_supervisor: ["/dashboard", "/guard", "/test-guard", "/tickets", "/society", "/hrms/attendance", "/hrms/leave"],
  society_manager: ["/dashboard", "/society", "/resident", "/test-resident", "/tickets", "/finance/compliance", "/service-requests", "/hrms/attendance"],
  service_boy: ["/dashboard", "/service-boy", "/service-requests"],
  resident: ["/resident", "/test-resident", "/society/my-flat"],
  storekeeper: ["/dashboard", "/inventory", "/tickets"],
  site_supervisor: ["/dashboard", "/society", "/tickets", "/hrms/attendance", "/service-requests"],
  super_admin: ["/"],
  ac_technician: ["/dashboard", "/service-requests", "/services/ac", "/inventory", "/hrms/attendance", "/hrms/leave"],
  pest_control_technician: ["/dashboard", "/service-requests", "/services/pest-control", "/inventory", "/hrms/attendance", "/hrms/leave"],
};

export function hasAccess(role: AppRole, pathname: string): boolean {
  if (role === "admin" || role === "super_admin") return true;

  // Explicitly restrict guards from resident-specific portals
  if ((role === "security_guard" || role === "security_supervisor") && pathname.startsWith("/society/my-flat")) {
    return false;
  }

  const prefixes = ROLE_ACCESS[role];
  if (!prefixes) return false;
  
  // Special case for dashboard which should be accessible to all roles
  if (pathname === "/dashboard") return true;

  return prefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * 🔒 FEATURE FLAGS CONFIGURATION
 *
 * This file controls which features are visible in production.
 * Features marked as frozen are NOT part of the current client scope.
 *
 * To re-enable features:
 * 1. Set FEATURE_FUTURE_PHASE to true, OR
 * 2. Enable individual feature flags
 *
 * See /docs/FEATURE_FREEZE_REGISTER.md for complete documentation
 */

// ===== GLOBAL FEATURE FLAG =====
// Set to true to enable ALL experimental features
export const FEATURE_FUTURE_PHASE =
  process.env.NEXT_PUBLIC_FEATURE_FUTURE_PHASE === "true" || false;

// ===== INDIVIDUAL FEATURE FLAGS =====
export const FEATURE_FLAGS = {
  // UI/UX Extras
  KANBAN_BOARD: FEATURE_FUTURE_PHASE || false,
  REPORTS_MODULE: FEATURE_FUTURE_PHASE || false,
  GPS_COMMAND_CENTER: FEATURE_FUTURE_PHASE || false,

  // Advanced Operations
  MAINTENANCE_SCHEDULING: FEATURE_FUTURE_PHASE || false,
  QR_BATCH_GENERATOR: FEATURE_FUTURE_PHASE || false,
  JOB_MATERIAL_TRACKING: FEATURE_FUTURE_PHASE || false,
  INDENT_VERIFICATION: FEATURE_FUTURE_PHASE || false,
  SERVICE_BOY_PAGE: FEATURE_FUTURE_PHASE || false,

  // Architecture/Data Power Features
  MULTI_WAREHOUSE: FEATURE_FUTURE_PHASE || false,
  ASSET_CATEGORY_HIERARCHY: FEATURE_FUTURE_PHASE || false,
  STOCK_BATCH_MANAGEMENT: FEATURE_FUTURE_PHASE || false,

  // Configuration-Heavy Modules
  LEAVE_CONFIG_ADMIN: FEATURE_FUTURE_PHASE || false,
  SPECIALIZED_PROFILES: FEATURE_FUTURE_PHASE || false,
} as const;

// ===== FROZEN ROUTES =====
// Routes that should be blocked when features are disabled
export const FROZEN_ROUTES: string[] = [
  // Kanban Board
  "/service-requests/board",

  // Reports Module (all 4 reports pages)
  "/reports",
  "/reports/attendance",
  "/reports/financial",
  "/reports/services",
  "/reports/inventory",

  // Maintenance Scheduling
  "/assets/maintenance",

  // QR Batch Generator (inside QR Codes page)
  // Note: Main QR page is PRD-compliant, batch generator is extra

  // Indent Verification
  "/inventory/indents/verification",

  // Warehouse Management
  "/inventory/warehouses",

  // Asset Category Manager (hierarchy)
  "/assets/categories",

  // Leave Configuration Admin
  "/hrms/leave/config",

  // Specialized Profiles
  "/hrms/specialized-profiles",

  // Service Boy Page (technician mobile view)
  "/service-boy",
];

// ===== FROZEN NAVIGATION ITEMS =====
// Titles of nav items to hide from sidebar
export const FROZEN_NAV_ITEMS: string[] = [
  "Kanban Board",
  "Analytics Hub",
  "Attendance Analysis",
  "Financial Health",
  "Service Excellence",
  "Inventory Burn",
  "Maintenance Schedules",
  "Warehouses",
  "Asset Categories",
  "Indent Verification",
  "Leave Config",
  "Specialized Profiles",
  "My Jobs",
];

// ===== FROZEN NAV CHILDREN =====
// Specific child hrefs to hide
export const FROZEN_NAV_HREFS: string[] = [
  "/service-requests/board",
  "/reports/attendance",
  "/reports/financial",
  "/reports/services",
  "/reports/inventory",
  "/assets/maintenance",
  "/assets/categories",
  "/inventory/warehouses",
  "/inventory/indents/verification",
  "/hrms/leave/config",
  "/hrms/specialized-profiles",
  "/service-boy",
];

/**
 * Check if a route is frozen (disabled)
 */
export function isRouteFrozen(pathname: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  return FROZEN_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a navigation item should be hidden
 */
export function isNavItemFrozen(title: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  return FROZEN_NAV_ITEMS.includes(title);
}

/**
 * Check if a navigation href should be hidden
 */
export function isNavHrefFrozen(href: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  return FROZEN_NAV_HREFS.includes(href);
}

/**
 * Filter navigation items based on feature flags
 */
export function filterNavigation<
  T extends {
    title: string;
    href: string;
    children?: { title: string; href: string }[];
  },
>(items: T[]): T[] {
  if (FEATURE_FUTURE_PHASE) return items;

  return items
    .filter(
      (item) => !isNavItemFrozen(item.title) && !isNavHrefFrozen(item.href),
    )
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(
            (child) =>
              !isNavItemFrozen(child.title) && !isNavHrefFrozen(child.href),
          ),
        };
      }
      return item;
    })
    .filter((item) => !item.children || item.children.length > 0);
}

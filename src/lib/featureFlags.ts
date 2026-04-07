/**
 * Feature Flags Configuration
 *
 * This file controls which features are visible in the application.
 * Features marked as frozen are NOT part of the current client scope.
 *
 * Configuration:
 * - Set NEXT_PUBLIC_FEATURE_FUTURE_PHASE=true to enable ALL experimental features
 * - Set NEXT_PUBLIC_FF_<FLAG_NAME>=true to enable individual features per-environment
 *   e.g. NEXT_PUBLIC_FF_REPORTS_MODULE=true
 *
 * See /docs/FEATURE_FREEZE_REGISTER.md for complete documentation
 */

// ===== GLOBAL FEATURE FLAG =====
// Set to true to enable ALL experimental features
export const FEATURE_FUTURE_PHASE =
  process.env.NEXT_PUBLIC_FEATURE_FUTURE_PHASE === "true";

// Next.js only inlines statically-referenced NEXT_PUBLIC env vars in client bundles.
// Keep this explicit mapping so RouteGuard and other client components see the same
// feature-flag state as the server and middleware.
const FEATURE_FLAG_ENV = {
  KANBAN_BOARD: process.env.NEXT_PUBLIC_FF_KANBAN_BOARD,
  REPORTS_MODULE: process.env.NEXT_PUBLIC_FF_REPORTS_MODULE,
  GPS_COMMAND_CENTER: process.env.NEXT_PUBLIC_FF_GPS_COMMAND_CENTER,
  MAINTENANCE_SCHEDULING: process.env.NEXT_PUBLIC_FF_MAINTENANCE_SCHEDULING,
  QR_BATCH_GENERATOR: process.env.NEXT_PUBLIC_FF_QR_BATCH_GENERATOR,
  JOB_MATERIAL_TRACKING: process.env.NEXT_PUBLIC_FF_JOB_MATERIAL_TRACKING,
  INDENT_VERIFICATION: process.env.NEXT_PUBLIC_FF_INDENT_VERIFICATION,
  SERVICE_BOY_PAGE: process.env.NEXT_PUBLIC_FF_SERVICE_BOY_PAGE,
  MULTI_WAREHOUSE: process.env.NEXT_PUBLIC_FF_MULTI_WAREHOUSE,
  ASSET_CATEGORY_HIERARCHY: process.env.NEXT_PUBLIC_FF_ASSET_CATEGORY_HIERARCHY,
  STOCK_BATCH_MANAGEMENT: process.env.NEXT_PUBLIC_FF_STOCK_BATCH_MANAGEMENT,
  LEAVE_CONFIG_ADMIN: process.env.NEXT_PUBLIC_FF_LEAVE_CONFIG_ADMIN,
  SPECIALIZED_PROFILES: process.env.NEXT_PUBLIC_FF_SPECIALIZED_PROFILES,
  ASSET_MODULE: process.env.NEXT_PUBLIC_FF_ASSET_MODULE,
  FINANCE_EXTENDED: process.env.NEXT_PUBLIC_FF_FINANCE_EXTENDED,
  SETTINGS_MODULE: process.env.NEXT_PUBLIC_FF_SETTINGS_MODULE,
} as const;

type FeatureFlagName = keyof typeof FEATURE_FLAG_ENV;

/**
 * Read a per-feature env var override.
 * Returns true if NEXT_PUBLIC_FF_<name>=true, or if FEATURE_FUTURE_PHASE is on.
 */
function ff(name: FeatureFlagName): boolean {
  if (FEATURE_FUTURE_PHASE) return true;
  return FEATURE_FLAG_ENV[name] === "true";
}

// ===== INDIVIDUAL FEATURE FLAGS =====
// Each flag can be enabled independently via NEXT_PUBLIC_FF_<NAME>=true
export const FEATURE_FLAGS = {
  // UI/UX Extras
  KANBAN_BOARD: ff("KANBAN_BOARD"),
  REPORTS_MODULE: ff("REPORTS_MODULE"),
  GPS_COMMAND_CENTER: ff("GPS_COMMAND_CENTER"),

  // Advanced Operations
  MAINTENANCE_SCHEDULING: ff("MAINTENANCE_SCHEDULING"),
  QR_BATCH_GENERATOR: ff("QR_BATCH_GENERATOR"),
  JOB_MATERIAL_TRACKING: ff("JOB_MATERIAL_TRACKING"),
  INDENT_VERIFICATION: ff("INDENT_VERIFICATION"),
  SERVICE_BOY_PAGE: ff("SERVICE_BOY_PAGE"),

  // Architecture/Data Power Features
  MULTI_WAREHOUSE: ff("MULTI_WAREHOUSE"),
  ASSET_CATEGORY_HIERARCHY: ff("ASSET_CATEGORY_HIERARCHY"),
  STOCK_BATCH_MANAGEMENT: ff("STOCK_BATCH_MANAGEMENT"),

  // Configuration-Heavy Modules
  LEAVE_CONFIG_ADMIN: ff("LEAVE_CONFIG_ADMIN"),
  SPECIALIZED_PROFILES: ff("SPECIALIZED_PROFILES"),

  // Bonus Modules (beyond client PRD scope)
  ASSET_MODULE: ff("ASSET_MODULE"),
  FINANCE_EXTENDED: ff("FINANCE_EXTENDED"),
  SETTINGS_MODULE: ff("SETTINGS_MODULE"),
} as const;

// ===== FROZEN ROUTES =====
// Routes that should be blocked when features are disabled
// Mapped to their controlling feature flag for targeted enable/disable
const ROUTE_FLAG_MAP: Record<string, keyof typeof FEATURE_FLAGS> = {
  "/reports": "REPORTS_MODULE",
  "/reports/attendance": "REPORTS_MODULE",
  "/reports/financial": "REPORTS_MODULE",
  "/reports/services": "REPORTS_MODULE",
  "/reports/inventory": "REPORTS_MODULE",
  "/assets/maintenance": "MAINTENANCE_SCHEDULING",
  "/inventory/warehouses": "MULTI_WAREHOUSE",
  "/assets/categories": "ASSET_CATEGORY_HIERARCHY",
  "/service-boy": "SERVICE_BOY_PAGE",

  // Bonus module routes
  "/assets": "ASSET_MODULE",
  "/assets/qr-codes": "ASSET_MODULE",
  "/finance/budgeting": "FINANCE_EXTENDED",
  "/finance/closure": "FINANCE_EXTENDED",
  "/finance/performance-audit": "FINANCE_EXTENDED",
  "/finance/ledger": "FINANCE_EXTENDED",
  "/settings/notifications": "SETTINGS_MODULE",
  "/settings/branding": "SETTINGS_MODULE",
};

// Derived frozen routes for backward compatibility
export const FROZEN_ROUTES: string[] = Object.entries(ROUTE_FLAG_MAP)
  .filter(([, flag]) => !FEATURE_FLAGS[flag])
  .map(([route]) => route);

// ===== FROZEN NAVIGATION ITEMS =====
// Title -> feature flag mapping
const NAV_ITEM_FLAG_MAP: Record<string, keyof typeof FEATURE_FLAGS> = {
  "Analytics Hub": "REPORTS_MODULE",
  "Attendance Analysis": "REPORTS_MODULE",
  "Financial Health": "REPORTS_MODULE",
  "Service Excellence": "REPORTS_MODULE",
  "Inventory Burn": "REPORTS_MODULE",
  "Maintenance Schedules": "MAINTENANCE_SCHEDULING",
  "Warehouses": "MULTI_WAREHOUSE",
  "Asset Categories": "ASSET_CATEGORY_HIERARCHY",
  "Indent Verification": "INDENT_VERIFICATION",
  "My Jobs": "SERVICE_BOY_PAGE",

  // Bonus module nav items
  "Assets & Maintenance": "ASSET_MODULE",
  "Asset Registry": "ASSET_MODULE",
  "QR Code Lab": "ASSET_MODULE",
  "Notification Center": "SETTINGS_MODULE",
  "Visual Branding": "SETTINGS_MODULE",
};

export const FROZEN_NAV_ITEMS: string[] = Object.entries(NAV_ITEM_FLAG_MAP)
  .filter(([, flag]) => !FEATURE_FLAGS[flag])
  .map(([title]) => title);

// ===== FROZEN NAV HREFS =====
export const FROZEN_NAV_HREFS: string[] = Object.entries(ROUTE_FLAG_MAP)
  .filter(([, flag]) => !FEATURE_FLAGS[flag])
  .map(([href]) => href);

/**
 * Check if a route is frozen (disabled)
 */
export function isRouteFrozen(pathname: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  // Check exact match or prefix match
  for (const [route, flag] of Object.entries(ROUTE_FLAG_MAP)) {
    if (pathname.startsWith(route) && !FEATURE_FLAGS[flag]) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a navigation item should be hidden
 */
export function isNavItemFrozen(title: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  const flag = NAV_ITEM_FLAG_MAP[title];
  return flag ? !FEATURE_FLAGS[flag] : false;
}

/**
 * Check if a navigation href should be hidden
 */
export function isNavHrefFrozen(href: string): boolean {
  if (FEATURE_FUTURE_PHASE) return false;
  const flag = ROUTE_FLAG_MAP[href];
  return flag ? !FEATURE_FLAGS[flag] : false;
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

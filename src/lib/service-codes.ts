/**
 * Canonical service codes as stored in the `services` table.
 *
 * Use these constants instead of raw string literals so that:
 *  - Typos produce a TypeScript error at compile time.
 *  - A code rename requires updating a single place, not a grep-and-replace.
 *
 * Usage:
 *   import { ServiceCode } from "@/src/lib/service-codes";
 *   const acService = services.find(s => s.service_code === ServiceCode.AC_REPAIR);
 */

export const ServiceCode = {
  // Maintenance
  AC_REPAIR:            "AC-REP",
  PLUMBING_REPAIR:      "PLM-REP",
  ELECTRICAL:           "ELC-REP",
  ELEVATOR_MAINTENANCE: "ELV-MNT",
  GYM_SERVICE:          "GYM-SRV",

  // Housekeeping
  PEST_CONTROL:         "PST-CON",
  DEEP_CLEANING:        "DP-CLN",
  GARDENING:            "GRD-MNT",

  // Security
  SECURITY_CHECK:       "SEC-CHK",

  // Safety
  FIRE_INSPECTION:      "FIR-INS",

  // Printing / Advertising (used by /services/printing page)
  PRINTING_ADVERTISING: "PRN-ADV",
} as const;

/** Union type of all valid service codes — use for typed parameters. */
export type ServiceCodeValue = (typeof ServiceCode)[keyof typeof ServiceCode];

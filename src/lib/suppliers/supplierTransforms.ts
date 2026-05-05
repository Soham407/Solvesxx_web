import type { SupplierDashboardStats } from "@/src/types/supply-chain";

export type SupplierStatsRow = {
  is_active: boolean | null;
  status: string | null;
  is_verified: boolean | null;
  rating: number | null;
  tier: number | null;
};

export function buildSupplierDashboardStats(suppliers: SupplierStatsRow[]): SupplierDashboardStats {
  return {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter((s) => s.status === "active" || (s.is_active && !s.status)).length,
    inactiveSuppliers: suppliers.filter((s) => s.status === "inactive" || (!s.is_active && !s.status)).length,
    blacklistedSuppliers: suppliers.filter((s) => s.status === "blacklisted").length,
    pendingVerification: suppliers.filter((s) => s.status === "pending_verification").length,
    verifiedSuppliers: suppliers.filter((s) => s.is_verified).length,
    averageRating: suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length : 0,
    suppliersByTier: {
      platinum: suppliers.filter((s) => s.tier === 1).length,
      gold: suppliers.filter((s) => s.tier === 2).length,
      silver: suppliers.filter((s) => s.tier === 3 || !s.tier).length,
    },
  };
}

/**
 * Phase D TypeScript Interfaces
 * Supply Chain Core: Suppliers, Supplier Products, Rates Management
 */

import { Database } from './supabase';

// ===== ENUMS =====
// Note: These will be available after migration is applied and types are regenerated
// For now, we define them manually to allow development to proceed

export type SupplierStatus = 'active' | 'inactive' | 'blacklisted' | 'pending_verification';
export type SupplierType = 'manufacturer' | 'distributor' | 'wholesaler' | 'retailer' | 'service_provider';

// After migration, these can be replaced with:
// export type SupplierStatus = Database['public']['Enums']['supplier_status'];
// export type SupplierType = Database['public']['Enums']['supplier_type'];

// ===== TABLE ROW TYPES =====
// Base types from existing minimal schema

export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];

export type SupplierProduct = Database['public']['Tables']['supplier_products']['Row'];
export type SupplierProductInsert = Database['public']['Tables']['supplier_products']['Insert'];
export type SupplierProductUpdate = Database['public']['Tables']['supplier_products']['Update'];

export type SupplierRate = Database['public']['Tables']['supplier_rates']['Row'];
export type SupplierRateInsert = Database['public']['Tables']['supplier_rates']['Insert'];
export type SupplierRateUpdate = Database['public']['Tables']['supplier_rates']['Update'];

export type SaleProductRate = Database['public']['Tables']['sale_product_rates']['Row'];
export type SaleProductRateInsert = Database['public']['Tables']['sale_product_rates']['Insert'];
export type SaleProductRateUpdate = Database['public']['Tables']['sale_product_rates']['Update'];

// ===== EXTENDED TYPES (with new columns after migration) =====

/** Extended Supplier type with all Phase D columns */
export type SupplierExtended = Supplier & {
  // Business info
  supplier_type?: SupplierType | null;
  alternate_phone?: string | null;
  pan_number?: string | null;
  supplier_code?: string | null;

  // Address (granular)
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;

  // Banking
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;

  // Business terms
  payment_terms?: number | null;  // Days
  credit_limit?: number | null;
  rates?: string | null;
  availability?: string | null;

  // Status & verification
  status?: SupplierStatus | null;
  is_verified?: boolean | null;
  tier?: number | null;
  rating?: number | null;
  overall_score?: number | null;

  // Performance scores (0-100)
  quality_score?: number | null;
  delivery_score?: number | null;
  price_score?: number | null;
  service_score?: number | null;

  // Audit
  created_by?: string | null;
  updated_by?: string | null;
};

/** Extended Supplier Product type with all Phase D columns */
export interface SupplierProductExtended extends SupplierProduct {
  supplier_sku?: string | null;
  min_order_quantity?: number | null;
  max_order_quantity?: number | null;
  pack_size?: string | null;
  case_size?: number | null;
  is_active?: boolean | null;
  is_preferred?: boolean | null;
  preference_rank?: number | null;
  lead_time_days?: number | null;
  updated_at?: string | null;
  created_by?: string | null;
}

/** Extended Supplier Rate type with all Phase D columns */
export interface SupplierRateExtended extends SupplierRate {
  currency?: string | null;
  created_by?: string | null;
  effective_to?: string | null;
  discount_percentage?: number | null;
  gst_percentage?: number | null;
  min_qty_for_price?: number | null;
  notes?: string | null;
}

/** Extended Sale Product Rate type with all Phase D columns */
export interface SaleProductRateExtended extends SaleProductRate {
  currency?: string | null;
  created_by?: string | null;
  society_id?: string | null;
  effective_to?: string | null;
  gst_percentage?: number | null;
  margin_percentage?: number | null;
  base_cost?: number | null;
  notes?: string | null;
}

// ===== UI DISPLAY TYPES =====

/** Supplier with calculated/joined data for display */
export interface SupplierDisplay extends SupplierExtended {
  // Joined product count
  productCount?: number;
  
  // Computed tier label
  tierLabel?: string;  // 'Platinum', 'Gold', 'Silver'
  
  // Computed status label
  statusLabel?: string;
}

/** Supplier-Product mapping with supplier and product details */
export interface SupplierProductDisplay extends SupplierProductExtended {
  supplier?: {
    id: string;
    supplier_name: string;
    supplier_code?: string | null;
    status?: SupplierStatus | null;
    tier?: number | null;
  };
  product?: {
    id: string;
    product_name: string;
    product_code?: string | null;
    unit?: string | null;
  };
  currentRate?: number | null;
}

/** Supplier Rate with supplier and product details */
export interface SupplierRateDisplay extends SupplierRateExtended {
  supplierProduct?: {
    id: string;
    supplier_id: string;
    product_id: string;
    supplier_sku?: string | null;
  };
  supplier?: {
    id: string;
    supplier_name: string;
    supplier_code?: string | null;
  };
  product?: {
    id: string;
    product_name: string;
    product_code?: string | null;
    unit?: string | null;
  };
  // Computed net rate (after discount, before GST)
  netRate?: number;
  // Computed rate with GST
  rateWithGst?: number;
}

/** Sale Rate with product and society details */
export interface SaleProductRateDisplay extends SaleProductRateExtended {
  product?: {
    id: string;
    product_name: string;
    product_code?: string | null;
    unit?: string | null;
  };
  society?: {
    id: string;
    society_name: string;
  } | null;
  // Computed margin amount
  marginAmount?: number;
  // Computed rate with GST
  rateWithGst?: number;
}

/** Result from get_suppliers_for_product function */
export interface SupplierForProduct {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  supplier_type: SupplierType | null;
  is_preferred: boolean;
  preference_rank: number;
  current_rate: number | null;
  discount_percentage: number | null;
  gst_percentage: number | null;
  lead_time_days: number;
  min_order_quantity: number;
  max_order_quantity: number | null;
  overall_score: number;
  tier: number;
}

/** Result from get_current_supplier_rate function */
export interface CurrentSupplierRate {
  rate_id: string;
  rate: number;
  discount_percentage: number;
  gst_percentage: number;
  effective_from: string;
  effective_to: string | null;
  min_qty_for_price: number;
}

/** Result from get_current_sale_rate function */
export interface CurrentSaleRate {
  rate_id: string;
  rate: number;
  gst_percentage: number;
  margin_percentage: number | null;
  base_cost: number | null;
  is_society_specific: boolean;
  effective_from: string;
  effective_to: string | null;
}

// ===== FORM INTERFACES =====

export interface CreateSupplierForm {
  supplier_name: string;
  supplier_type?: SupplierType;
  contact_person?: string;
  phone?: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gst_number?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  payment_terms?: number;
  credit_limit?: number;
  rates?: string;
  availability?: string;
  status?: SupplierStatus;
}

export interface UpdateSupplierForm extends Partial<CreateSupplierForm> {
  rating?: number;
  tier?: number;
  is_verified?: boolean;
  overall_score?: number;
  quality_score?: number;
  delivery_score?: number;
  price_score?: number;
  service_score?: number;
}

export interface CreateSupplierProductForm {
  supplier_id: string;
  product_id: string;
  supplier_sku?: string;
  lead_time_days?: number;
  min_order_quantity?: number;
  max_order_quantity?: number;
  is_preferred?: boolean;
  preference_rank?: number;
  pack_size?: string;
  case_size?: number;
}

export interface UpdateSupplierProductForm extends Partial<Omit<CreateSupplierProductForm, 'supplier_id' | 'product_id'>> {
  is_active?: boolean;
}

export interface CreateSupplierRateForm {
  supplier_product_id: string;
  rate: number;
  effective_from: string;
  effective_to?: string;
  discount_percentage?: number;
  gst_percentage?: number;
  min_qty_for_price?: number;
  notes?: string;
}

export interface UpdateSupplierRateForm extends Partial<Omit<CreateSupplierRateForm, 'supplier_product_id'>> {
  is_active?: boolean;
}

export interface CreateSaleProductRateForm {
  product_id: string;
  society_id?: string | null;  // NULL for global rate
  rate: number;
  effective_from: string;
  effective_to?: string;
  gst_percentage?: number;
  margin_percentage?: number;
  base_cost?: number;
  notes?: string;
}

export interface UpdateSaleProductRateForm extends Partial<Omit<CreateSaleProductRateForm, 'product_id' | 'society_id'>> {
  is_active?: boolean;
}

// ===== FILTER INTERFACES =====

export interface SupplierFilters {
  status?: SupplierStatus | 'all';
  supplier_type?: SupplierType | 'all';
  tier?: number | 'all';
  is_verified?: boolean;
  searchTerm?: string;
}

export interface SupplierProductFilters {
  supplier_id?: string;
  product_id?: string;
  is_preferred?: boolean;
  is_active?: boolean;
  searchTerm?: string;
}

export interface SupplierRateFilters {
  supplier_id?: string;
  product_id?: string;
  supplier_product_id?: string;
  is_active?: boolean;
  effective_as_of?: string;  // Filter rates effective on this date
}

export interface SaleProductRateFilters {
  product_id?: string;
  society_id?: string | null;  // null to filter global rates
  is_active?: boolean;
  effective_as_of?: string;
}

// ===== DASHBOARD STATS =====

export interface SupplierDashboardStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  blacklistedSuppliers: number;
  pendingVerification: number;
  verifiedSuppliers: number;
  averageRating: number;
  suppliersByTier: {
    platinum: number;
    gold: number;
    silver: number;
  };
}

export interface SupplierProductStats {
  totalMappings: number;
  activeMappings: number;
  productsWithSupplier: number;
  suppliersWithProducts: number;
  averageLeadTime: number;
}

export interface RateStats {
  totalRates: number;
  activeRates: number;
  expiredRates: number;
  ratesExpiringSoon: number;  // Within 30 days
}

// ===== HOOK STATE INTERFACES =====

export interface UseSuppliersState {
  suppliers: SupplierExtended[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  stats: SupplierDashboardStats | null;
}

export interface UseSupplierProductsState {
  mappings: SupplierProductDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseSupplierRatesState {
  rates: SupplierRateDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseSaleProductRatesState {
  rates: SaleProductRateDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

// ===== MUTATION RESULT TYPE =====

export interface MutationResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ===== STATUS TRANSITION MAP =====

export const SUPPLIER_STATUS_TRANSITIONS: Record<SupplierStatus, SupplierStatus[]> = {
  pending_verification: ['active', 'inactive', 'blacklisted'],
  active: ['inactive', 'blacklisted'],
  inactive: ['active', 'blacklisted'],
  blacklisted: ['inactive'],  // Can only move to inactive, then back to active
};

export const canTransitionSupplierStatus = (
  currentStatus: SupplierStatus,
  targetStatus: SupplierStatus
): boolean => {
  return SUPPLIER_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
};

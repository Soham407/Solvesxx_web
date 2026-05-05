"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseTyped;
import {
  SupplierProductExtended,
  SupplierProductDisplay,
  SupplierProductFilters,
  CreateSupplierProductForm,
  UpdateSupplierProductForm,
  MutationResult,
  SupplierForProduct,
  SupplierStatus,
} from "@/src/types/supply-chain";
import { sanitizeLikeInput } from "@/lib/sanitize";

type SupplierProductRow = {
  id: string;
  supplier_id: string | null;
  product_id: string | null;
  created_at: string | null;
  supplier?: {
    id: string;
    supplier_name: string;
    supplier_code?: string | null;
    status?: string | null;
    tier?: number | null;
    is_active?: boolean | null;
  } | null;
  product?: {
    id: string;
    product_name: string;
    product_code?: string | null;
    unit_of_measurement?: string | null;
  } | null;
};

/**
 * Supplier Products Hook
 * Phase D: Supply Chain Core
 * 
 * Features:
 * - Link/unlink products to suppliers
 * - Manage preferred supplier for each product
 * - Track lead times, MOQ, and other supplier-specific product info
 * - Query products by supplier or suppliers by product
 */

interface UseSupplierProductsState {
  mappings: SupplierProductDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: UseSupplierProductsState = {
  mappings: [],
  totalCount: 0,
  isLoading: true,
  error: null,
};

export function useSupplierProducts(initialFilters?: SupplierProductFilters) {
  const { toast } = useToast();
  const [state, setState] = useState<UseSupplierProductsState>(initialState);
  const [filters, setFiltersState] = useState<SupplierProductFilters>(initialFilters || {});

  // Fetch supplier-product mappings with filters
  const fetchMappings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let query = supabase
        .from("supplier_products")
        .select(`
          *,
          supplier:suppliers(id, supplier_name, supplier_code, status, tier, is_active),
          product:products(id, product_name, product_code, unit_of_measurement)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.supplier_id) {
        query = query.eq("supplier_id", filters.supplier_id);
      }

      if (filters.product_id) {
        query = query.eq("product_id", filters.product_id);
      }

      if (filters.searchTerm) {
        const term = sanitizeLikeInput(filters.searchTerm);
        query = query.or(`supplier_id.ilike.%${term}%,product_id.ilike.%${term}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to SupplierProductDisplay format
      const mappings: SupplierProductDisplay[] = ((data as SupplierProductRow[] | null) ?? []).map((item) => ({
        id: item.id,
        supplier_id: item.supplier_id,
        product_id: item.product_id,
        created_at: item.created_at,
        supplier: item.supplier ? {
          id: item.supplier.id,
          supplier_name: item.supplier.supplier_name,
          supplier_code: item.supplier.supplier_code,
          status: item.supplier.status as SupplierStatus | undefined,
          tier: item.supplier.tier,
        } : undefined,
        product: item.product ? {
          id: item.product.id,
          product_name: item.product.product_name,
          product_code: item.product.product_code,
          unit: item.product.unit_of_measurement ?? undefined,
        } : undefined,
      }));

      setState(prev => ({
        ...prev,
        mappings,
        totalCount: count || mappings.length,
        isLoading: false,
        error: null,
      }));

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load supplier products";
      console.error("Error fetching supplier products:", err);
      setState(prev => ({
        ...prev,
        mappings: [],
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters]);

  // Link a product to a supplier
  const linkProduct = useCallback(async (
    data: CreateSupplierProductForm
  ): Promise<MutationResult<SupplierProductExtended>> => {
    try {
      const { data: result, error } = await supabase
        .from("supplier_products")
        .insert({
          supplier_id: data.supplier_id,
          product_id: data.product_id,
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error("This product is already linked to this supplier");
        }
        throw error;
      }

      toast({
        title: "Product Linked",
        description: "Product has been linked to the supplier",
      });

      await fetchMappings();
      return { success: true, data: result as SupplierProductExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to link product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Unlink a product from a supplier
  const unlinkProduct = useCallback(async (
    mappingId: string
  ): Promise<MutationResult> => {
    try {
      const { error } = await supabase
        .from("supplier_products")
        .delete()
        .eq("id", mappingId);

      if (error) throw error;

      toast({
        title: "Product Unlinked",
        description: "Product has been removed from the supplier",
      });

      await fetchMappings();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unlink product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Update a supplier-product mapping
  const updateMapping = useCallback(async (
    mappingId: string,
    updates: UpdateSupplierProductForm
  ): Promise<MutationResult<SupplierProductExtended>> => {
    try {
      toast({
        title: "Mapping Update Not Supported",
        description: "The current supplier_products table only stores supplier/product links.",
        variant: "destructive",
      });
      return { success: false, error: "Mapping updates are not supported by the current schema" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update mapping";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Set a supplier as preferred for a product
  const setPreferred = useCallback(async (
    productId: string,
    supplierId: string,
    preferenceRank: number = 1
  ): Promise<MutationResult> => {
    try {
      toast({
        title: "Preferred Supplier Not Supported",
        description: "Preferred supplier ranking is not stored in the current supplier_products table.",
        variant: "destructive",
      });
      return { success: false, error: "Preferred supplier ranking is not supported by the current schema" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set preferred supplier";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Remove preferred status
  const removePreferred = useCallback(async (
    mappingId: string
  ): Promise<MutationResult> => {
    try {
      toast({
        title: "Preferred Supplier Not Supported",
        description: "Preferred supplier ranking is not stored in the current supplier_products table.",
        variant: "destructive",
      });
      return { success: false, error: "Preferred supplier ranking is not supported by the current schema" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove preferred status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Toggle active status
  const toggleActive = useCallback(async (
    mappingId: string,
    isActive: boolean
  ): Promise<MutationResult> => {
    try {
      toast({
        title: "Active Status Not Supported",
        description: "The current supplier_products table does not store active/inactive state.",
        variant: "destructive",
      });
      return { success: false, error: "Active status is not supported by the current schema" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to toggle status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchMappings, toast]);

  // Get all products for a supplier
  const getProductsBySupplier = useCallback(async (
    supplierId: string
  ): Promise<SupplierProductDisplay[]> => {
    try {
      const { data, error } = await supabase
        .from("supplier_products")
        .select(`
          *,
          product:products(id, product_name, product_code, unit_of_measurement)
        `)
        .eq("supplier_id", supplierId)
        .order("product_id");

      if (error) throw error;
      return (data || []) as SupplierProductDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching products by supplier:", err);
      return [];
    }
  }, []);

  // Get all suppliers for a product
  const getSuppliersByProduct = useCallback(async (
    productId: string
  ): Promise<SupplierProductDisplay[]> => {
    try {
      const { data, error } = await supabase
        .from("supplier_products")
        .select(`
          *,
          supplier:suppliers(id, supplier_name, supplier_code, status, tier, is_active)
        `)
        .eq("product_id", productId)
        .order("supplier_id");

      if (error) throw error;
      return (data || []) as SupplierProductDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching suppliers by product:", err);
      return [];
    }
  }, []);

  // Get preferred supplier for a product
  const getPreferredSupplier = useCallback(async (
    productId: string
  ): Promise<SupplierProductDisplay | null> => {
    try {
      const { data, error } = await supabase
        .from("supplier_products")
        .select(`
          *,
          supplier:suppliers(id, supplier_name, supplier_code, status, tier, is_active)
        `)
        .eq("product_id", productId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as SupplierProductDisplay | null;
    } catch (err: unknown) {
      console.error("Error fetching preferred supplier:", err);
      return null;
    }
  }, []);

  // Call database function to get suppliers for a product with rates
  const getSuppliersForProductWithRates = useCallback(async (
    productId: string,
    asOfDate?: string
  ): Promise<SupplierForProduct[]> => {
    try {
      const suppliers = await getSuppliersByProduct(productId);
      return suppliers.map(sp => ({
        supplier_id: sp.supplier_id,
        supplier_name: sp.supplier?.supplier_name || "Unknown",
        supplier_code: sp.supplier?.supplier_code || null,
        supplier_type: null,
        is_preferred: false,
        preference_rank: 999,
        current_rate: null,
        discount_percentage: null,
        gst_percentage: null,
        lead_time_days: 7,
        min_order_quantity: 1,
        max_order_quantity: null,
        overall_score: 0,
        tier: sp.supplier?.tier || 3,
      })) as SupplierForProduct[];
    } catch (err: unknown) {
      console.error("Error fetching suppliers for product:", err);
      return [];
    }
  }, [getSuppliersByProduct]);

  // Set filters
  const setFilters = useCallback((newFilters: SupplierProductFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return {
    // Data
    mappings: state.mappings,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    error: state.error,

    // CRUD Operations
    linkProduct,
    unlinkProduct,
    updateMapping,

    // Preference Management
    setPreferred,
    removePreferred,
    toggleActive,

    // Queries
    getProductsBySupplier,
    getSuppliersByProduct,
    getPreferredSupplier,
    getSuppliersForProductWithRates,

    // Helpers
    clearError,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh: fetchMappings,
  };
}

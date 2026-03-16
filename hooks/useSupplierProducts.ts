"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  SupplierProductExtended,
  SupplierProductDisplay,
  SupplierProductFilters,
  CreateSupplierProductForm,
  UpdateSupplierProductForm,
  MutationResult,
  SupplierForProduct,
} from "@/src/types/supply-chain";
import { sanitizeLikeInput } from "@/lib/sanitize";

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

      if (filters.is_preferred !== undefined) {
        query = query.eq("is_preferred", filters.is_preferred);
      }

      if (filters.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      if (filters.searchTerm) {
        // Search in supplier name or product name via related tables
        // Note: This is a simplified search - for complex searches, consider using a view
        query = query.or(`supplier_sku.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to SupplierProductDisplay format
      const mappings: SupplierProductDisplay[] = (data || []).map((item: any) => ({
        ...item,
        supplier: item.supplier,
        product: item.product ? {
          ...item.product,
          unit: item.product.unit_of_measurement,
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
          supplier_sku: data.supplier_sku,
          lead_time_days: data.lead_time_days || 7,
          min_order_quantity: data.min_order_quantity || 1,
          max_order_quantity: data.max_order_quantity,
          is_preferred: data.is_preferred || false,
          preference_rank: data.preference_rank || 0,
          pack_size: data.pack_size,
          case_size: data.case_size,
          is_active: true,
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
      const { data, error } = await supabase
        .from("supplier_products")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mappingId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Mapping Updated",
        description: "Supplier product details have been updated",
      });

      await fetchMappings();
      return { success: true, data: data as SupplierProductExtended };
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
      // First, unset any existing preferred supplier for this product
      await supabase
        .from("supplier_products")
        .update({ is_preferred: false, preference_rank: 0 })
        .eq("product_id", productId)
        .eq("is_preferred", true);

      // Set the new preferred supplier
      const { error } = await supabase
        .from("supplier_products")
        .update({
          is_preferred: true,
          preference_rank: preferenceRank,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", productId)
        .eq("supplier_id", supplierId);

      if (error) throw error;

      toast({
        title: "Preferred Supplier Set",
        description: "This supplier is now the preferred source for this product",
      });

      await fetchMappings();
      return { success: true };
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
      const { error } = await supabase
        .from("supplier_products")
        .update({
          is_preferred: false,
          preference_rank: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mappingId);

      if (error) throw error;

      toast({
        title: "Preferred Status Removed",
        description: "Supplier is no longer the preferred source for this product",
      });

      await fetchMappings();
      return { success: true };
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
      const { error } = await supabase
        .from("supplier_products")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mappingId);

      if (error) throw error;

      toast({
        title: isActive ? "Mapping Activated" : "Mapping Deactivated",
        description: isActive 
          ? "Supplier-product link is now active" 
          : "Supplier-product link has been deactivated",
      });

      await fetchMappings();
      return { success: true };
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
        .eq("is_active", true)
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
          supplier:suppliers(id, supplier_name, supplier_code, status, tier, is_active, overall_score)
        `)
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("is_preferred", { ascending: false })
        .order("preference_rank", { ascending: true });

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
        .eq("is_preferred", true)
        .eq("is_active", true)
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
      const { data, error } = await supabase
        .rpc('get_suppliers_for_product', {
          p_product_id: productId,
          p_as_of: asOfDate || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      return (data || []) as unknown as SupplierForProduct[];
    } catch (err: unknown) {
      console.error("Error calling get_suppliers_for_product:", err);
      // Fallback to basic query if function doesn't exist yet
      const suppliers = await getSuppliersByProduct(productId);
      return suppliers.map(sp => ({
        supplier_id: sp.supplier_id,
        supplier_name: sp.supplier?.supplier_name || 'Unknown',
        supplier_code: sp.supplier?.supplier_code || null,
        supplier_type: null,
        is_preferred: sp.is_preferred || false,
        preference_rank: sp.preference_rank || 999,
        current_rate: null,
        discount_percentage: null,
        gst_percentage: null,
        lead_time_days: sp.lead_time_days || 7,
        min_order_quantity: sp.min_order_quantity || 1,
        max_order_quantity: sp.max_order_quantity || null,
        overall_score: 0,
        tier: sp.supplier?.tier || 3,
      })) as unknown as SupplierForProduct[];
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

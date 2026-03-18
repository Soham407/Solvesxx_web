"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseTyped as any;
import {
  SupplierRateExtended,
  SupplierRateDisplay,
  SupplierRateFilters,
  CreateSupplierRateForm,
  UpdateSupplierRateForm,
  MutationResult,
  CurrentSupplierRate,
} from "@/src/types/supply-chain";

/**
 * Supplier Rates Hook
 * Phase D: Supply Chain Core
 * 
 * Features:
 * - Manage supplier pricing with effective dates
 * - Track discount percentages and GST
 * - Get current rate for a supplier-product combination
 * - Rate history tracking
 * - Auto-expire old rates when creating new ones
 */

interface UseSupplierRatesState {
  rates: SupplierRateDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: UseSupplierRatesState = {
  rates: [],
  totalCount: 0,
  isLoading: true,
  error: null,
};

export function useSupplierRates(initialFilters?: SupplierRateFilters) {
  const { toast } = useToast();
  const [state, setState] = useState<UseSupplierRatesState>(initialState);
  const [filters, setFiltersState] = useState<SupplierRateFilters>(initialFilters || {});

  // Fetch supplier rates with filters
  const fetchRates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let query = supabase
        .from("supplier_rates")
        .select(`
          *,
          supplier_product:supplier_products(
            id,
            supplier_id,
            product_id,
            supplier_sku,
            supplier:suppliers(id, supplier_name, supplier_code),
            product:products(id, product_name, product_code, unit_of_measurement)
          )
        `)
        .order("effective_from", { ascending: false });

      // Apply filters
      if (filters.supplier_product_id) {
        query = query.eq("supplier_product_id", filters.supplier_product_id);
      }

      if (filters.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      // Filter by effective date
      if (filters.effective_as_of) {
        query = query
          .lte("effective_from", filters.effective_as_of)
          .or(`effective_to.is.null,effective_to.gte.${filters.effective_as_of}`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to SupplierRateDisplay format and filter by supplier/product if needed
      let rates: SupplierRateDisplay[] = (data || []).map((item: any) => {
        const sp = item.supplier_product;
        return {
          ...item,
          supplierProduct: sp ? {
            id: sp.id,
            supplier_id: sp.supplier_id,
            product_id: sp.product_id,
            supplier_sku: sp.supplier_sku,
          } : undefined,
          supplier: sp?.supplier,
          product: sp?.product ? {
            ...sp.product,
            unit: sp.product.unit_of_measurement,
          } : undefined,
          // Calculate net rate and rate with GST
          netRate: item.rate * (1 - (item.discount_percentage || 0) / 100),
          rateWithGst: item.rate * (1 - (item.discount_percentage || 0) / 100) * (1 + (item.gst_percentage || 18) / 100),
        };
      });

      // Filter by supplier_id if specified (post-query filter via join)
      if (filters.supplier_id) {
        rates = rates.filter(r => r.supplierProduct?.supplier_id === filters.supplier_id);
      }

      // Filter by product_id if specified
      if (filters.product_id) {
        rates = rates.filter(r => r.supplierProduct?.product_id === filters.product_id);
      }

      setState(prev => ({
        ...prev,
        rates,
        totalCount: rates.length,
        isLoading: false,
        error: null,
      }));

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load supplier rates";
      console.error("Error fetching supplier rates:", err);
      setState(prev => ({
        ...prev,
        rates: [],
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters]);

  // Create a new rate (auto-expires any existing active rate)
  const createRate = useCallback(async (
    data: CreateSupplierRateForm
  ): Promise<MutationResult<SupplierRateExtended>> => {
    try {
      // First, expire any existing active rate for this supplier-product
      const effectiveFromDate = new Date(data.effective_from);
      const dayBefore = new Date(effectiveFromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);

      await supabase
        .from("supplier_rates")
        .update({
          effective_to: dayBefore.toISOString().split('T')[0],
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("supplier_product_id", data.supplier_product_id)
        .eq("is_active", true)
        .is("effective_to", null);

      // Create the new rate
      const { data: result, error } = await supabase
        .from("supplier_rates")
        .insert({
          supplier_product_id: data.supplier_product_id,
          rate: data.rate,
          effective_from: data.effective_from,
          effective_to: data.effective_to || null,
          discount_percentage: data.discount_percentage || 0,
          gst_percentage: data.gst_percentage || 18,
          min_qty_for_price: data.min_qty_for_price || 1,
          notes: data.notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rate Created",
        description: `New rate of ₹${data.rate} effective from ${data.effective_from}`,
      });

      await fetchRates();
      return { success: true, data: result as SupplierRateExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Update a rate
  const updateRate = useCallback(async (
    rateId: string,
    updates: UpdateSupplierRateForm
  ): Promise<MutationResult<SupplierRateExtended>> => {
    try {
      const { data, error } = await supabase
        .from("supplier_rates")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rateId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rate Updated",
        description: "Supplier rate has been updated",
      });

      await fetchRates();
      return { success: true, data: data as SupplierRateExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Deactivate a rate
  const deactivateRate = useCallback(async (
    rateId: string,
    effectiveTo?: string
  ): Promise<MutationResult> => {
    try {
      const { error } = await supabase
        .from("supplier_rates")
        .update({
          is_active: false,
          effective_to: effectiveTo || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", rateId);

      if (error) throw error;

      toast({
        title: "Rate Deactivated",
        description: "Supplier rate has been deactivated",
      });

      await fetchRates();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to deactivate rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Get current rate for a supplier-product combination
  const getCurrentRate = useCallback(async (
    supplierId: string,
    productId: string,
    asOfDate?: string
  ): Promise<CurrentSupplierRate | null> => {
    try {
      // Try using the database function first
      const { data, error } = await supabase
        .rpc('get_current_supplier_rate', {
          p_supplier_id: supplierId,
          p_product_id: productId,
          p_as_of: asOfDate || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as unknown as CurrentSupplierRate;
      }
      return null;
    } catch (err: unknown) {
      console.error("Error getting current rate:", err);
      
      // Fallback: Manual query if function doesn't exist
      try {
        const dateStr = asOfDate || new Date().toISOString().split('T')[0];
        
        const { data: spData } = await supabase
          .from("supplier_products")
          .select("id")
          .eq("supplier_id", supplierId)
          .eq("product_id", productId)
          .single();

        if (!spData) return null;

        const { data: rateData } = await supabase
          .from("supplier_rates")
          .select("*")
          .eq("supplier_product_id", spData.id)
          .eq("is_active", true)
          .lte("effective_from", dateStr)
          .or(`effective_to.is.null,effective_to.gte.${dateStr}`)
          .order("effective_from", { ascending: false })
          .limit(1);

        if (rateData && rateData.length > 0) {
          const rate = rateData[0];
          return {
            rate_id: rate.id,
            rate: rate.rate,
            discount_percentage: rate.discount_percentage || 0,
            gst_percentage: rate.gst_percentage || 18,
            effective_from: rate.effective_from,
            effective_to: rate.effective_to,
            min_qty_for_price: rate.min_qty_for_price || 1,
          };
        }
        return null;
      } catch {
        return null;
      }
    }
  }, []);

  // Get rate history for a supplier-product
  const getRateHistory = useCallback(async (
    supplierProductId: string
  ): Promise<SupplierRateDisplay[]> => {
    try {
      const { data, error } = await supabase
        .from("supplier_rates")
        .select("*")
        .eq("supplier_product_id", supplierProductId)
        .order("effective_from", { ascending: false });

      if (error) throw error;

      return (data || []).map(rate => ({
        ...rate,
        netRate: rate.rate * (1 - (rate.discount_percentage || 0) / 100),
        rateWithGst: rate.rate * (1 - (rate.discount_percentage || 0) / 100) * (1 + (rate.gst_percentage || 18) / 100),
      })) as SupplierRateDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching rate history:", err);
      return [];
    }
  }, []);

  // Get rates expiring soon (within next N days)
  const getRatesExpiringSoon = useCallback(async (
    days: number = 30
  ): Promise<SupplierRateDisplay[]> => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from("supplier_rates")
        .select(`
          *,
          supplier_product:supplier_products(
            supplier:suppliers(id, supplier_name),
            product:products(id, product_name)
          )
        `)
        .eq("is_active", true)
        .not("effective_to", "is", null)
        .gte("effective_to", today.toISOString().split('T')[0])
        .lte("effective_to", futureDate.toISOString().split('T')[0])
        .order("effective_to", { ascending: true });

      if (error) throw error;

      return (data || []).map((rate: any) => ({
        ...rate,
        supplier: rate.supplier_product?.supplier,
        product: rate.supplier_product?.product,
      })) as SupplierRateDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching expiring rates:", err);
      return [];
    }
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: SupplierRateFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    // Data
    rates: state.rates,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    error: state.error,

    // CRUD Operations
    createRate,
    updateRate,
    deactivateRate,

    // Queries
    getCurrentRate,
    getRateHistory,
    getRatesExpiringSoon,

    // Helpers
    clearError,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh: fetchRates,
  };
}

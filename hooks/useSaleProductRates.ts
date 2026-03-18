"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const supabase = supabaseTyped as any;
import {
  SaleProductRateExtended,
  SaleProductRateDisplay,
  SaleProductRateFilters,
  CreateSaleProductRateForm,
  UpdateSaleProductRateForm,
  MutationResult,
  CurrentSaleRate,
} from "@/src/types/supply-chain";

/**
 * Sale Product Rates Hook
 * Phase D: Supply Chain Core
 * 
 * Features:
 * - Manage sale pricing with effective dates
 * - Society-specific pricing with fallback to global rates
 * - Margin tracking (sale price vs cost)
 * - Rate history tracking
 */

interface UseSaleProductRatesState {
  rates: SaleProductRateDisplay[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: UseSaleProductRatesState = {
  rates: [],
  totalCount: 0,
  isLoading: true,
  error: null,
};

export function useSaleProductRates(initialFilters?: SaleProductRateFilters) {
  const { toast } = useToast();
  const [state, setState] = useState<UseSaleProductRatesState>(initialState);
  const [filters, setFiltersState] = useState<SaleProductRateFilters>(initialFilters || {});

  // Fetch sale product rates with filters
  const fetchRates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let query = supabase
        .from("sale_product_rates")
        .select(`
          *,
          product:products(id, product_name, product_code, unit_of_measurement),
          society:societies(id, society_name)
        `)
        .order("effective_from", { ascending: false });

      // Apply filters
      if (filters.product_id) {
        query = query.eq("product_id", filters.product_id);
      }

      // Filter by society_id (null means global rates)
      if (filters.society_id === null) {
        query = query.is("society_id", null);
      } else if (filters.society_id) {
        query = query.eq("society_id", filters.society_id);
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

      // Transform data to SaleProductRateDisplay format
      const rates: SaleProductRateDisplay[] = (data || []).map((item: any) => ({
        ...item,
        product: item.product ? {
          ...item.product,
          unit: item.product.unit_of_measurement,
        } : undefined,
        society: item.society,
        // Calculate margin amount
        marginAmount: item.base_cost 
          ? item.rate - item.base_cost 
          : undefined,
        // Calculate rate with GST
        rateWithGst: item.rate * (1 + (item.gst_percentage || 18) / 100),
      }));

      setState(prev => ({
        ...prev,
        rates,
        totalCount: count || rates.length,
        isLoading: false,
        error: null,
      }));

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load sale rates";
      console.error("Error fetching sale rates:", err);
      setState(prev => ({
        ...prev,
        rates: [],
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters]);

  // Create a new sale rate
  const createRate = useCallback(async (
    data: CreateSaleProductRateForm
  ): Promise<MutationResult<SaleProductRateExtended>> => {
    try {
      // Expire any existing active rate for this product + society combination
      const effectiveFromDate = new Date(data.effective_from);
      const dayBefore = new Date(effectiveFromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);

      let expireQuery = supabase
        .from("sale_product_rates")
        .update({
          effective_to: dayBefore.toISOString().split('T')[0],
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", data.product_id)
        .eq("is_active", true)
        .is("effective_to", null);

      // Match society_id (either specific or global)
      if (data.society_id) {
        expireQuery = expireQuery.eq("society_id", data.society_id);
      } else {
        expireQuery = expireQuery.is("society_id", null);
      }

      await expireQuery;

      // Create the new rate
      const { data: result, error } = await supabase
        .from("sale_product_rates")
        .insert({
          product_id: data.product_id,
          society_id: data.society_id || null,
          rate: data.rate,
          effective_from: data.effective_from,
          effective_to: data.effective_to || null,
          gst_percentage: data.gst_percentage || 18,
          margin_percentage: data.margin_percentage,
          base_cost: data.base_cost,
          notes: data.notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const rateType = data.society_id ? "Society-specific" : "Global";
      toast({
        title: "Sale Rate Created",
        description: `${rateType} rate of ₹${data.rate} effective from ${data.effective_from}`,
      });

      await fetchRates();
      return { success: true, data: result as SaleProductRateExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create sale rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Update a sale rate
  const updateRate = useCallback(async (
    rateId: string,
    updates: UpdateSaleProductRateForm
  ): Promise<MutationResult<SaleProductRateExtended>> => {
    try {
      const { data, error } = await supabase
        .from("sale_product_rates")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rateId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sale Rate Updated",
        description: "Sale rate has been updated",
      });

      await fetchRates();
      return { success: true, data: data as SaleProductRateExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update sale rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Deactivate a sale rate
  const deactivateRate = useCallback(async (
    rateId: string,
    effectiveTo?: string
  ): Promise<MutationResult> => {
    try {
      const { error } = await supabase
        .from("sale_product_rates")
        .update({
          is_active: false,
          effective_to: effectiveTo || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", rateId);

      if (error) throw error;

      toast({
        title: "Sale Rate Deactivated",
        description: "Sale rate has been deactivated",
      });

      await fetchRates();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to deactivate sale rate";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchRates, toast]);

  // Get current sale rate for a product (with society fallback)
  const getSaleRate = useCallback(async (
    productId: string,
    societyId?: string | null,
    asOfDate?: string
  ): Promise<CurrentSaleRate | null> => {
    try {
      // Try using the database function first
      const { data, error } = await supabase
        .rpc('get_current_sale_rate', {
          p_product_id: productId,
          p_society_id: societyId || null,
          p_as_of: asOfDate || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0] as CurrentSaleRate;
      }
      return null;
    } catch (err: unknown) {
      console.error("Error getting sale rate:", err);
      
      // Fallback: Manual query with society fallback
      try {
        const dateStr = asOfDate || new Date().toISOString().split('T')[0];
        
        // Try society-specific rate first
        if (societyId) {
          const { data: societyRate } = await supabase
            .from("sale_product_rates")
            .select("*")
            .eq("product_id", productId)
            .eq("society_id", societyId)
            .eq("is_active", true)
            .lte("effective_from", dateStr)
            .or(`effective_to.is.null,effective_to.gte.${dateStr}`)
            .order("effective_from", { ascending: false })
            .limit(1);

          if (societyRate && societyRate.length > 0) {
            const rate = societyRate[0];
            return {
              rate_id: rate.id,
              rate: rate.rate,
              gst_percentage: rate.gst_percentage || 18,
              margin_percentage: rate.margin_percentage,
              base_cost: rate.base_cost,
              is_society_specific: true,
              effective_from: rate.effective_from,
              effective_to: rate.effective_to,
            };
          }
        }

        // Fall back to global rate
        const { data: globalRate } = await supabase
          .from("sale_product_rates")
          .select("*")
          .eq("product_id", productId)
          .is("society_id", null)
          .eq("is_active", true)
          .lte("effective_from", dateStr)
          .or(`effective_to.is.null,effective_to.gte.${dateStr}`)
          .order("effective_from", { ascending: false })
          .limit(1);

        if (globalRate && globalRate.length > 0) {
          const rate = globalRate[0];
          return {
            rate_id: rate.id,
            rate: rate.rate,
            gst_percentage: rate.gst_percentage || 18,
            margin_percentage: rate.margin_percentage,
            base_cost: rate.base_cost,
            is_society_specific: false,
            effective_from: rate.effective_from,
            effective_to: rate.effective_to,
          };
        }

        return null;
      } catch {
        return null;
      }
    }
  }, []);

  // Get rate history for a product (optionally filtered by society)
  const getRateHistory = useCallback(async (
    productId: string,
    societyId?: string | null
  ): Promise<SaleProductRateDisplay[]> => {
    try {
      let query = supabase
        .from("sale_product_rates")
        .select(`
          *,
          society:societies(id, society_name)
        `)
        .eq("product_id", productId)
        .order("effective_from", { ascending: false });

      if (societyId === null) {
        query = query.is("society_id", null);
      } else if (societyId) {
        query = query.eq("society_id", societyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(rate => ({
        ...rate,
        marginAmount: rate.base_cost ? rate.rate - rate.base_cost : undefined,
        rateWithGst: rate.rate * (1 + (rate.gst_percentage || 18) / 100),
      })) as SaleProductRateDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching rate history:", err);
      return [];
    }
  }, []);

  // Calculate margin percentage from cost and sale price
  const calculateMargin = useCallback((
    saleRate: number,
    costRate: number
  ): { marginAmount: number; marginPercentage: number } => {
    const marginAmount = saleRate - costRate;
    const marginPercentage = costRate > 0 ? ((saleRate - costRate) / costRate) * 100 : 0;
    return {
      marginAmount: Math.round(marginAmount * 100) / 100,
      marginPercentage: Math.round(marginPercentage * 100) / 100,
    };
  }, []);

  // Get global rates (rates without society_id)
  const getGlobalRates = useCallback(async (): Promise<SaleProductRateDisplay[]> => {
    try {
      const { data, error } = await supabase
        .from("sale_product_rates")
        .select(`
          *,
          product:products(id, product_name, product_code, unit_of_measurement)
        `)
        .is("society_id", null)
        .eq("is_active", true)
        .order("product_id");

      if (error) throw error;

      return (data || []).map(rate => ({
        ...rate,
        product: rate.product ? {
          ...rate.product,
          unit: rate.product.unit_of_measurement,
        } : undefined,
        marginAmount: rate.base_cost ? rate.rate - rate.base_cost : undefined,
        rateWithGst: rate.rate * (1 + (rate.gst_percentage || 18) / 100),
      })) as SaleProductRateDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching global rates:", err);
      return [];
    }
  }, []);

  // Get rates for a specific society
  const getRatesForSociety = useCallback(async (
    societyId: string
  ): Promise<SaleProductRateDisplay[]> => {
    try {
      const { data, error } = await supabase
        .from("sale_product_rates")
        .select(`
          *,
          product:products(id, product_name, product_code, unit_of_measurement)
        `)
        .eq("society_id", societyId)
        .eq("is_active", true)
        .order("product_id");

      if (error) throw error;

      return (data || []).map(rate => ({
        ...rate,
        product: rate.product ? {
          ...rate.product,
          unit: rate.product.unit_of_measurement,
        } : undefined,
        marginAmount: rate.base_cost ? rate.rate - rate.base_cost : undefined,
        rateWithGst: rate.rate * (1 + (rate.gst_percentage || 18) / 100),
      })) as SaleProductRateDisplay[];
    } catch (err: unknown) {
      console.error("Error fetching society rates:", err);
      return [];
    }
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: SaleProductRateFilters) => {
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
    getSaleRate,
    getRateHistory,
    getGlobalRates,
    getRatesForSociety,

    // Helpers
    calculateMargin,
    clearError,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh: fetchRates,
  };
}

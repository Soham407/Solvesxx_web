"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  SaleProductRateExtended,
  SaleProductRateDisplay,
  SaleProductRateFilters,
  CreateSaleProductRateForm,
  UpdateSaleProductRateForm,
  MutationResult,
  CurrentSaleRate,
} from "@/src/types/supply-chain";
import { mapSaleProductRateRows } from "@/src/lib/sale-rates/saleProductRateTransforms";
import {
  expireActiveSaleRate,
  fetchGlobalSaleRates,
  fetchRateHistory,
  fetchSaleRateRows,
  fetchSocietySaleRates,
  findLatestSaleRate,
  insertSaleRate,
  updateSaleRate,
} from "@/src/lib/sale-rates/saleRatesGateway";

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
      const { rows, count } = await fetchSaleRateRows(filters);
      const rates: SaleProductRateDisplay[] = mapSaleProductRateRows(rows);

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

      await expireActiveSaleRate(
        data.product_id,
        data.society_id || null,
        dayBefore.toISOString().split("T")[0]
      );

      // Create the new rate
      const result = await insertSaleRate({
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
      });

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
      const data = await updateSaleRate(rateId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

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
      await updateSaleRate(rateId, {
        is_active: false,
        effective_to: effectiveTo || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      });

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
      const dateStr = asOfDate || new Date().toISOString().split('T')[0];

      if (societyId) {
        const societyRate = await findLatestSaleRate(productId, societyId, dateStr);
        if (societyRate) {
          return {
            rate_id: societyRate.id,
            rate: societyRate.rate,
            gst_percentage: societyRate.gst_percentage || 18,
            margin_percentage: societyRate.margin_percentage,
            base_cost: societyRate.base_cost,
            is_society_specific: true,
            effective_from: societyRate.effective_from,
            effective_to: societyRate.effective_to,
          };
        }
      }

      const globalRate = await findLatestSaleRate(productId, null, dateStr);
      if (globalRate) {
        return {
          rate_id: globalRate.id,
          rate: globalRate.rate,
          gst_percentage: globalRate.gst_percentage || 18,
          margin_percentage: globalRate.margin_percentage,
          base_cost: globalRate.base_cost,
          is_society_specific: false,
          effective_from: globalRate.effective_from,
          effective_to: globalRate.effective_to,
        };
      }

      return null;
    } catch (err: unknown) {
      console.error("Error getting sale rate:", err);
      return null;
    }
  }, []);

  // Get rate history for a product (optionally filtered by society)
  const getRateHistory = useCallback(async (
    productId: string,
    societyId?: string | null
  ): Promise<SaleProductRateDisplay[]> => {
    try {
      const rows = await fetchRateHistory(productId, societyId);

      return rows.map(rate => ({
        ...rate,
        society: undefined,
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
      const rows = await fetchGlobalSaleRates();

      return rows.map(rate => ({
        ...rate,
        product: undefined,
        society: undefined,
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
      const rows = await fetchSocietySaleRates(societyId);

      return rows.map(rate => ({
        ...rate,
        product: undefined,
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  StockBatch,
  StockBatchInsert,
  StockBatchUpdate,
  StockLevel,
  ReorderRule,
  ReorderRuleInsert,
  InventoryFilters,
  InventoryDashboardStats,
} from "@/src/types/phaseB";
import { PAGINATION } from "@/src/lib/constants";
import { sanitizeLikeInput } from "@/lib/sanitize";

interface UseInventoryState {
  stockLevels: StockLevel[];
  stockBatches: StockBatch[];
  reorderRules: ReorderRule[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  stats: InventoryDashboardStats | null;
}

interface UseInventoryReturn extends UseInventoryState {
  addStockBatch: (data: StockBatchInsert) => Promise<{ success: boolean; error?: string; data?: StockBatch }>;
  updateStockBatch: (id: string, data: StockBatchUpdate) => Promise<{ success: boolean; error?: string }>;
  createReorderRule: (data: ReorderRuleInsert) => Promise<{ success: boolean; error?: string }>;
  getStockByProduct: (productId: string) => StockLevel[];
  getLowStockItems: () => StockLevel[];
  setFilters: (filters: InventoryFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  fetchStats: () => Promise<void>;
}

/**
 * Hook for managing inventory, stock levels, and reorder rules
 */
export function useInventory(initialFilters?: InventoryFilters): UseInventoryReturn {
  const [state, setState] = useState<UseInventoryState>({
    stockLevels: [],
    stockBatches: [],
    reorderRules: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    isLoading: true,
    error: null,
    stats: null,
  });

  const [filters, setFiltersState] = useState<InventoryFilters>(initialFilters || {});

  // Fetch stock levels from view
  const fetchStockLevels = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("stock_levels")
        .select("*", { count: "exact" });

      if (filters.warehouseId) {
        query = query.eq("warehouse_id", filters.warehouseId);
      }
      if (filters.productId) {
        query = query.eq("product_id", filters.productId);
      }
      if (filters.needsReorder === true) {
        query = query.eq("needs_reorder", true);
      }
      if (filters.searchTerm) {
        query = query.or(
          `product_name.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,product_code.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`
        );
      }

      // Pagination
      const from = (state.currentPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      const { data, error, count } = await query
        .order("product_name")
        .range(from, to);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        stockLevels: (data as StockLevel[]) || [],
        totalCount: count || 0,
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch stock levels";
      console.error("Error fetching stock levels:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters, state.currentPage, state.pageSize]);

  // Fetch stock batches
  const fetchStockBatches = useCallback(async () => {
    try {
      let query = supabase
        .from("stock_batches")
        .select("*")
        .eq("status", "active");

      if (filters.warehouseId) {
        query = query.eq("warehouse_id", filters.warehouseId);
      }
      if (filters.productId) {
        query = query.eq("product_id", filters.productId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        stockBatches: data || [],
      }));
    } catch (err: unknown) {
      console.error("Error fetching stock batches:", err);
    }
  }, [filters.warehouseId, filters.productId]);

  // Fetch reorder rules
  const fetchReorderRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("reorder_rules")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        reorderRules: data || [],
      }));
    } catch (err: unknown) {
      console.error("Error fetching reorder rules:", err);
    }
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      // Get all stock levels for calculations
      const { data: allStock, error: stockError } = await supabase
        .from("stock_levels")
        .select("*");

      if (stockError) throw stockError;

      const { count: warehouseCount, error: whError } = await supabase
        .from("warehouses")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (whError) throw whError;

      const { count: productCount, error: prodError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (prodError) throw prodError;

      const stocks = allStock || [];
      const lowStock = stocks.filter((s) => s.needs_reorder === true);
      const outOfStock = stocks.filter((s) => Number(s.total_quantity) === 0);

      const stats: InventoryDashboardStats = {
        totalProducts: productCount || 0,
        lowStockItems: lowStock.length,
        outOfStockItems: outOfStock.length,
        totalWarehouses: warehouseCount || 0,
        pendingReorders: lowStock.length, // Items that need reorder
      };

      setState((prev) => ({ ...prev, stats }));
    } catch (err: unknown) {
      console.error("Error fetching inventory stats:", err);
    }
  }, []);

  // Add stock batch
  const addStockBatch = useCallback(
    async (data: StockBatchInsert): Promise<{ success: boolean; error?: string; data?: StockBatch }> => {
      try {
        const { data: newBatch, error } = await supabase
          .from("stock_batches")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        fetchStockLevels();
        fetchStockBatches();

        return { success: true, data: newBatch };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add stock";
        console.error("Error adding stock batch:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchStockLevels, fetchStockBatches]
  );

  // Update stock batch
  const updateStockBatch = useCallback(
    async (id: string, data: StockBatchUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("stock_batches").update(data).eq("id", id);

        if (error) throw error;

        fetchStockLevels();
        fetchStockBatches();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update stock";
        console.error("Error updating stock batch:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchStockLevels, fetchStockBatches]
  );

  // Create reorder rule
  const createReorderRule = useCallback(
    async (data: ReorderRuleInsert): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("reorder_rules").insert(data);

        if (error) throw error;

        fetchReorderRules();
        fetchStockLevels();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create reorder rule";
        console.error("Error creating reorder rule:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchReorderRules, fetchStockLevels]
  );

  // Get stock by product
  const getStockByProduct = useCallback(
    (productId: string): StockLevel[] => {
      return state.stockLevels.filter((s) => s.product_id === productId);
    },
    [state.stockLevels]
  );

  // Get low stock items
  const getLowStockItems = useCallback((): StockLevel[] => {
    return state.stockLevels.filter((s) => s.needs_reorder === true);
  }, [state.stockLevels]);

  // Set filters
  const setFilters = useCallback((newFilters: InventoryFilters) => {
    setFiltersState(newFilters);
    setState((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Set page
  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  }, []);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    fetchStockLevels();
    fetchStockBatches();
    fetchReorderRules();
    fetchStats();
  }, [fetchStockLevels, fetchStockBatches, fetchReorderRules, fetchStats]);

  // Initialize on mount
  useEffect(() => {
    fetchStockLevels();
    fetchStockBatches();
    fetchReorderRules();
    fetchStats();
  }, [fetchStockLevels, fetchStockBatches, fetchReorderRules, fetchStats]);

  return {
    ...state,
    addStockBatch,
    updateStockBatch,
    createReorderRule,
    getStockByProduct,
    getLowStockItems,
    setFilters,
    setPage,
    setPageSize,
    refresh,
    fetchStats,
  };
}

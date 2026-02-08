"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { Warehouse, WarehouseInsert, WarehouseUpdate } from "@/src/types/phaseB";

interface UseWarehousesState {
  warehouses: Warehouse[];
  isLoading: boolean;
  error: string | null;
}

interface UseWarehousesReturn extends UseWarehousesState {
  createWarehouse: (data: WarehouseInsert) => Promise<{ success: boolean; error?: string; data?: Warehouse }>;
  updateWarehouse: (id: string, data: WarehouseUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteWarehouse: (id: string) => Promise<{ success: boolean; error?: string }>;
  getWarehouseById: (id: string) => Warehouse | undefined;
  refresh: () => void;
}

/**
 * Hook for managing warehouses/storage locations
 */
export function useWarehouses(societyId?: string): UseWarehousesReturn {
  const [state, setState] = useState<UseWarehousesState>({
    warehouses: [],
    isLoading: true,
    error: null,
  });

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true);

      if (societyId) {
        query = query.eq("society_id", societyId);
      }

      const { data, error } = await query.order("warehouse_name");

      if (error) throw error;

      setState({
        warehouses: data || [],
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch warehouses";
      console.error("Error fetching warehouses:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [societyId]);

  // Create warehouse
  const createWarehouse = useCallback(
    async (data: WarehouseInsert): Promise<{ success: boolean; error?: string; data?: Warehouse }> => {
      try {
        const { data: newWarehouse, error } = await supabase
          .from("warehouses")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          warehouses: [...prev.warehouses, newWarehouse].sort((a, b) =>
            a.warehouse_name.localeCompare(b.warehouse_name)
          ),
        }));

        return { success: true, data: newWarehouse };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create warehouse";
        console.error("Error creating warehouse:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Update warehouse
  const updateWarehouse = useCallback(
    async (id: string, data: WarehouseUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("warehouses").update(data).eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          warehouses: prev.warehouses.map((w) =>
            w.id === id ? { ...w, ...data } : w
          ),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update warehouse";
        console.error("Error updating warehouse:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Soft delete warehouse
  const deleteWarehouse = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("warehouses")
          .update({ is_active: false })
          .eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          warehouses: prev.warehouses.filter((w) => w.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete warehouse";
        console.error("Error deleting warehouse:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Get warehouse by ID
  const getWarehouseById = useCallback(
    (id: string): Warehouse | undefined => {
      return state.warehouses.find((w) => w.id === id);
    },
    [state.warehouses]
  );

  // Refresh
  const refresh = useCallback(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Initialize on mount
  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return {
    ...state,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    getWarehouseById,
    refresh,
  };
}

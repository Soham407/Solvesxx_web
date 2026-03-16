"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { JobMaterialUsed, JobMaterialUsedInsert, AddMaterialUsedForm } from "@/src/types/operations";

interface UseJobMaterialsState {
  materials: JobMaterialUsed[];
  isLoading: boolean;
  error: string | null;
}

interface UseJobMaterialsReturn extends UseJobMaterialsState {
  fetchMaterials: (jobSessionId: string) => Promise<void>;
  addMaterial: (data: AddMaterialUsedForm) => Promise<{ success: boolean; error?: string; data?: JobMaterialUsed }>;
  removeMaterial: (id: string) => Promise<{ success: boolean; error?: string }>;
  getTotalCost: () => number;
}

/**
 * Hook for managing materials used in job sessions
 * Integrates with inventory for stock deduction
 */
export function useJobMaterials(): UseJobMaterialsReturn {
  const [state, setState] = useState<UseJobMaterialsState>({
    materials: [],
    isLoading: false,
    error: null,
  });

  // Fetch materials for a job session
  const fetchMaterials = useCallback(async (jobSessionId: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("job_materials_used")
        .select(`
          *,
          products (
            product_name,
            product_code,
            unit
          )
        `)
        .eq("job_session_id", jobSessionId)
        .order("created_at");

      if (error) throw error;

      setState({
        materials: data || [],
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch materials";
      console.error("Error fetching job materials:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Add material used (trigger will deduct from stock)
  const addMaterial = useCallback(
    async (data: AddMaterialUsedForm): Promise<{ success: boolean; error?: string; data?: JobMaterialUsed }> => {
      try {
        // If stock batch not specified, find the oldest active batch with available stock
        let stockBatchId = data.stockBatchId;

        if (!stockBatchId) {
          const { data: batches, error: batchError } = await supabase
            .from("stock_batches")
            .select("id, current_quantity")
            .eq("product_id", data.productId)
            .eq("status", "active")
            .gte("current_quantity", data.quantity)
            .order("created_at", { ascending: true })
            .limit(1);

          if (batchError) throw batchError;

          if (!batches || batches.length === 0) {
            return { success: false, error: "Insufficient stock available" };
          }

          stockBatchId = batches[0].id;
        }

        // Get unit cost from batch
        const { data: batchData } = await supabase
          .from("stock_batches")
          .select("unit_cost")
          .eq("id", stockBatchId)
          .single();

        const materialData: JobMaterialUsedInsert = {
          job_session_id: data.jobSessionId,
          product_id: data.productId,
          quantity: data.quantity,
          stock_batch_id: stockBatchId,
          unit_cost: batchData?.unit_cost || null,
          notes: data.notes,
        };

        const { data: newMaterial, error } = await supabase
          .from("job_materials_used")
          .insert(materialData)
          .select()
          .single();

        if (error) throw error;

        // The trigger deduct_stock_on_material_use will handle stock deduction

        setState((prev) => ({
          ...prev,
          materials: [...prev.materials, newMaterial],
        }));

        return { success: true, data: newMaterial };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add material";
        console.error("Error adding job material:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Remove material (note: stock is not automatically restored)
  const removeMaterial = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("job_materials_used").delete().eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          materials: prev.materials.filter((m) => m.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to remove material";
        console.error("Error removing job material:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Calculate total cost of materials used
  const getTotalCost = useCallback((): number => {
    return state.materials.reduce((total, m) => {
      const cost = (m.unit_cost || 0) * m.quantity;
      return total + cost;
    }, 0);
  }, [state.materials]);

  return {
    ...state,
    fetchMaterials,
    addMaterial,
    removeMaterial,
    getTotalCost,
  };
}

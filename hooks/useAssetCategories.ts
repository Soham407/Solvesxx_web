"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { AssetCategory, AssetCategoryInsert, AssetCategoryUpdate } from "@/src/types/operations";

interface UseAssetCategoriesState {
  categories: AssetCategory[];
  isLoading: boolean;
  error: string | null;
}

interface UseAssetCategoriesReturn extends UseAssetCategoriesState {
  createCategory: (data: AssetCategoryInsert) => Promise<{ success: boolean; error?: string; data?: AssetCategory }>;
  updateCategory: (id: string, data: AssetCategoryUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  getCategoryById: (id: string) => AssetCategory | undefined;
  refresh: () => void;
}

/**
 * Hook for managing asset categories
 * Supports CRUD operations and hierarchical categories
 */
export function useAssetCategories(): UseAssetCategoriesReturn {
  const [state, setState] = useState<UseAssetCategoriesState>({
    categories: [],
    isLoading: true,
    error: null,
  });

  // Fetch all active categories
  const fetchCategories = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("asset_categories")
        .select("*")
        .eq("is_active", true)
        .order("category_name");

      if (error) throw error;

      setState({
        categories: data || [],
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch categories";
      console.error("Error fetching asset categories:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Create new category
  const createCategory = useCallback(
    async (data: AssetCategoryInsert): Promise<{ success: boolean; error?: string; data?: AssetCategory }> => {
      try {
        const { data: newCategory, error } = await supabase
          .from("asset_categories")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          categories: [...prev.categories, newCategory].sort((a, b) =>
            a.category_name.localeCompare(b.category_name)
          ),
        }));

        return { success: true, data: newCategory };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create category";
        console.error("Error creating category:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Update category
  const updateCategory = useCallback(
    async (id: string, data: AssetCategoryUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("asset_categories")
          .update(data)
          .eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          categories: prev.categories.map((cat) =>
            cat.id === id ? { ...cat, ...data } : cat
          ),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update category";
        console.error("Error updating category:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Soft delete category (set is_active = false)
  const deleteCategory = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("asset_categories")
          .update({ is_active: false })
          .eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          categories: prev.categories.filter((cat) => cat.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete category";
        console.error("Error deleting category:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Get category by ID
  const getCategoryById = useCallback(
    (id: string): AssetCategory | undefined => {
      return state.categories.find((cat) => cat.id === id);
    },
    [state.categories]
  );

  // Refresh data
  const refresh = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Initialize on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    ...state,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    refresh,
  };
}

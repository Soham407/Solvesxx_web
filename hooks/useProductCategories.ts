"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  buildProductCategoryItemCounts,
  mapProductCategoryRow,
  mapProductCategoryRows,
  type CreateProductCategoryDTO,
  type ProductCategory,
  type ProductCategoryRow,
  type ProductRow,
  type UpdateProductCategoryDTO,
} from "@/src/lib/product-categories/productCategoryTransforms";

export type {
  CreateProductCategoryDTO,
  ProductCategory,
  UpdateProductCategoryDTO,
} from "@/src/lib/product-categories/productCategoryTransforms";

export function useProductCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
        await Promise.all([
          supabase.from("product_categories").select("*").order("category_name"),
          supabase.from("products").select("category_id"),
        ]);

      if (categoryError) throw categoryError;
      if (productError) throw productError;

      const productCountByCategory = buildProductCategoryItemCounts((productRows || []) as ProductRow[]);

      const mappedCategories: ProductCategory[] = mapProductCategoryRows(
        (categoryRows || []) as ProductCategoryRow[],
        productCountByCategory
      );

      setCategories(mappedCategories);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load product categories";
      console.error("Error fetching product categories:", err);
      setError(message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (input: CreateProductCategoryDTO) => {
    try {
      const { data, error: insertError } = await supabase
        .from("product_categories")
        .insert({
          category_name: input.category_name,
          category_code: input.category_code || null,
          description: input.description || null,
          parent_category_id: input.parent_category_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Category created",
        description: `${input.category_name} has been added to the catalog.`,
      });

      await fetchCategories();
      return { success: true as const, data: mapProductCategoryRow(data as ProductCategoryRow, 0) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchCategories, toast]);

  const updateCategory = useCallback(async (categoryId: string, updates: UpdateProductCategoryDTO) => {
    try {
      const { data, error: updateError } = await supabase
        .from("product_categories")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: "Category updated",
        description: "Category details have been saved.",
      });

      await fetchCategories();
      return { success: true as const, data: mapProductCategoryRow(data as ProductCategoryRow, 0) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update category";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchCategories, toast]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", categoryId);

      if (deleteError) throw deleteError;

      toast({
        title: "Category deleted",
        description: "Category has been removed from the catalog.",
      });

      await fetchCategories();
      return { success: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchCategories, toast]);

  const setCategoryArchived = useCallback(async (categoryId: string, archived: boolean) => {
    return updateCategory(categoryId, { is_active: !archived });
  }, [updateCategory]);

  return {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryArchived,
    refresh: fetchCategories,
  };
}

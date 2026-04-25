"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface ProductSubcategory {
  id: string;
  category_id: string | null;
  subcategory_name: string;
  subcategory_code: string | null;
  description: string | null;
  is_active: boolean;
  parentCategory: string;
  itemCount: number;
}

export interface CreateProductSubcategoryDTO {
  category_id?: string;
  subcategory_name: string;
  subcategory_code?: string;
  description?: string;
}

export interface UpdateProductSubcategoryDTO {
  category_id?: string | null;
  subcategory_name?: string;
  subcategory_code?: string;
  description?: string;
  is_active?: boolean;
}

export function useProductSubcategories() {
  const { toast } = useToast();
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubcategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ data: subcategoryRows, error: subcategoryError }, { data: productRows, error: productError }] =
        await Promise.all([
          supabase
            .from("product_subcategories")
            .select(`
              *,
              product_categories(category_name)
            `)
            .order("subcategory_name"),
          supabase.from("products").select("subcategory_id"),
        ]);

      if (subcategoryError) throw subcategoryError;
      if (productError) throw productError;

      const productCountBySubcategory = new Map<string, number>();
      (productRows || []).forEach((product: any) => {
        if (!product.subcategory_id) return;
        productCountBySubcategory.set(
          product.subcategory_id,
          (productCountBySubcategory.get(product.subcategory_id) || 0) + 1
        );
      });

      const mappedSubcategories: ProductSubcategory[] = (subcategoryRows || []).map((subcategory: any) => {
        const category = Array.isArray(subcategory.product_categories)
          ? subcategory.product_categories[0]
          : subcategory.product_categories;

        return {
          ...subcategory,
          is_active: subcategory.is_active !== false,
          parentCategory: category?.category_name || "Uncategorized",
          itemCount: productCountBySubcategory.get(subcategory.id) || 0,
        };
      });

      setSubcategories(mappedSubcategories);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load product subcategories";
      console.error("Error fetching product subcategories:", err);
      setError(message);
      setSubcategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  const createSubcategory = useCallback(async (input: CreateProductSubcategoryDTO) => {
    try {
      const { data, error: insertError } = await supabase
        .from("product_subcategories")
        .insert({
          category_id: input.category_id || null,
          subcategory_name: input.subcategory_name,
          subcategory_code: input.subcategory_code || null,
          description: input.description || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Subcategory created",
        description: `${input.subcategory_name} has been added to the catalog.`,
      });

      await fetchSubcategories();
      return { success: true as const, data: data as unknown as ProductSubcategory };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create subcategory";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchSubcategories, toast]);

  const updateSubcategory = useCallback(async (subcategoryId: string, updates: UpdateProductSubcategoryDTO) => {
    try {
      const { data, error: updateError } = await supabase
        .from("product_subcategories")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subcategoryId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: "Subcategory updated",
        description: "Subcategory details have been saved.",
      });

      await fetchSubcategories();
      return { success: true as const, data: data as unknown as ProductSubcategory };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update subcategory";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchSubcategories, toast]);

  const deleteSubcategory = useCallback(async (subcategoryId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("product_subcategories")
        .delete()
        .eq("id", subcategoryId);

      if (deleteError) throw deleteError;

      toast({
        title: "Subcategory deleted",
        description: "Subcategory has been removed from the catalog.",
      });

      await fetchSubcategories();
      return { success: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete subcategory";
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false as const, error: message };
    }
  }, [fetchSubcategories, toast]);

  const setSubcategoryArchived = useCallback(async (subcategoryId: string, archived: boolean) => {
    return updateSubcategory(subcategoryId, { is_active: !archived });
  }, [updateSubcategory]);

  return {
    subcategories,
    isLoading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    setSubcategoryArchived,
    refresh: fetchSubcategories,
  };
}

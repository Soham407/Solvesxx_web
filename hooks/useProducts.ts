"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { sanitizeLikeInput } from "@/lib/sanitize";

/**
 * Products Hook
 * PRD Reference: "Product Master" (7) + "Equipment Supply (Inventory)" (II)
 * 
 * Features:
 * - Product attributes: Name, Product Code, Rate, Unit
 * - Stock tracking with reorder alerts
 * - Category and subcategory filtering
 * - Low stock notifications
 * 
 * Phase C Update: Removed mock data fallback - now fully integrated with Supabase
 */

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category_id: string | null;
  subcategory_id: string | null;
  unit_of_measurement: string | null;
  base_rate: number | null;
  min_stock_level: number;
  current_stock: number;
  status: "active" | "inactive" | "discontinued";
  description: string | null;
  hsn_code: string | null;
  tax_rate: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined data
  category?: {
    category_name: string;
    category_code: string;
  };
  subcategory?: {
    subcategory_name: string;
  };
}

export interface ProductStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeProducts: number;
  totalValue: number;
}

export interface CreateProductDTO {
  product_code: string;
  product_name: string;
  category_id?: string;
  subcategory_id?: string;
  unit_of_measurement?: string;
  base_rate?: number;
  min_stock_level?: number;
  current_stock?: number;
  description?: string;
  hsn_code?: string;
  tax_rate?: number;
}

export interface UpdateProductDTO {
  product_code?: string;
  product_name?: string;
  category_id?: string;
  subcategory_id?: string;
  unit_of_measurement?: string;
  base_rate?: number;
  min_stock_level?: number;
  current_stock?: number;
  status?: "active" | "inactive" | "discontinued";
  description?: string;
  hsn_code?: string;
  tax_rate?: number;
}

export interface ProductFilters {
  status?: "active" | "inactive" | "discontinued" | "all";
  categoryId?: string;
  stockStatus?: "all" | "low_stock" | "out_of_stock" | "in_stock";
  searchTerm?: string;
}

export function useProducts(initialFilters?: ProductFilters) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeProducts: 0,
    totalValue: 0,
  });
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});

  // Calculate statistics
  const calculateStats = useCallback((productList: Product[]) => {
    const activeProducts = productList.filter(p => p.status === "active");
    const lowStock = productList.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
    const outOfStock = productList.filter(p => p.current_stock === 0);
    const totalValue = productList.reduce((sum, p) => sum + (p.current_stock * (p.base_rate || 0)), 0);

    setStats({
      totalProducts: productList.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      activeProducts: activeProducts.length,
      totalValue,
    });
  }, []);

  // Fetch all products with filters
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          category:product_categories(category_name, category_code),
          subcategory:product_subcategories(subcategory_name)
        `)
        .order("product_name", { ascending: true });

      // Apply filters
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      if (filters.searchTerm) {
        query = query.or(`product_name.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,product_code.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply stock status filter (can't do in query easily)
      let filteredData = (data || []) as unknown as Product[];
      
      if (filters.stockStatus === "low_stock") {
        filteredData = filteredData.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
      } else if (filters.stockStatus === "out_of_stock") {
        filteredData = filteredData.filter(p => p.current_stock === 0);
      } else if (filters.stockStatus === "in_stock") {
        filteredData = filteredData.filter(p => p.current_stock > p.min_stock_level);
      }

      setProducts(filteredData);
      calculateStats(filteredData);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      console.error("Error fetching products:", err);
      setError(errorMessage);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, calculateStats]);

  // Get single product by ID
  const getProductById = useCallback(async (productId: string): Promise<Product | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select(`
          *,
          category:product_categories(category_name, category_code),
          subcategory:product_subcategories(subcategory_name)
        `)
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;
      return data as unknown as Product;
    } catch (err: unknown) {
      console.error("Error fetching product:", err);
      return null;
    }
  }, []);

  // Add new product
  const addProduct = useCallback(async (product: CreateProductDTO): Promise<{ success: boolean; data?: Product; error?: string }> => {
    try {
      const { data, error: insertError } = await supabase
        .from("products")
        .insert({
          product_code: product.product_code,
          product_name: product.product_name,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          unit_of_measurement: product.unit_of_measurement,
          base_rate: product.base_rate,
          min_stock_level: product.min_stock_level || 10,
          current_stock: product.current_stock || 0,
          description: product.description,
          hsn_code: product.hsn_code,
          tax_rate: product.tax_rate,
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Product Added",
        description: `${product.product_name} has been added to inventory`,
      });

      await fetchProducts();
      return { success: true, data: data as unknown as Product };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchProducts, toast]);

  // Update product
  const updateProduct = useCallback(async (
    productId: string,
    updates: UpdateProductDTO
  ): Promise<{ success: boolean; data?: Product; error?: string }> => {
    try {
      const { data, error: updateError } = await supabase
        .from("products")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: "Product Updated",
        description: "Product details have been updated",
      });

      await fetchProducts();
      return { success: true, data: data as unknown as Product };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchProducts, toast]);

  // Delete product
  const deleteProduct = useCallback(async (productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) throw deleteError;

      toast({
        title: "Product Deleted",
        description: "Product has been removed from inventory",
      });

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchProducts, toast]);

  // Update stock level
  const updateStock = useCallback(async (
    productId: string,
    newStock: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      toast({
        title: "Stock Updated",
        description: reason || "Inventory level has been updated",
      });

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update stock";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchProducts, toast]);

  // Adjust stock (add or subtract)
  const adjustStock = useCallback(async (
    productId: string,
    adjustment: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // First get current stock
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("current_stock, product_name")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;
      if (!product) throw new Error("Product not found");

      const newStock = Math.max(0, (product.current_stock || 0) + adjustment);

      const { error: updateError } = await supabase
        .from("products")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      const action = adjustment > 0 ? "added to" : "removed from";
      toast({
        title: "Stock Adjusted",
        description: reason || `${Math.abs(adjustment)} units ${action} ${product.product_name}`,
      });

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to adjust stock";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchProducts, toast]);

  // Get stock status for display
  const getStockStatus = useCallback((product: Product): { label: string; color: string; variant: "critical" | "warning" | "success" } => {
    if (product.current_stock === 0) {
      return { label: "Out of Stock", color: "text-critical bg-critical/10", variant: "critical" };
    }
    if (product.current_stock <= product.min_stock_level) {
      return { label: "Low Stock", color: "text-warning bg-warning/10", variant: "warning" };
    }
    return { label: "In Stock", color: "text-success bg-success/10", variant: "success" };
  }, []);

  // Get low stock products
  const getLowStockProducts = useCallback((): Product[] => {
    return products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
  }, [products]);

  // Get out of stock products
  const getOutOfStockProducts = useCallback((): Product[] => {
    return products.filter(p => p.current_stock === 0);
  }, [products]);

  // Search products
  const searchProducts = useCallback((searchTerm: string): Product[] => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      p => p.product_name.toLowerCase().includes(term) ||
           p.product_code.toLowerCase().includes(term)
    );
  }, [products]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    // Data
    products,
    stats,
    isLoading,
    error,
    
    // CRUD Actions
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    
    // Stock Management
    updateStock,
    adjustStock,
    
    // Queries
    getLowStockProducts,
    getOutOfStockProducts,
    searchProducts,
    
    // Helpers
    getStockStatus,
    clearError,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: fetchProducts,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

/**
 * Products Hook
 * PRD Reference: "Product Master" (7) + "Equipment Supply (Inventory)" (II)
 * 
 * Features:
 * - Product attributes: Name, Product Code, Rate, Unit
 * - Stock tracking with reorder alerts
 * - Category and subcategory filtering
 * - Low stock notifications
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
  created_at: string;
  updated_at: string;
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
}

export interface ProductFilters {
  status?: "active" | "inactive" | "all";
  categoryId?: string;
  stockStatus?: "all" | "low_stock" | "out_of_stock" | "in_stock";
  searchTerm?: string;
}

// Fallback mock data for when tables don't exist yet
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    product_code: "CLN-001",
    product_name: "Floor Cleaning Solution (5L)",
    category_id: "1",
    subcategory_id: null,
    unit_of_measurement: "Liters",
    base_rate: 450,
    min_stock_level: 10,
    current_stock: 45,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Cleaning Essentials", category_code: "CLN" },
  },
  {
    id: "2",
    product_code: "CLN-002",
    product_name: "Glass Cleaner Spray (500ml)",
    category_id: "1",
    subcategory_id: null,
    unit_of_measurement: "Pieces",
    base_rate: 180,
    min_stock_level: 20,
    current_stock: 8,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Cleaning Essentials", category_code: "CLN" },
  },
  {
    id: "3",
    product_code: "PST-001",
    product_name: "Deltamethrin Insecticide (1L)",
    category_id: "2",
    subcategory_id: null,
    unit_of_measurement: "Liters",
    base_rate: 850,
    min_stock_level: 5,
    current_stock: 12,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Pest Control", category_code: "PST" },
  },
  {
    id: "4",
    product_code: "AC-001",
    product_name: "R32 Refrigerant Gas (10kg)",
    category_id: "3",
    subcategory_id: null,
    unit_of_measurement: "Cylinders",
    base_rate: 3200,
    min_stock_level: 3,
    current_stock: 0,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "AC Equipment", category_code: "AC" },
  },
  {
    id: "5",
    product_code: "AC-002",
    product_name: "AC Capacitor 35MF",
    category_id: "3",
    subcategory_id: null,
    unit_of_measurement: "Pieces",
    base_rate: 280,
    min_stock_level: 10,
    current_stock: 25,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "AC Equipment", category_code: "AC" },
  },
  {
    id: "6",
    product_code: "STN-001",
    product_name: "A4 Printer Paper (500 sheets)",
    category_id: "4",
    subcategory_id: null,
    unit_of_measurement: "Reams",
    base_rate: 350,
    min_stock_level: 15,
    current_stock: 42,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Stationery", category_code: "STN" },
  },
  {
    id: "7",
    product_code: "AFR-001",
    product_name: "Air Freshener Refill (Lavender)",
    category_id: "5",
    subcategory_id: null,
    unit_of_measurement: "Pieces",
    base_rate: 120,
    min_stock_level: 25,
    current_stock: 18,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Air Fresheners", category_code: "AFR" },
  },
  {
    id: "8",
    product_code: "DSP-001",
    product_name: "Disposable Cups (Pack of 100)",
    category_id: "6",
    subcategory_id: null,
    unit_of_measurement: "Packs",
    base_rate: 95,
    min_stock_level: 30,
    current_stock: 55,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { category_name: "Disposables", category_code: "DSP" },
  },
];

export function useProducts(initialFilters?: ProductFilters) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeProducts: 0,
  });
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});

  // Fetch all products with filters
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from products table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
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
        query = query.or(`product_name.ilike.%${filters.searchTerm}%,product_code.ilike.%${filters.searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Table doesn't exist yet - use mock data
        console.log("Products table not found, using mock data:", fetchError.message);
        setIsUsingMockData(true);
        
        let mockData = [...MOCK_PRODUCTS];
        
        // Apply filters to mock data
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          mockData = mockData.filter(
            p => p.product_name.toLowerCase().includes(term) || 
                 p.product_code.toLowerCase().includes(term)
          );
        }

        if (filters.stockStatus === "low_stock") {
          mockData = mockData.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
        } else if (filters.stockStatus === "out_of_stock") {
          mockData = mockData.filter(p => p.current_stock === 0);
        } else if (filters.stockStatus === "in_stock") {
          mockData = mockData.filter(p => p.current_stock > p.min_stock_level);
        }

        setProducts(mockData);
        calculateStats(mockData);
        setIsLoading(false);
        return;
      }

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
      setIsUsingMockData(false);
      calculateStats(filteredData);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      console.error("Error fetching products:", err);
      setError(errorMessage);
      
      // Fallback to mock data
      setIsUsingMockData(true);
      setProducts(MOCK_PRODUCTS);
      calculateStats(MOCK_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Calculate statistics
  const calculateStats = (productList: Product[]) => {
    const activeProducts = productList.filter(p => p.status === "active");
    const lowStock = productList.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level);
    const outOfStock = productList.filter(p => p.current_stock === 0);

    setStats({
      totalProducts: productList.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      activeProducts: activeProducts.length,
    });
  };

  // Add new product
  const addProduct = async (product: CreateProductDTO) => {
    if (isUsingMockData) {
      toast({
        title: "Demo Mode",
        description: "Products table not yet created. This action is simulated.",
        variant: "default",
      });
      return { success: true, data: null };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
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
          status: "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Product Added",
        description: `${product.product_name} has been added to inventory`,
      });

      fetchProducts();
      return { success: true, data };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add product";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Update stock level
  const updateStock = async (productId: string, newStock: number) => {
    if (isUsingMockData) {
      // Update mock data locally
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, current_stock: newStock } : p)
      );
      toast({
        title: "Stock Updated (Demo)",
        description: "Stock level updated in demo mode",
      });
      return { success: true };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("products")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (updateError) throw updateError;

      toast({
        title: "Stock Updated",
        description: "Inventory level has been updated",
      });

      fetchProducts();
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
  };

  // Get stock status
  const getStockStatus = (product: Product): { label: string; color: string } => {
    if (product.current_stock === 0) {
      return { label: "Out of Stock", color: "text-critical bg-critical/10" };
    }
    if (product.current_stock <= product.min_stock_level) {
      return { label: "Low Stock", color: "text-warning bg-warning/10" };
    }
    return { label: "In Stock", color: "text-success bg-success/10" };
  };

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
    isUsingMockData,
    
    // Actions
    addProduct,
    updateStock,
    
    // Helpers
    getStockStatus,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: fetchProducts,
  };
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Package, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/src/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface PlantationInventoryItem {
  id: string;
  product_name: string;
  product_code: string;
  current_stock: number;
  unit: string;
  reorder_level: number;
  status: "Stable" | "Low" | "Critical";
}

export function PlantationInventory() {
  const [inventory, setInventory] = useState<PlantationInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch products related to plantation/horticulture
      const { data, error: fetchError } = await supabase
        .from("stock_levels")
        .select(`
          product_id,
          total_quantity,
          reorder_level,
          unit_of_measurement,
          products!product_id (
            product_name,
            product_code,
            category_id
          )
        `)
        .limit(10);

      if (fetchError) throw fetchError;

      // Filter for plantation-related items
      const plantationItems = (data || [])
        .filter((item: any) => {
          const name = item.products?.product_name?.toLowerCase() || "";
          const code = item.products?.product_code?.toLowerCase() || "";
          return (
            name.includes("seed") ||
            name.includes("fertilizer") ||
            name.includes("manure") ||
            name.includes("soil") ||
            name.includes("plant") ||
            name.includes("garden") ||
            name.includes("horticulture") ||
            code.includes("plt") ||
            code.includes("grd")
          );
        })
        .map((item: any): PlantationInventoryItem => {
          const currentStock = item.total_quantity || 0;
          const reorderLevel = item.reorder_level || 0;
          const status: PlantationInventoryItem["status"] =
            currentStock === 0
              ? "Critical"
              : currentStock <= reorderLevel
              ? "Low"
              : "Stable";

          return {
            id: item.product_id,
            product_name: item.products?.product_name || "Unknown Product",
            product_code: item.products?.product_code || "N/A",
            current_stock: currentStock,
            unit: item.unit_of_measurement || "units",
            reorder_level: reorderLevel,
            status,
          };
        });

      setInventory(plantationItems);
    } catch (err) {
      console.error("Error fetching plantation inventory:", err);
      setError("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No plantation inventory items found.</p>
        <p className="text-xs mt-1">Add products with plantation category to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inventory.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed"
        >
          <div className="flex flex-col">
            <span className="text-xs font-bold">{item.product_name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {item.current_stock} {item.unit}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] font-bold h-4",
              item.status === "Critical"
                ? "text-critical border-critical/20 bg-critical/5 animate-pulse"
                : item.status === "Low"
                ? "text-warning border-warning/20 bg-warning/5"
                : "border-none bg-success/10 text-success"
            )}
          >
            {item.status === "Low" && <AlertTriangle className="h-3 w-3 mr-1" />}
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

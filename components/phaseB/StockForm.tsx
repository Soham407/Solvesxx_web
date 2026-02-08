"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Calendar,
  Save,
  X,
  Loader2,
  Warehouse,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory } from "@/hooks/useInventory";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { StockBatchInsert } from "@/src/types/phaseB";
import { supabase } from "@/src/lib/supabaseClient";

interface StockFormProps {
  preselectedProductId?: string;
  preselectedWarehouseId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Product {
  id: string;
  product_name: string;
  product_code: string | null;
  unit: string | null;
}

export function StockForm({
  preselectedProductId,
  preselectedWarehouseId,
  onSuccess,
  onCancel,
}: StockFormProps) {
  const { addStockBatch } = useInventory();
  const { warehouses } = useWarehouses();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    productId: preselectedProductId || "",
    warehouseId: preselectedWarehouseId || "",
    batchNumber: "",
    quantity: "",
    unitCost: "",
    manufacturingDate: "",
    expiryDate: "",
  });

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, product_name, product_code, unit")
          .eq("is_active", true)
          .order("product_name");

        if (data) setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    }

    fetchProducts();
  }, []);

  // Generate batch number
  useEffect(() => {
    if (!formData.batchNumber) {
      const today = new Date();
      const batchNum = `BTH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      setFormData((prev) => ({ ...prev, batchNumber: batchNum }));
    }
  }, [formData.batchNumber]);

  // Get selected product unit
  const selectedProduct = products.find((p) => p.id === formData.productId);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity");
        setIsSubmitting(false);
        return;
      }

      const stockData: StockBatchInsert = {
        product_id: formData.productId,
        warehouse_id: formData.warehouseId,
        batch_number: formData.batchNumber,
        initial_quantity: quantity,
        current_quantity: quantity,
        unit_cost: formData.unitCost ? parseFloat(formData.unitCost) : null,
        manufacturing_date: formData.manufacturingDate || null,
        expiry_date: formData.expiryDate || null,
        status: "active",
      };

      const result = await addStockBatch(stockData);

      if (result.success) {
        onSuccess?.();
      } else {
        alert(result.error || "Failed to add stock");
      }
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Add Stock Batch
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product & Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.productId}
                onValueChange={(val) => setFormData({ ...formData, productId: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.product_name} {prod.product_code && `(${prod.product_code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select
                value={formData.warehouseId}
                onValueChange={(val) => setFormData({ ...formData, warehouseId: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.warehouse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Batch Number */}
          <div>
            <Label htmlFor="batchNumber">Batch Number *</Label>
            <Input
              id="batchNumber"
              value={formData.batchNumber}
              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              placeholder="BTH-YYYYMMDD-XXXXX"
              required
            />
          </div>

          {/* Quantity & Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">
                Quantity * {selectedProduct?.unit && `(${selectedProduct.unit})`}
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="unitCost">Unit Cost (₹)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturingDate">Manufactured Date</Label>
              <Input
                id="manufacturingDate"
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) =>
                  setFormData({ ...formData, manufacturingDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
          {/* Summary */}
          {formData.quantity && formData.unitCost && (
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-bold">
                  ₹{(parseFloat(formData.quantity) * parseFloat(formData.unitCost)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Add Stock
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

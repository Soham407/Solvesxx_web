"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/hooks/useProducts";

interface ProductStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: Product | null;
  newStock: string;
  setNewStock: (value: string) => void;
  isUpdating: boolean;
  onUpdate: () => void;
}

export function ProductStockDialog({
  open,
  onOpenChange,
  selectedProduct,
  newStock,
  setNewStock,
  isUpdating,
  onUpdate,
}: ProductStockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Stock Level</DialogTitle>
          <DialogDescription>Adjust the current stock count for the selected product.</DialogDescription>
        </DialogHeader>
        {selectedProduct && (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-bold">{selectedProduct.product_name}</p>
              <p className="text-xs text-muted-foreground">{selectedProduct.product_code}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">New Stock Level</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter new stock quantity"
              />
              <p className="text-xs text-muted-foreground">
                Current: {selectedProduct.current_stock} | Min Level: {selectedProduct.min_stock_level}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUpdate} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

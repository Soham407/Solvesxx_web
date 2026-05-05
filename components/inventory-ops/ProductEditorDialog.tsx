"use client";

import type { Dispatch, SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { ProductFormData } from "@/src/lib/inventory/productEditor";

interface CategoryLike {
  id: string;
  category_name: string;
}

interface SubcategoryLike {
  id: string;
  category_id: string;
  subcategory_name: string;
}

interface ProductEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  productForm: ProductFormData;
  setProductForm: Dispatch<SetStateAction<ProductFormData>>;
  categories: CategoryLike[];
  availableSubcategories: SubcategoryLike[];
  onSubmit: () => void;
}

export function ProductEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  productForm,
  setProductForm,
  categories,
  availableSubcategories,
  onSubmit,
}: ProductEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product_code">Product Code</Label>
            <Input
              id="product_code"
              value={productForm.product_code}
              onChange={(e) => setProductForm((prev) => ({ ...prev, product_code: e.target.value }))}
              placeholder="e.g. PROD-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name</Label>
            <Input
              id="product_name"
              value={productForm.product_name}
              onChange={(e) => setProductForm((prev) => ({ ...prev, product_name: e.target.value }))}
              placeholder="e.g. Electrical Cable"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={productForm.category_id || "none"}
              onValueChange={(value) =>
                setProductForm((prev) => ({
                  ...prev,
                  category_id: value === "none" ? "" : value,
                  subcategory_id: "",
                }))
              }
            >
              <SelectTrigger id="category_id">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subcategory_id">Subcategory</Label>
            <Select
              value={productForm.subcategory_id || "none"}
              onValueChange={(value) =>
                setProductForm((prev) => ({
                  ...prev,
                  subcategory_id: value === "none" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="subcategory_id">
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subcategory</SelectItem>
                {availableSubcategories.map((subcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.subcategory_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_of_measurement">Unit</Label>
            <Input
              id="unit_of_measurement"
              value={productForm.unit_of_measurement}
              onChange={(e) => setProductForm((prev) => ({ ...prev, unit_of_measurement: e.target.value }))}
              placeholder="e.g. pcs, kg, box"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_rate">Base Rate</Label>
            <Input
              id="base_rate"
              type="number"
              min="0"
              step="0.01"
              value={productForm.base_rate}
              onChange={(e) => setProductForm((prev) => ({ ...prev, base_rate: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_stock_level">Min Stock Level</Label>
            <Input
              id="min_stock_level"
              type="number"
              min="0"
              value={productForm.min_stock_level}
              onChange={(e) => setProductForm((prev) => ({ ...prev, min_stock_level: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_stock">Current Stock</Label>
            <Input
              id="current_stock"
              type="number"
              min="0"
              value={productForm.current_stock}
              onChange={(e) => setProductForm((prev) => ({ ...prev, current_stock: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsn_code">HSN Code</Label>
            <Input
              id="hsn_code"
              value={productForm.hsn_code}
              onChange={(e) => setProductForm((prev) => ({ ...prev, hsn_code: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_rate">Tax Rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              min="0"
              step="0.01"
              value={productForm.tax_rate}
              onChange={(e) => setProductForm((prev) => ({ ...prev, tax_rate: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={productForm.description}
              onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

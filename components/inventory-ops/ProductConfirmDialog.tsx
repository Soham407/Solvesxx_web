"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@/hooks/useProducts";

interface ProductConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: Product | null;
  confirmAction: "archive" | "restore" | "delete" | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function ProductConfirmDialog({
  open,
  onOpenChange,
  selectedProduct,
  confirmAction,
  isSubmitting,
  onConfirm,
}: ProductConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmAction === "delete"
              ? "Delete Product"
              : confirmAction === "archive"
                ? "Archive Product"
                : "Restore Product"}
          </DialogTitle>
          <DialogDescription>
            {confirmAction === "delete"
              ? "This will permanently remove the product from the catalog."
              : confirmAction === "archive"
                ? "This will mark the product inactive."
                : "This will make the product active again."}
          </DialogDescription>
        </DialogHeader>
        {selectedProduct && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-bold text-sm">{selectedProduct.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedProduct.product_code} • {selectedProduct.status}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={confirmAction === "delete" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmAction === "delete"
              ? "Delete Product"
              : confirmAction === "archive"
                ? "Archive Product"
                : "Restore Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

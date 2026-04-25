"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, RotateCcw, Package, Building2, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useRTVTickets, CreateRTVTicketDTO } from "@/hooks/useRTVTickets";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  supplier_id: z.string().min(1, "Vendor is required"),
  product_id: z.string().min(1, "Product is required"),
  return_reason: z.string().min(1, "Reason for return is required"),
  quantity: z.string().min(1, "Quantity is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  unit_of_measurement: z.string().optional(),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
});

type FormInput = z.input<typeof formSchema>;

interface InitiateReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InitiateReturnDialog({
  open,
  onOpenChange,
  onSuccess,
}: InitiateReturnDialogProps) {
  const { createTicket } = useRTVTickets();
  const { products, isLoading: loadingProducts } = useProducts();
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers();

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: "",
      product_id: "",
      return_reason: "",
      quantity: "",
      unit_of_measurement: "Units",
      estimated_value: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormInput) => {
    const payload: CreateRTVTicketDTO = {
      supplier_id: values.supplier_id,
      product_id: values.product_id,
      return_reason: values.return_reason,
      quantity: Number(values.quantity),
      unit_of_measurement: values.unit_of_measurement,
      estimated_value: values.estimated_value ? Number(values.estimated_value) : undefined,
      notes: values.notes,
    };

    const result = await createTicket(payload);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-critical">
            <RotateCcw className="h-5 w-5" />
            Initiate Return to Vendor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Origin Vendor</Label>
            <Select 
              onValueChange={(v) => form.setValue("supplier_id", v)}
              value={form.watch("supplier_id")}
              disabled={loadingSuppliers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSuppliers ? "Loading vendors..." : "Select vendor"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.supplier_id && (
              <p className="text-xs text-destructive">{form.formState.errors.supplier_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product_id">Material / Product</Label>
            <Select 
              onValueChange={(v) => form.setValue("product_id", v)}
              value={form.watch("product_id")}
              disabled={loadingProducts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select product"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.product_name} ({p.product_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.product_id && (
              <p className="text-xs text-destructive">{form.formState.errors.product_id.message}</p>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                {...form.register("quantity")}
              />
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit_of_measurement">Unit</Label>
              <Select 
                onValueChange={(v) => form.setValue("unit_of_measurement", v)}
                value={form.watch("unit_of_measurement")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Units">Units</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Liters">Liters</SelectItem>
                  <SelectItem value="Boxes">Boxes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return_reason">Return Reason</Label>
            <Select 
              onValueChange={(v) => form.setValue("return_reason", v)}
              value={form.watch("return_reason")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Damaged Material">Damaged Material</SelectItem>
                <SelectItem value="Wrong Item Delivered">Wrong Item Delivered</SelectItem>
                <SelectItem value="Quality Mismatch">Quality Mismatch</SelectItem>
                <SelectItem value="Surplus Stock">Surplus Stock</SelectItem>
                <SelectItem value="Expired Goods">Expired Goods</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.return_reason && (
              <p className="text-xs text-destructive">{form.formState.errors.return_reason.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Internal Comments</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Provide more details about the defect..."
              className="resize-none"
              {...form.register("notes")}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 bg-critical hover:bg-critical/90">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Raise RTV Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

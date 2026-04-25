"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2, Star } from "lucide-react";

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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useVendorWiseServices, VendorWiseService } from "@/hooks/useVendorWiseServices";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useServices } from "@/hooks/useServices";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  supplier_id: z.string().min(1, "Vendor is required"),
  service_id: z.string().min(1, "Service is required"),
  vendor_rate: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, "Rate must be a positive number"),
  response_time_sla: z.string().optional(),
  is_preferred: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface VendorServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: VendorWiseService | null;
  onSuccess?: () => void;
}

export function VendorServiceDialog({
  open,
  onOpenChange,
  mapping,
  onSuccess,
}: VendorServiceDialogProps) {
  const { createVendorService, updateVendorService } = useVendorWiseServices();
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { services, isLoading: loadingServices } = useServices();
  
  const isEdit = Boolean(mapping);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: "",
      service_id: "",
      vendor_rate: "",
      response_time_sla: "",
      is_preferred: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (mapping) {
      form.reset({
        supplier_id: mapping.supplier_id,
        service_id: mapping.service_id,
        vendor_rate: mapping.vendor_rate ? String(mapping.vendor_rate / 100) : "", // Convert paise to rupees for UI
        response_time_sla: mapping.response_time_sla ?? "",
        is_preferred: mapping.is_preferred,
        is_active: mapping.is_active,
      });
      return;
    }

    form.reset({
      supplier_id: "",
      service_id: "",
      vendor_rate: "",
      response_time_sla: "",
      is_preferred: false,
      is_active: true,
    });
  }, [form, mapping, open]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormOutput) => {
    const payload = {
      supplier_id: values.supplier_id,
      service_id: values.service_id,
      vendor_rate: values.vendor_rate ? Math.round(Number(values.vendor_rate) * 100) : null, // Convert to paise
      response_time_sla: values.response_time_sla || null,
      is_preferred: values.is_preferred,
      is_active: values.is_active,
    };

    const success = isEdit && mapping
      ? await updateVendorService(mapping.id, payload)
      : await createVendorService(payload as any);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Vendor Authorization" : "New Vendor Authorization"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Service Vendor</Label>
            <Select 
              onValueChange={(v) => form.setValue("supplier_id", v)}
              value={form.watch("supplier_id")}
              disabled={isEdit || loadingSuppliers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSuppliers ? "Loading vendors..." : "Select a vendor"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.supplier_name} ({s.supplier_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.supplier_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.supplier_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service_id">Linked Service</Label>
            <Select 
              onValueChange={(v) => form.setValue("service_id", v)}
              value={form.watch("service_id")}
              disabled={isEdit || loadingServices}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingServices ? "Loading services..." : "Select a service"} />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.service_name} ({s.service_category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.service_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.service_id.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor_rate">Vendor Rate (₹)</Label>
              <Input
                id="vendor_rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("vendor_rate")}
              />
              {form.formState.errors.vendor_rate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.vendor_rate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="response_time_sla">Response SLA</Label>
              <Input
                id="response_time_sla"
                placeholder="e.g. 4 Hours"
                {...form.register("response_time_sla")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_preferred" 
                checked={form.watch("is_preferred")}
                onCheckedChange={(checked) => form.setValue("is_preferred", !!checked)}
              />
              <Label htmlFor="is_preferred" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                Mark as Preferred Vendor for this service
                <Star className="h-3 w-3 text-warning fill-warning" />
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_active" 
                checked={form.watch("is_active")}
                onCheckedChange={(checked) => form.setValue("is_active", !!checked)}
              />
              <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                Authorization is active
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {isEdit ? "Update Authorization" : "Create Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

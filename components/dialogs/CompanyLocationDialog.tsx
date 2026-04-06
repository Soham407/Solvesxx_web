"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MapPin } from "lucide-react";

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
import { useCompanyLocations } from "@/hooks/useCompanyLocations";
import { CompanyLocation } from "@/src/types/company";

const formSchema = z.object({
  location_name: z.string().min(2, "Site name must be at least 2 characters"),
  location_code: z
    .string()
    .min(2, "Location code must be at least 2 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Use letters, numbers, hyphens, or underscores only"),
  location_type: z.string().optional(),
  address: z.string().optional(),
  latitude: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) {
        return true;
      }

      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue >= -90 && numericValue <= 90;
    }, "Latitude must be between -90 and 90"),
  longitude: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) {
        return true;
      }

      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue >= -180 && numericValue <= 180;
    }, "Longitude must be between -180 and 180"),
  geo_fence_radius: z
    .string()
    .min(1, "Geo-fence radius is required")
    .refine((value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 5000;
    }, "Geo-fence radius must be between 0 and 5000 meters"),
  is_active: z.boolean().default(true),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface CompanyLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: CompanyLocation | null;
  onSuccess?: () => void;
}

function normalizeCodeFromName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 24);
}

function parseOptionalNumber(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function CompanyLocationDialog({
  open,
  onOpenChange,
  location,
  onSuccess,
}: CompanyLocationDialogProps) {
  const { createLocation, updateLocation } = useCompanyLocations();
  const isEdit = Boolean(location);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location_name: "",
      location_code: "",
      location_type: "",
      address: "",
      latitude: "",
      longitude: "",
      geo_fence_radius: "50",
      is_active: true,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        location_name: location.location_name,
        location_code: location.location_code,
        location_type: location.location_type ?? "",
        address: location.address ?? "",
        latitude:
          typeof location.latitude === "number" ? String(location.latitude) : "",
        longitude:
          typeof location.longitude === "number" ? String(location.longitude) : "",
        geo_fence_radius:
          typeof location.geo_fence_radius === "number"
            ? String(location.geo_fence_radius)
            : "50",
        is_active: location.is_active !== false,
      });
      return;
    }

    form.reset({
      location_name: "",
      location_code: "",
      location_type: "",
      address: "",
      latitude: "",
      longitude: "",
      geo_fence_radius: "50",
      is_active: true,
    });
  }, [form, location, open]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormOutput) => {
    const payload = {
      location_name: values.location_name.trim(),
      location_code: values.location_code.trim().toUpperCase(),
      location_type: values.location_type?.trim() || null,
      address: values.address?.trim() || null,
      latitude: parseOptionalNumber(values.latitude),
      longitude: parseOptionalNumber(values.longitude),
      geo_fence_radius: Number(values.geo_fence_radius),
      is_active: values.is_active,
    };

    const result = isEdit && location
      ? await updateLocation({
          id: location.id,
          payload,
        })
      : await createLocation(payload);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Company Location" : "Register Company Location"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location_name">Site / Point Name</Label>
              <Input
                id="location_name"
                placeholder="Main Gate"
                {...form.register("location_name")}
                onChange={(event) => {
                  form.setValue("location_name", event.target.value);
                  if (!isEdit && !form.getValues("location_code")) {
                    form.setValue(
                      "location_code",
                      normalizeCodeFromName(event.target.value)
                    );
                  }
                }}
              />
              {form.formState.errors.location_name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.location_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location_code">Location Code</Label>
              <Input
                id="location_code"
                placeholder="GATE-01"
                {...form.register("location_code")}
                disabled={isEdit}
              />
              {form.formState.errors.location_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.location_code.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location_type">Location Type</Label>
              <Input
                id="location_type"
                placeholder="Gate, Warehouse, Office"
                {...form.register("location_type")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="geo_fence_radius">Geo-Fence Radius (Meters)</Label>
              <Input
                id="geo_fence_radius"
                type="number"
                min="0"
                max="5000"
                {...form.register("geo_fence_radius")}
              />
              {form.formState.errors.geo_fence_radius && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.geo_fence_radius.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="19.076"
                {...form.register("latitude")}
              />
              {form.formState.errors.latitude && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.latitude.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="72.8777"
                {...form.register("longitude")}
              />
              {form.formState.errors.longitude && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.longitude.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={3}
              placeholder="Street, city, campus, or landmark details"
              className="resize-none"
              {...form.register("address")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              {...form.register("is_active")}
            />
            Location is active and available for assignment
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isEdit ? "Save Location" : "Register Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

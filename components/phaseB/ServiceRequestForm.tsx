"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  MapPin,
  Package,
  User,
  Calendar,
  AlertTriangle,
  Save,
  X,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useServices } from "@/hooks/useServices";
import { useAssets } from "@/hooks/useAssets";
import type { AssetWithDetails, CreateServiceRequestForm } from "@/src/types/phaseB";
import { SERVICE_PRIORITY, SERVICE_PRIORITY_LABELS } from "@/src/lib/constants";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import { InlineLoader } from "@/components/ui/async-boundary";

interface ServiceRequestFormProps {
  preselectedAsset?: AssetWithDetails | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Location {
  id: string;
  location_name: string;
}

interface Society {
  id: string;
  society_name: string;
}

export function ServiceRequestForm({
  preselectedAsset,
  onSuccess,
  onCancel,
}: ServiceRequestFormProps) {
  const { createRequest } = useServiceRequests();
  const { services, isLoading: isServicesLoading } = useServices();
  const { assets: allAssets, isLoading: isAssetsLoading } = useAssets();

const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [referenceDataError, setReferenceDataError] = useState<string | null>(null);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(true);

  // Form state
  const [formData, setFormData] = useState<CreateServiceRequestForm>({
    title: "",
    description: "",
    serviceId: "",
    assetId: preselectedAsset?.id || "",
    locationId: preselectedAsset?.location_id || "",
    societyId: preselectedAsset?.society_id || "",
    priority: "normal",
    scheduledDate: "",
    scheduledTime: "",
    requesterPhone: "",
  });
  
  const [validationErrors, setValidationErrors] = useState<{
    description?: string;
    requesterPhone?: string;
    scheduling?: string;
  }>({});

// Fetch locations and societies
  useEffect(() => {
    async function fetchReferenceData() {
      setReferenceDataError(null);
      setIsLoadingReferenceData(true);
      try {
        const [locRes, socRes] = await Promise.all([
          supabase.from("company_locations").select("id, location_name").eq("is_active", true),
          supabase.from("societies").select("id, society_name").eq("is_active", true),
        ]);

        // Check for errors in locations response
        if (locRes.error) {
          console.error("Error fetching locations:", locRes.error);
          setReferenceDataError(`Failed to load locations: ${locRes.error.message}`);
        } else if (locRes.data && locRes.data.length > 0) {
          setLocations(locRes.data);
        }

        // Check for errors in societies response
        if (socRes.error) {
          console.error("Error fetching societies:", socRes.error);
          setReferenceDataError((prev) => 
            prev ? `${prev}; Failed to load societies: ${socRes.error!.message}` : `Failed to load societies: ${socRes.error!.message}`
          );
        } else if (socRes.data && socRes.data.length > 0) {
          setSocieties(socRes.data);
        }
      } catch (err) {
        console.error("Error fetching reference data:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setReferenceDataError(`Failed to load reference data: ${errorMessage}`);
      } finally {
        setIsLoadingReferenceData(false);
      }
    }

    fetchReferenceData();
  }, []);

  // Update location when asset is selected
  useEffect(() => {
    if (formData.assetId) {
      const selectedAsset = allAssets.find((a) => a.id === formData.assetId);
      if (selectedAsset) {
        setFormData((prev) => ({
          ...prev,
          locationId: selectedAsset.location_id || prev.locationId,
          societyId: selectedAsset.society_id || prev.societyId,
        }));
      }
    }
  }, [formData.assetId, allAssets]);

  // Validate phone number format
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    // Accepts formats: +91 9876543210, 9876543210, +1-234-567-8900, etc.
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,4}[-\s.]?[0-9]{3,6}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Validate form before submit
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }
    
    if (formData.requesterPhone && !isValidPhone(formData.requesterPhone)) {
      errors.requesterPhone = "Please enter a valid phone number";
    }
    
    // Validate date/time coupling - if one is set, both should be set
    if ((formData.scheduledDate && !formData.scheduledTime) || 
        (!formData.scheduledDate && formData.scheduledTime)) {
      errors.scheduling = "Please provide both date and time, or leave both empty";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const result = await createRequest({
        title: formData.title || null,
        description: formData.description,
        service_id: formData.serviceId || null,
        asset_id: formData.assetId || null,
        location_id: formData.locationId || null,
        society_id: formData.societyId || null,
        priority: formData.priority,
        scheduled_date: formData.scheduledDate || null,
        scheduled_time: formData.scheduledTime || null,
        requester_phone: formData.requesterPhone || null,
      });

if (result.success) {
        toast.success("Service request created successfully");
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create service request");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(`Failed to submit form: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            New Service Request
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Reference Data Error */}
        {referenceDataError && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">{referenceDataError}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preselected Asset Info */}
          {preselectedAsset && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{preselectedAsset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {preselectedAsset.asset_code} • {preselectedAsset.location_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={4}
                required
              />
            </div>
          </div>

          {/* Service & Asset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service">Service Type</Label>
              <Select
                value={formData.serviceId || "__none__"}
                onValueChange={(val) => setFormData({ ...formData, serviceId: val === "__none__" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.service_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!preselectedAsset && (
              <div>
                <Label htmlFor="asset">Related Asset</Label>
                <Select
                  value={formData.assetId || "__none__"}
                  onValueChange={(val) => setFormData({ ...formData, assetId: val === "__none__" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {allAssets.filter(a => a.id).map((asset) => (
                      <SelectItem key={asset.id} value={asset.id!}>
                        {asset.name} ({asset.asset_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

{/* Location & Society */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.locationId || "__none__"}
                onValueChange={(val) => setFormData({ ...formData, locationId: val === "__none__" ? "" : val })}
                disabled={isLoadingReferenceData}
              >
                <SelectTrigger>
                  {isLoadingReferenceData ? (
                    <InlineLoader />
                  ) : (
                    <SelectValue placeholder="Select location" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="society">Society</Label>
              <Select
                value={formData.societyId || "__none__"}
                onValueChange={(val) => setFormData({ ...formData, societyId: val === "__none__" ? "" : val })}
                disabled={isLoadingReferenceData}
              >
                <SelectTrigger>
                  {isLoadingReferenceData ? (
                    <InlineLoader />
                  ) : (
                    <SelectValue placeholder="Select society" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {societies.map((soc) => (
                    <SelectItem key={soc.id} value={soc.id}>
                      {soc.society_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={(val) =>
                setFormData({ ...formData, priority: val as CreateServiceRequestForm["priority"] })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {key === "urgent" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => {
                  setFormData({ ...formData, scheduledDate: e.target.value });
                  setValidationErrors((prev) => ({ ...prev, scheduling: undefined }));
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => {
                  setFormData({ ...formData, scheduledTime: e.target.value });
                  setValidationErrors((prev) => ({ ...prev, scheduling: undefined }));
                }}
              />
            </div>
          </div>
          {validationErrors.scheduling && (
            <p className="text-sm text-destructive -mt-4">{validationErrors.scheduling}</p>
          )}
          <p className="text-xs text-muted-foreground -mt-4">
            Leave both empty for immediate attention, or set both for scheduled service
          </p>

          {/* Contact */}
          <div>
            <Label htmlFor="requesterPhone">Contact Phone</Label>
            <Input
              id="requesterPhone"
              type="tel"
              value={formData.requesterPhone}
              onChange={(e) => {
                setFormData({ ...formData, requesterPhone: e.target.value });
                setValidationErrors((prev) => ({ ...prev, requesterPhone: undefined }));
              }}
              placeholder="+91 9876543210"
              className={validationErrors.requesterPhone ? "border-destructive" : ""}
            />
            {validationErrors.requesterPhone && (
              <p className="text-sm text-destructive mt-1">{validationErrors.requesterPhone}</p>
            )}
          </div>

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
              Create Request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

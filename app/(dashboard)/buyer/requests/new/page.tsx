"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { useProducts } from "@/hooks/useProducts";
import {
  SERVICE_TYPE_OPTIONS,
  serviceTypeLabel,
  useServiceDeploymentMasters,
} from "@/hooks/useServiceDeploymentMasters";
import { useSocieties } from "@/hooks/useSocieties";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CATEGORY_TITLE_MAP: Record<string, string> = {
  ac: "AC Maintenance Request",
  cleaning: "Cleaning Essentials Request",
  eco_disposable: "Eco-Friendly Disposables Request",
  gifting: "Corporate Gifting Request",
  housekeeping: "Housekeeping Services Request",
  pantry: "Pantry & Beverages Request",
  pest_control: "Pest Control Services Request",
  pest_supplies: "Pest Control Supplies Request",
  plantation: "Plantation Services Request",
  printing: "Printing Services Request",
  security: "Security Services Request",
  security_materials: "Security Panel Materials Request",
  staffing: "Staffing Services Request",
  stationery: "Stationery Supplies Request",
};

const SERVICE_CATEGORY_MAP: Record<string, string> = {
  ac: "ac",
  housekeeping: "staffing",
  pest_control: "pest_control",
  plantation: "plantation",
  printing: "printing",
  security: "security",
  staffing: "staffing",
};

const SHIFT_OPTIONS = ["Morning", "Evening", "Night", "24Hr"] as const;

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const { createRequest } = useBuyerRequests();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { societies } = useSocieties();
  const {
    companyLocations,
    getWorkOptionsByServiceType,
    isLoading: isLoadingServiceMasters,
  } = useServiceDeploymentMasters();

  const categorySlug = searchParams.get("category") || "";
  const initialServiceType = SERVICE_CATEGORY_MAP[categorySlug] || "";

  const [requestMode, setRequestMode] = useState<"material" | "service">(
    initialServiceType ? "service" : "material"
  );
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [serviceType, setServiceType] = useState(initialServiceType);
  const [serviceDetails, setServiceDetails] = useState({
    service_grade: "",
    headcount: 1,
    shift: "Morning",
    start_date: "",
    duration_months: 1,
    site_location_id: "",
  });
  const [items, setItems] = useState<{ product_id: string; quantity: number; notes: string }[]>([
    { product_id: "", quantity: 1, notes: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isServiceRequest = requestMode === "service";

  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    const categories: { id: string; name: string }[] = [];

    products.forEach((product) => {
      if (product.category_id && product.category?.category_name && !seen.has(product.category_id)) {
        seen.add(product.category_id);
        categories.push({ id: product.category_id, name: product.category.category_name });
      }
    });

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === "all") {
      return products;
    }

    return products.filter((product) => product.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const filteredWorkOptions = useMemo(
    () => getWorkOptionsByServiceType(serviceType),
    [getWorkOptionsByServiceType, serviceType]
  );

  useEffect(() => {
    if (!categorySlug || title) return;
    const presetTitle = CATEGORY_TITLE_MAP[categorySlug];
    if (presetTitle) {
      setTitle(presetTitle);
    }
  }, [categorySlug, title]);

  useEffect(() => {
    if (!initialServiceType) return;
    setRequestMode("service");
    setServiceType(initialServiceType);
    setCurrentStep(1);
  }, [initialServiceType]);

  useEffect(() => {
    if (isServiceRequest || !categorySlug || selectedCategoryId !== "all" || productCategories.length === 0) return;

    const slug = categorySlug.replace(/_/g, " ").toLowerCase();
    const matchedCategory = productCategories.find(
      (category) =>
        category.name.toLowerCase().includes(slug) ||
        slug.includes(category.name.toLowerCase().split(" ")[0])
    );

    if (matchedCategory) {
      setSelectedCategoryId(matchedCategory.id);
    }
  }, [categorySlug, isServiceRequest, productCategories, selectedCategoryId]);

  useEffect(() => {
    if (
      serviceDetails.service_grade &&
      !filteredWorkOptions.some((option) => option.work_name === serviceDetails.service_grade)
    ) {
      setServiceDetails((prev) => ({ ...prev, service_grade: "" }));
    }
  }, [filteredWorkOptions, serviceDetails.service_grade]);

  const updateServiceDetails = <T extends keyof typeof serviceDetails>(
    field: T,
    value: (typeof serviceDetails)[T]
  ) => {
    setServiceDetails((prev) => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: "", quantity: 1, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItem = (index: number, field: "product_id" | "quantity" | "notes", value: string | number) => {
    setItems((prev) => {
      const nextItems = [...prev];
      nextItems[index] = {
        ...nextItems[index],
        [field]: value,
      };
      return nextItems;
    });
  };

  const validateServiceStepOne = () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title for the service request.",
        variant: "destructive",
      });
      return false;
    }

    if (!locationId) {
      toast({
        title: "Validation Error",
        description: "Please select the buyer location for this deployment.",
        variant: "destructive",
      });
      return false;
    }

    if (!serviceType) {
      toast({
        title: "Validation Error",
        description: "Please choose the service type you want to deploy.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleContinueToServiceDetails = () => {
    if (!validateServiceStepOne()) return;
    setCurrentStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isServiceRequest) {
      if (!validateServiceStepOne()) return;

      if (!serviceDetails.service_grade) {
        toast({
          title: "Validation Error",
          description: "Please select a grade or role for the deployment.",
          variant: "destructive",
        });
        return;
      }

      if (serviceDetails.headcount <= 0 || serviceDetails.duration_months <= 0) {
        toast({
          title: "Validation Error",
          description: "Headcount and duration must both be at least 1.",
          variant: "destructive",
        });
        return;
      }

      if (!serviceDetails.start_date || !serviceDetails.site_location_id) {
        toast({
          title: "Validation Error",
          description: "Please select the deployment start date and site location.",
          variant: "destructive",
        });
        return;
      }
    } else if (items.some((item) => !item.product_id || item.quantity <= 0)) {
      toast({
        title: "Validation Error",
        description: "Please select products and valid quantities for all items.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createRequest({
        title,
        description,
        location_id: locationId,
        preferred_delivery_date: preferredDate || undefined,
        service_type: isServiceRequest ? serviceType : undefined,
        service_grade: isServiceRequest ? serviceDetails.service_grade : undefined,
        headcount: isServiceRequest ? serviceDetails.headcount : undefined,
        shift: isServiceRequest ? serviceDetails.shift : undefined,
        start_date: isServiceRequest ? serviceDetails.start_date : undefined,
        duration_months: isServiceRequest ? serviceDetails.duration_months : undefined,
        site_location_id: isServiceRequest ? serviceDetails.site_location_id : undefined,
        is_service_request: isServiceRequest,
        items: isServiceRequest
          ? []
          : items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              notes: item.notes,
            })),
      });

      if (result) {
        toast({
          title: "Request Submitted",
          description: isServiceRequest
            ? "Your service deployment request has been submitted successfully."
            : "Your order request has been submitted successfully.",
        });
        router.push("/buyer/requests");
      }
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/buyer/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isServiceRequest ? "New Service Deployment Request" : "New Order Request"}
          </h1>
          <p className="text-muted-foreground">
            {isServiceRequest
              ? "Submit the role, grade, headcount, shift, and deployment schedule for a service team."
              : "Submit a new request for goods or services."}
          </p>
        </div>
        {(categorySlug || (isServiceRequest && serviceType)) && (
          <Badge variant="secondary" className="ml-auto capitalize">
            <Package className="h-3 w-3 mr-1" />
            {isServiceRequest && serviceType
              ? serviceTypeLabel(serviceType)
              : categorySlug.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {isServiceRequest && (
        <div className="flex items-center gap-2">
          <Badge variant={currentStep === 1 ? "default" : "secondary"}>Step 1: Request Details</Badge>
          <Badge variant={currentStep === 2 ? "default" : "secondary"}>Step 2: Deployment Details</Badge>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>Basic information about your requirement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Request Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={!isServiceRequest ? "default" : "outline"}
                  onClick={() => {
                    setRequestMode("material");
                    setCurrentStep(1);
                  }}
                >
                  Material Request
                </Button>
                <Button
                  type="button"
                  variant={isServiceRequest ? "default" : "outline"}
                  onClick={() => {
                    setRequestMode("service");
                    if (!serviceType) {
                      setServiceType(initialServiceType || "security");
                    }
                  }}
                >
                  Service Deployment
                </Button>
              </div>
            </div>

            {isServiceRequest && (
              <div className="grid gap-2">
                <Label htmlFor="service-type">Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger id="service-type">
                    <SelectValue placeholder="Select a service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Summary / Title</Label>
              <Input
                id="title"
                placeholder={isServiceRequest ? "e.g., Night shift security deployment" : "e.g., Monthly Pantry Supplies"}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="location">{isServiceRequest ? "Buyer Location (Society)" : "Delivery Site (Society)"}</Label>
                <Select value={locationId} onValueChange={setLocationId} required>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map((society) => (
                      <SelectItem key={society.id} value={society.id}>
                        {society.society_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">
                  {isServiceRequest ? "Preferred Start Window" : "Preferred Delivery Date"}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder={
                  isServiceRequest
                    ? "Describe the deployment requirement, duties, site constraints, and any mandatory certifications..."
                    : "Provide additional context for your request..."
                }
                className="min-h-[100px]"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {!isServiceRequest && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Requested Items</CardTitle>
                <CardDescription>Select the products and quantities needed.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {productCategories.length > 0 && (
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {productCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, "product_id", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingProducts
                              ? "Loading products..."
                              : filteredProducts.length === 0
                                ? "No products in this category"
                                : "Select product"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.product_name}
                            {product.category?.category_name && selectedCategoryId === "all" && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({product.category.category_name})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-[100px] space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, "quantity", parseInt(event.target.value || "0", 10) || 0)
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="Size, color, etc."
                      value={item.notes}
                      onChange={(event) => updateItem(index, "notes", event.target.value)}
                    />
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-critical hover:text-critical"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isServiceRequest && currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Deployment Details
              </CardTitle>
              <CardDescription>
                Capture the role, shift, site, and duration required for this deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="service-grade">Grade / Role</Label>
                  <Select
                    value={serviceDetails.service_grade}
                    onValueChange={(value) => updateServiceDetails("service_grade", value)}
                  >
                    <SelectTrigger id="service-grade">
                      <SelectValue
                        placeholder={
                          isLoadingServiceMasters
                            ? "Loading work master..."
                            : filteredWorkOptions.length === 0
                              ? "No roles configured for this service"
                              : "Select grade / role"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredWorkOptions.map((option) => (
                        <SelectItem key={`${option.service_type}-${option.id}`} value={option.work_name}>
                          {option.work_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="headcount">Headcount</Label>
                  <Input
                    id="headcount"
                    type="number"
                    min="1"
                    value={serviceDetails.headcount}
                    onChange={(event) =>
                      updateServiceDetails("headcount", Math.max(1, parseInt(event.target.value || "1", 10) || 1))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="shift">Shift</Label>
                  <Select
                    value={serviceDetails.shift}
                    onValueChange={(value) => updateServiceDetails("shift", value)}
                  >
                    <SelectTrigger id="shift">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_OPTIONS.map((shift) => (
                        <SelectItem key={shift} value={shift}>
                          {shift}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={serviceDetails.start_date}
                    onChange={(event) => updateServiceDetails("start_date", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="duration-months">Duration (Months)</Label>
                  <Input
                    id="duration-months"
                    type="number"
                    min="1"
                    value={serviceDetails.duration_months}
                    onChange={(event) =>
                      updateServiceDetails(
                        "duration_months",
                        Math.max(1, parseInt(event.target.value || "1", 10) || 1)
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="site-location">Site Location</Label>
                  <Select
                    value={serviceDetails.site_location_id}
                    onValueChange={(value) => updateServiceDetails("site_location_id", value)}
                  >
                    <SelectTrigger id="site-location">
                      <SelectValue
                        placeholder={
                          isLoadingServiceMasters ? "Loading company locations..." : "Select site location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {companyLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap justify-end gap-4">
          <Link href="/buyer/requests">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>

          {isServiceRequest && currentStep === 2 && (
            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Request Details
            </Button>
          )}

          {isServiceRequest && currentStep === 1 ? (
            <Button type="button" className="gap-2" onClick={handleContinueToServiceDetails}>
              Continue to Deployment Details
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isServiceRequest ? "Submit Service Request" : "Submit Request"}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

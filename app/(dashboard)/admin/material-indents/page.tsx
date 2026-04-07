"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, Building2, Check, Loader2, Package, RefreshCw, ShoppingCart, ShieldAlert } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerRequests, type BuyerRequest } from "@/hooks/useBuyerRequests";
import { useIndents } from "@/hooks/useIndents";
import { useSuppliers } from "@/hooks/useSuppliers";
import { getCurrentEmployeeId } from "@/src/lib/security/getCurrentEmployeeId";
import { supabase } from "@/src/lib/supabaseClient";
import { formatCurrency, toPaise } from "@/src/lib/utils/currency";

type MaterialRequestItemRow = {
  id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  products?: {
    product_name?: string | null;
    product_code?: string | null;
    unit_of_measurement?: string | null;
    base_rate?: number | null;
  } | null;
};

type MaterialRateSummaryItem = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  rate: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  hasActiveRate: boolean;
};

type MaterialRateSummary = {
  items: MaterialRateSummaryItem[];
  missingItems: string[];
  hasAllRates: boolean;
};

export default function AdminMaterialIndentsPage() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const {
    requests,
    isLoading: isLoadingRequests,
    linkRequestToIndent,
    fetchRequestById,
    refresh: refreshRequests,
  } = useBuyerRequests();
  const { createIndent, addIndentItem, approveIndent } = useIndents();
  const { suppliers, isLoading: isLoadingSuppliers, refresh: refreshSuppliers } = useSuppliers({ status: "active" } as any);

  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isGeneratingIndent, setIsGeneratingIndent] = useState(false);
  const [materialRateSummary, setMaterialRateSummary] = useState<MaterialRateSummary | null>(null);
  const [isLoadingRateSummary, setIsLoadingRateSummary] = useState(false);

  if (role && role !== "admin" && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view the material indents admin panel.</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  const materialRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "accepted" && !request.indent_id && !request.is_service_request
      ),
    [requests]
  );

  const stats = useMemo(
    () => ({
      accepted: materialRequests.length,
      urgent: materialRequests.filter((request) => request.priority === "urgent").length,
    }),
    [materialRequests]
  );

  const fetchRequestItems = async (requestId: string): Promise<MaterialRequestItemRow[]> => {
    const { data, error } = await (supabase as any)
      .from("request_items")
      .select("*, products(product_name, product_code, unit_of_measurement, base_rate)")
      .eq("request_id", requestId);

    if (error) {
      throw error;
    }

    return (data || []) as MaterialRequestItemRow[];
  };

  const fetchMaterialRateSummary = async (requestId: string, supplierId: string) => {
    setIsLoadingRateSummary(true);

    try {
      const requestItems = await fetchRequestItems(requestId);

      if (requestItems.length === 0) {
        setMaterialRateSummary({
          items: [],
          missingItems: ["This request has no items."],
          hasAllRates: false,
        });
        return;
      }

      const productIds = requestItems
        .map((item) => item.product_id)
        .filter((productId): productId is string => Boolean(productId));
      const today = new Date().toISOString().split("T")[0];

      const { data: supplierProducts, error: supplierProductsError } = productIds.length
        ? await (supabase as any)
            .from("supplier_products")
            .select(`
              product_id,
              supplier_rates (
                rate,
                effective_from,
                is_active
              )
            `)
            .eq("supplier_id", supplierId)
            .in("product_id", productIds)
        : { data: [], error: null };

      if (supplierProductsError) {
        throw supplierProductsError;
      }

      const rateByProductId = new Map<string, { rate: number; effective_from: string; effective_to: string | null }>();

      for (const supplierProduct of supplierProducts || []) {
        const activeRate = (supplierProduct.supplier_rates || [])
          .filter(
            (rate: any) =>
              rate.is_active === true &&
              rate.effective_from <= today &&
              true
          )
          .sort((left: any, right: any) => right.effective_from.localeCompare(left.effective_from))[0];

        if (supplierProduct.product_id && activeRate) {
          rateByProductId.set(supplierProduct.product_id, activeRate);
        }
      }

      const items = requestItems.map((item) => {
        const currentRate = item.product_id ? rateByProductId.get(item.product_id) : null;

        return {
          productId: item.product_id,
          productName: item.products?.product_name || "Unknown Product",
          quantity: item.quantity,
          unitOfMeasure: item.products?.unit_of_measurement || item.unit || "unit",
          rate: currentRate?.rate ?? null,
          effectiveFrom: currentRate?.effective_from ?? null,
          effectiveTo: null,
          hasActiveRate: Boolean(currentRate),
        };
      });

      const missingItems = items.filter((item) => !item.hasActiveRate).map((item) => item.productName);

      setMaterialRateSummary({
        items,
        missingItems,
        hasAllRates: items.length > 0 && missingItems.length === 0,
      });
    } catch (err) {
      console.error("Error fetching material rate summary:", err);
      setMaterialRateSummary(null);
    } finally {
      setIsLoadingRateSummary(false);
    }
  };

  const openGenerateDialog = (request: BuyerRequest) => {
    setSelectedRequest(request);
    setSelectedSupplierId("");
    setMaterialRateSummary(null);
  };

  const closeGenerateDialog = () => {
    setSelectedRequest(null);
    setSelectedSupplierId("");
    setMaterialRateSummary(null);
    setIsLoadingRateSummary(false);
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);

    if (selectedRequest) {
      void fetchMaterialRateSummary(selectedRequest.id, supplierId);
    } else {
      setMaterialRateSummary(null);
    }
  };

  const handleGenerateMaterialIndent = async () => {
    if (!selectedRequest || !selectedSupplierId) {
      toast({
        title: "Supplier Required",
        description: "Please select the supplier that should receive this material indent.",
        variant: "destructive",
      });
      return;
    }

    if (!materialRateSummary?.hasAllRates) {
      toast({
        title: "Rate Verification Failed",
        description: "Set up active supplier rates for every request item before forwarding this indent.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingIndent(true);

    try {
      const freshRequest = await fetchRequestById(selectedRequest.id);
      if (!freshRequest || freshRequest.indent_id) {
        throw new Error("This request already has an indent or no longer exists.");
      }

      const requestItems = await fetchRequestItems(selectedRequest.id);
      if (!requestItems || requestItems.length === 0) {
        throw new Error("This request has no items to forward.");
      }

      const requesterId = await getCurrentEmployeeId();
      const rateByProductId = new Map(
        materialRateSummary.items
          .filter((item) => item.productId && item.hasActiveRate && item.rate !== null)
          .map((item) => [item.productId as string, item])
      );

      const indent = await createIndent({
        requester_id: requesterId,
        supplier_id: selectedSupplierId,
        location_id: selectedRequest.location_id || undefined,
        title: selectedRequest.title,
        purpose: selectedRequest.description || `Material procurement generated from ${selectedRequest.request_number}`,
        required_date: selectedRequest.preferred_delivery_date || undefined,
        priority: (selectedRequest as any).priority || "normal",
        notes: `Generated from buyer request ${selectedRequest.request_number}`,
      });

      if (!indent) {
        throw new Error("Indent creation failed.");
      }

      for (const item of requestItems) {
        const itemRate = item.product_id ? rateByProductId.get(item.product_id) : null;

        await addIndentItem({
          indent_id: indent.id,
          product_id: item.product_id,
          item_description: item.products?.product_name || "Unknown Product",
          requested_quantity: item.quantity,
          unit_of_measure: item.products?.unit_of_measurement || "unit",
          estimated_unit_price:
            itemRate?.rate !== null && itemRate?.rate !== undefined
              ? toPaise(itemRate.rate)
              : item.products?.base_rate || 0,
          notes: item.notes || undefined,
        });
      }

      const approved = await approveIndent(indent.id, user?.id || "system");
      if (!approved) {
        throw new Error("Indent approval failed.");
      }

      const linked = await linkRequestToIndent(selectedRequest.id, {
        indent_id: indent.id,
        supplier_id: selectedSupplierId,
        status: "indent_forwarded",
      });

      if (!linked) {
        throw new Error("Request forwarding failed.");
      }

      toast({
        title: "Material Indent Forwarded",
        description: `${selectedRequest.request_number} has been converted to indent ${indent.indent_number} and forwarded to the supplier.`,
      });

      closeGenerateDialog();
      refreshRequests();
    } catch (err: any) {
      toast({
        title: "Indent Generation Failed",
        description: err.message || "The material indent could not be generated.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIndent(false);
    }
  };

  const columns: ColumnDef<BuyerRequest>[] = [
    {
      accessorKey: "request_number",
      header: "Request #",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-mono text-xs font-bold">{row.original.request_number}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(row.original.created_at), "dd MMM yyyy")}
          </span>
        </div>
      ),
    },
    {
      id: "material",
      header: "Material Request",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-medium text-sm">{row.original.title}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {row.original.category_name || "General Material"}
          </span>
        </div>
      ),
    },
    {
      id: "location",
      header: "Delivery To",
      cell: ({ row }) => (
        <div className="flex flex-col text-left text-xs">
          <span>{row.original.location_name || "Main Office"}</span>
          <span className="text-[10px] text-muted-foreground">
            {row.original.preferred_delivery_date
              ? `Due ${format(new Date(row.original.preferred_delivery_date), "dd MMM yyyy")}`
              : "No date set"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[10px] uppercase font-bold h-5">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" className="gap-2 h-8" onClick={() => openGenerateDialog(row.original)}>
          Generate Indent
          <ArrowRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const isLoading = isLoadingRequests || isLoadingSuppliers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Forwarding Hub"
        description="Convert accepted material requests into official indents and assign them to suppliers."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              refreshRequests();
              refreshSuppliers();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Accepted Material Requests</CardDescription>
            <CardTitle className="text-2xl">{stats.accepted}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-critical">Urgent Orders</CardDescription>
            <CardTitle className="text-2xl text-critical">{stats.urgent}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase">Pending Forwarding Queue</CardTitle>
          <CardDescription className="text-xs">
            Material requests that have been accepted but not yet assigned to a supplier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={materialRequests}
            searchKey="request_number"
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && closeGenerateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Generate Material Indent
            </DialogTitle>
            <DialogDescription>
              Assign this request to a supplier to initiate the procurement workflow.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{selectedRequest.request_number}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequest.title}</p>
                  </div>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] uppercase font-bold">
                    Material
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{selectedRequest.location_name || "Main Office"}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="material-indent-supplier" className="text-xs font-bold uppercase tracking-wider">Select Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger id="material-indent-supplier" className="h-10 border-2">
                    <SelectValue placeholder="Search active suppliers..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No active suppliers found.
                      </div>
                    ) : (
                      suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col py-0.5">
                            <span className="font-bold text-sm">{supplier.supplier_name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{supplier.supplier_code || "No Code"}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4">
                {isLoadingRateSummary ? (
                  <div className="flex items-center justify-center rounded-lg border bg-muted/20 p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-sm">Verifying rate contracts...</span>
                  </div>
                ) : materialRateSummary?.hasAllRates ? (
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader className="px-4 py-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        Active Rate Contracts Found
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Every request item has an active supplier contract and the indent will carry supplier-rate estimates.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 py-2">
                      {materialRateSummary.items.map((item) => (
                        <div
                          key={`${item.productId ?? item.productName}-${item.quantity}`}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty {item.quantity} {item.unitOfMeasure}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-semibold text-success">
                              {item.rate !== null ? formatCurrency(toPaise(item.rate), 2) : "Missing"}
                            </p>
                            <p className="text-muted-foreground">
                              {item.effectiveFrom
                                ? `Valid from ${format(new Date(item.effectiveFrom), "dd MMM yyyy")}`
                                : "No rate period"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : selectedSupplierId ? (
                  <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-destructive">No active rate contract for one or more items</p>
                      <p className="text-xs text-muted-foreground">
                        This request cannot be forwarded until every line item has an active supplier contract.
                      </p>
                      {materialRateSummary?.missingItems?.length ? (
                        <ul className="list-disc pl-4 text-xs text-muted-foreground">
                          {materialRateSummary.missingItems.map((itemName) => (
                            <li key={itemName}>{itemName}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeGenerateDialog} className="text-xs uppercase font-bold tracking-widest">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateMaterialIndent}
              disabled={isGeneratingIndent || !selectedSupplierId || !materialRateSummary?.hasAllRates || isLoadingRateSummary}
              className="gap-2 bg-primary hover:bg-primary/90 text-xs uppercase font-bold tracking-widest h-10 px-6"
            >
              {isGeneratingIndent ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Forward to Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



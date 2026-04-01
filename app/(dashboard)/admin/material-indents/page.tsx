"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, Package, Building2, Loader2, RefreshCw, ShoppingCart, ShieldAlert } from "lucide-react";
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
  const { suppliers, isLoading: isLoadingSuppliers, refresh: refreshSuppliers } = useSuppliers({ status: 'active' } as any);

  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isGeneratingIndent, setIsGeneratingIndent] = useState(false);

  // RBAC Guard
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

  const openGenerateDialog = (request: BuyerRequest) => {
    setSelectedRequest(request);
    setSelectedSupplierId("");
  };

  const closeGenerateDialog = () => {
    setSelectedRequest(null);
    setSelectedSupplierId("");
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

    setIsGeneratingIndent(true);

    try {
      // 1. Re-fetch to prevent race conditions
      const freshRequest = await fetchRequestById(selectedRequest.id);
      if (!freshRequest || freshRequest.indent_id) {
        throw new Error("This request already has an indent or no longer exists.");
      }

      // 2. Fetch request items to include in indent
      const { data: requestItems, error: itemsError } = await (await import("@/src/lib/supabaseClient")).supabase
        .from("request_items")
        .select("*, products(product_name, product_code, unit_of_measurement, base_rate)")
        .eq("request_id", selectedRequest.id);

      if (itemsError) throw itemsError;
      if (!requestItems || requestItems.length === 0) {
        throw new Error("This request has no items to forward.");
      }

      const requesterId = await getCurrentEmployeeId();
      
      // 3. Create the Indent
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

      // 4. Add items to the indent
      for (const item of requestItems) {
        await addIndentItem({
          indent_id: indent.id,
          product_id: item.product_id,
          item_description: item.products?.product_name || "Unknown Product",
          requested_quantity: item.quantity,
          unit_of_measure: item.products?.unit_of_measurement || "unit",
          estimated_unit_price: item.products?.base_rate || 0,
          notes: item.notes || undefined,
        });
      }

      const approved = await approveIndent(indent.id, user?.id || "system");
      if (!approved) {
        throw new Error("Indent approval failed.");
      }

      // 5. Link request to the newly created indent
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
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
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
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeGenerateDialog} className="text-xs uppercase font-bold tracking-widest">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateMaterialIndent}
              disabled={isGeneratingIndent || !selectedSupplierId}
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

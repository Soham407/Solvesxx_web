"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, BriefcaseBusiness, Building2, Check, Loader2, RefreshCw, Users, ShieldAlert } from "lucide-react";
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
import {
  serviceTypeLabel,
  useServiceDeploymentMasters,
} from "@/hooks/useServiceDeploymentMasters";
import { getCurrentEmployeeId } from "@/src/lib/security/getCurrentEmployeeId";
import { supabase } from "@/src/lib/supabaseClient";

function isServiceRequest(request: BuyerRequest) {
  return Boolean(
    request.service_type ||
      request.service_grade ||
      request.shift ||
      request.start_date ||
      request.site_location_id ||
      ((request.headcount ?? 0) > 0)
  );
}

export default function AdminServiceIndentsPage() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const {
    requests,
    isLoading: isLoadingRequests,
    linkRequestToIndent,
    fetchRequestById,
    refresh: refreshRequests,
  } = useBuyerRequests();
  const { createIndent, submitForApproval, approveIndent } = useIndents();
  const {
    getSuppliersByServiceType,
    isLoading: isLoadingMasters,
    refresh: refreshMasters,
  } = useServiceDeploymentMasters();

  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isGeneratingIndent, setIsGeneratingIndent] = useState(false);
  const [activeRate, setActiveRate] = useState<{ rate: number; effective_from: string; effective_to?: string } | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // RBAC Guard
  if (role && role !== "admin" && role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view the service indents admin panel.</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  const serviceRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status === "accepted" && !request.indent_id && isServiceRequest(request)
      ),
    [requests]
  );

  const matchingSuppliers = useMemo(() => {
    if (!selectedRequest?.service_type) return [];
    return getSuppliersByServiceType(selectedRequest.service_type);
  }, [getSuppliersByServiceType, selectedRequest]);

  const stats = useMemo(
    () => ({
      accepted: serviceRequests.length,
      security: serviceRequests.filter((request) => request.service_type === "security").length,
      staffing: serviceRequests.filter((request) => request.service_type === "staffing").length,
    }),
    [serviceRequests]
  );

  const fetchActiveRate = async (supplierId: string, serviceType: string) => {
    setIsLoadingRate(true);
    try {
      const { data, error } = await (supabase as any)
        .from("service_rates")
        .select("rate, effective_from, effective_to")
        .eq("supplier_id", supplierId)
        .eq("service_type", serviceType)
        .eq("is_active", true)
        .lte("effective_from", new Date().toISOString().split("T")[0])
        .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().split("T")[0]}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveRate(data);
    } catch (err) {
      console.error("Error fetching rate:", err);
      setActiveRate(null);
    } finally {
      setIsLoadingRate(false);
    }
  };

  const openGenerateDialog = (request: BuyerRequest) => {
    setSelectedRequest(request);
    const suppliers = getSuppliersByServiceType(request.service_type || "");
    const defaultSupplierId = suppliers[0]?.supplier_id || "";
    setSelectedSupplierId(defaultSupplierId);
    if (defaultSupplierId && request.service_type) {
      fetchActiveRate(defaultSupplierId, request.service_type);
    }
  };

  const closeGenerateDialog = () => {
    setSelectedRequest(null);
    setSelectedSupplierId("");
    setActiveRate(null);
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (selectedRequest?.service_type) {
      fetchActiveRate(supplierId, selectedRequest.service_type);
    }
  };

  const handleGenerateServiceIndent = async () => {
    if (!selectedRequest || !selectedSupplierId) {
      toast({
        title: "Supplier Required",
        description: "Please select the supplier that should receive this service indent.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingIndent(true);

    try {
      if (!user?.id) {
        throw new Error("Authenticated admin user required.");
      }

      // Re-fetch to prevent race conditions
      const freshRequest = await fetchRequestById(selectedRequest.id);
      if (!freshRequest || freshRequest.indent_id) {
        throw new Error("This request already has an indent or no longer exists.");
      }

      const requesterId = await getCurrentEmployeeId();
      const indent = await createIndent({
        requester_id: requesterId,
        supplier_id: selectedSupplierId,
        service_request_id: selectedRequest.id,
        location_id: selectedRequest.site_location_id || selectedRequest.location_id || undefined,
        title: selectedRequest.title,
        purpose: selectedRequest.description || `Service deployment generated from ${selectedRequest.request_number}`,
        required_date: selectedRequest.start_date || selectedRequest.preferred_delivery_date || undefined,
        notes: [
          `Generated from buyer request ${selectedRequest.request_number}`,
          selectedRequest.service_grade ? `Role: ${selectedRequest.service_grade}` : null,
          selectedRequest.headcount ? `Headcount: ${selectedRequest.headcount}` : null,
          selectedRequest.shift ? `Shift: ${selectedRequest.shift}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      });

      if (!indent) {
        throw new Error("Indent creation failed.");
      }

      const submitted = await submitForApproval(indent.id, user.id);
      if (!submitted) {
        throw new Error("Indent submission failed.");
      }

      const approved = await approveIndent(indent.id, user.id);
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
        title: "Service Indent Forwarded",
        description: `${selectedRequest.request_number} is now in the assigned supplier's indent queue.`,
      });

      closeGenerateDialog();
      refreshRequests();
    } catch (err: any) {
      toast({
        title: "Indent Generation Failed",
        description: err.message || "The service indent could not be generated.",
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
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold">{row.original.request_number}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(row.original.created_at), "dd MMM yyyy")}
          </span>
        </div>
      ),
    },
    {
      id: "service",
      header: "Service",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          <span className="text-xs text-muted-foreground">
            {serviceTypeLabel(row.original.service_type)}
          </span>
        </div>
      ),
    },
    {
      id: "deployment",
      header: "Deployment",
      cell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span>{row.original.service_grade || "Role pending"}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.headcount || 0} headcount • {row.original.shift || "Shift pending"}
          </span>
        </div>
      ),
    },
    {
      id: "site",
      header: "Site",
      cell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span>{row.original.site_location_name || "No site selected"}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.start_date
              ? `Starts ${format(new Date(row.original.start_date), "dd MMM yyyy")}`
              : "Start date pending"}
          </span>
        </div>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <Badge variant="outline">
          {(row.original.duration_months || 0) > 0 ? `${row.original.duration_months} month(s)` : "Open"}
        </Badge>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" className="gap-2" onClick={() => openGenerateDialog(row.original)}>
          Generate Service Indent
          <ArrowRight className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const isLoading = isLoadingRequests || isLoadingMasters;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Indents"
        description="Forward accepted buyer service requests to the correct supplier with a linked service indent."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              refreshRequests();
              refreshMasters();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accepted Requests</CardDescription>
            <CardTitle>{stats.accepted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Security Deployment</CardDescription>
            <CardTitle>{stats.security}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Staffing Deployment</CardDescription>
            <CardTitle>{stats.staffing}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accepted Service Requests</CardTitle>
          <CardDescription>
            Only accepted service requests without an existing indent are shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={serviceRequests}
            searchKey="request_number"
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && closeGenerateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Service Indent</DialogTitle>
            <DialogDescription>
              Assign the supplier that should receive this deployment request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedRequest.request_number}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.title}</p>
                  </div>
                  <Badge>{serviceTypeLabel(selectedRequest.service_type)}</Badge>
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BriefcaseBusiness className="h-4 w-4" />
                    <span>{selectedRequest.service_grade || "Role pending"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {selectedRequest.headcount || 0} headcount • {selectedRequest.shift || "Shift pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground md:col-span-2">
                    <Building2 className="h-4 w-4" />
                    <span>{selectedRequest.site_location_name || "No site location selected"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-indent-supplier">Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger id="service-indent-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingSuppliers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No active supplier matches this service type.
                      </div>
                    ) : (
                      matchingSuppliers.map((supplier) => (
                        <SelectItem key={`${supplier.service_type}-${supplier.supplier_id}`} value={supplier.supplier_id}>
                          {supplier.supplier_name}
                          {supplier.supplier_code ? ` (${supplier.supplier_code})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Rate Verification Summary Card */}
              <div className="mt-4">
                {isLoadingRate ? (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/20">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Verifying rate contracts...</span>
                  </div>
                ) : activeRate ? (
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-success" />
                        Active Rate Contract Found
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{serviceTypeLabel(selectedRequest.service_type)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-medium text-success">
                          ₹{(activeRate.rate / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validity:</span>
                        <span>
                          {format(new Date(activeRate.effective_from), "dd MMM yyyy")}
                          {activeRate.effective_to ? ` to ${format(new Date(activeRate.effective_to), "dd MMM yyyy")}` : " (Open)"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ) : selectedSupplierId ? (
                  <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-destructive">No active rate contract</p>
                      <p className="text-xs text-muted-foreground">
                        Please set up rates for this supplier and service type before forwarding.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeGenerateDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateServiceIndent}
              disabled={isGeneratingIndent || !selectedSupplierId || !activeRate || isLoadingRate}
              className="gap-2"
            >
              {isGeneratingIndent && <Loader2 className="h-4 w-4 animate-spin" />}
              Forward to Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

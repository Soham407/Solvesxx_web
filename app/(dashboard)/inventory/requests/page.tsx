"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  RefreshCw, 
  Search, 
  Filter,
  ShoppingCart,
  Briefcase,
  Package,
  ArrowRight,
  Loader2,
  ShieldAlert,
  ClipboardList
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerRequests, type BuyerRequest, type BuyerRequestItem, REQUEST_STATUS_CONFIG } from "@/hooks/useBuyerRequests";
import { cn } from "@/lib/utils";

export default function AdminRequestReviewPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { 
    requests, 
    isLoading, 
    updateRequestStatus, 
    fetchRequestItems, 
    refresh 
  } = useBuyerRequests();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [requestItems, setRequestItems] = useState<BuyerRequestItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // RBAC Guard
  const authorizedRoles = ["admin", "super_admin", "company_hod", "account"];
  const isAuthorized = role && authorizedRoles.includes(role);

  if (role && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have permission to review buyer requests. Please contact your system administrator.
        </p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  // Filter pending requests for review
  const pendingRequests = useMemo(() => 
    requests.filter(req => req.status === 'pending'),
    [requests]
  );

  const stats = useMemo(() => ({
    pending: pendingRequests.length,
    service: pendingRequests.filter(req => req.is_service_request).length,
    material: pendingRequests.filter(req => !req.is_service_request).length,
  }), [pendingRequests]);

  const openDetailSheet = async (request: BuyerRequest) => {
    setSelectedRequest(request);
    setShowDetailSheet(true);
    setItemsLoading(true);
    const items = await fetchRequestItems(request.id);
    setRequestItems(items);
    setItemsLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    setIsProcessing(true);
    const success = await updateRequestStatus(requestId, 'accepted');
    setIsProcessing(false);
    
    if (success) {
      toast({
        title: "Request Accepted",
        description: "The request has been moved to the processing queue.",
      });
      setShowDetailSheet(false);
      setSelectedRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    
    setIsProcessing(true);
    const success = await updateRequestStatus(selectedRequest.id, 'rejected', rejectionReason);
    setIsProcessing(false);
    
    if (success) {
      toast({
        title: "Request Rejected",
        description: "The request has been rejected and the buyer has been notified.",
      });
      setShowRejectDialog(false);
      setShowDetailSheet(false);
      setSelectedRequest(null);
      setRejectionReason("");
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
      accessorKey: "title",
      header: "Title & Type",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.title}</span>
          <div className="flex items-center gap-2 mt-1">
            {row.original.is_service_request ? (
              <Badge variant="outline" className="text-[10px] h-4 bg-indigo/5 text-indigo border-indigo/20">
                <Briefcase className="h-2.5 w-2.5 mr-1" /> Service
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 bg-orange/5 text-orange border-orange/20">
                <Package className="h-2.5 w-2.5 mr-1" /> Material
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              {row.original.category_name || "Uncategorized"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.site_location_name || row.original.location_name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "preferred_delivery_date",
      header: "Preferred Date",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.preferred_delivery_date 
            ? format(new Date(row.original.preferred_delivery_date), "dd MMM yyyy")
            : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5"
            onClick={() => openDetailSheet(row.original)}
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </Button>
          <Button 
            size="sm" 
            className="h-8 bg-success hover:bg-success/90"
            onClick={() => handleAccept(row.original.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Buyer Request Review"
        description="Review, accept, or reject incoming procurement and service deployment requests from buyers."
        actions={
          <Button variant="outline" onClick={refresh} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats.pending}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Awaiting Review</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-indigo-500">{stats.service}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Service Deployments</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-orange-500">{stats.material}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Material Orders</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Pending Requests
              </CardTitle>
              <CardDescription>
                New requests that need admin approval to proceed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable 
            columns={columns} 
            data={pendingRequests} 
            onSearch={setSearchTerm} 
            searchKey="request_number"
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Request Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Review {selectedRequest?.request_number}
            </SheetTitle>
            <SheetDescription>
              Detailed view of the buyer request for review
            </SheetDescription>
          </SheetHeader>

          {selectedRequest && (
            <div className="mt-6 space-y-6">
              {/* Request Type Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-bold text-xs uppercase px-3 py-1",
                    selectedRequest.is_service_request 
                      ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                      : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  )}
                >
                  {selectedRequest.is_service_request ? "Service Deployment" : "Material Request"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedRequest.created_at), "MMM d, yyyy p")}
                </span>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                <div>
                  <h4 className="font-bold text-sm">{selectedRequest.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{selectedRequest.description || "No description provided."}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs pt-2">
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase font-bold text-[10px]">Category</span>
                    <span className="font-medium">{selectedRequest.category_name || "Uncategorized"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1 uppercase font-bold text-[10px]">Location</span>
                    <span className="font-medium">{selectedRequest.site_location_name || selectedRequest.location_name || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Service Details if applicable */}
              {selectedRequest.is_service_request && (
                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-indigo-600 flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5" /> Service Parameters
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Service Type</span>
                      <span className="font-bold uppercase">{selectedRequest.service_type || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Grade / Role</span>
                      <span className="font-bold">{selectedRequest.service_grade || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Headcount</span>
                      <span className="font-bold">{selectedRequest.headcount || 0} persons</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Shift</span>
                      <span className="font-bold">{selectedRequest.shift || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Start Date</span>
                      <span className="font-bold">
                        {selectedRequest.start_date ? format(new Date(selectedRequest.start_date), "dd MMM yyyy") : "ASAP"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1 font-medium">Duration</span>
                      <span className="font-bold">{selectedRequest.duration_months || 0} month(s)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Items if applicable */}
              {!selectedRequest.is_service_request && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Material Items
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-[10px] uppercase">Product</TableHead>
                          <TableHead className="text-right text-[10px] uppercase">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsLoading ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ) : requestItems.length > 0 ? (
                          requestItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs py-2">
                                <div className="font-medium">{item.product_name || "Unknown Product"}</div>
                                {item.notes && <p className="text-[10px] text-muted-foreground">{item.notes}</p>}
                              </TableCell>
                              <TableCell className="text-right text-xs py-2 font-bold">
                                {item.quantity} {item.unit || "units"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">
                              No items found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Separator />

              {/* Review Actions */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="gap-2 text-critical border-critical/20 hover:bg-critical/5"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4" />
                  Reject Request
                </Button>
                <Button 
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => handleAccept(selectedRequest.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Accept Request
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting request {selectedRequest?.request_number}.
              This will be visible to the buyer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejection..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={isProcessing || !rejectionReason.trim()}
              variant="destructive"
              className="gap-2"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

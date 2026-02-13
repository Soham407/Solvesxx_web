"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  FileText, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  ArrowUpRight,
  Filter,
  Loader2,
  RefreshCw,
  Building,
  Send,
  PackageCheck,
  Ban,
  Calendar,
  MapPin,
  Receipt,
  Package,
  X,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  BadgeCheck,
  ClipboardList
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  usePurchaseOrders, 
  PurchaseOrder, 
  POItem, 
  POStatus, 
  PO_STATUS_CONFIG,
} from "@/hooks/usePurchaseOrders";
import { formatCurrency } from "@/src/lib/utils/currency";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useToast } from "@/components/ui/use-toast";

// Status filter options
const STATUS_OPTIONS: { value: POStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent_to_vendor", label: "Sent to Vendor" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "partial_received", label: "Partial Received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

export default function POTrackingPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  // Handle Record Receipt
  const handleRecordReceipt = (po: PurchaseOrder) => {
    router.push(`/inventory/grn?po_id=${po.id}`);
  };

  // Hooks
  const {
    purchaseOrders,
    items,
    selectedPO,
    isLoading,
    error,
    refresh,
    createPurchaseOrder,
    sendToVendor,
    acknowledgePO,
    cancelPO,
    deletePurchaseOrder,
    selectPO,
    getPOWithItems,
    fetchPOItems,
  } = usePurchaseOrders();

  const { suppliers, isLoading: suppliersLoading } = useSuppliers({ status: 'active' } as any);

  // Local state
  const [statusFilter, setStatusFilter] = useState<POStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; poId: string; poNumber: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailItems, setDetailItems] = useState<POItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state for new PO
  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    shipping_address: "",
    billing_address: "",
    payment_terms: "Net 30",
    notes: "",
  });

  // Calculate stats
  const stats = useMemo(() => {
    const all = purchaseOrders;
    return {
      draft: all.filter(po => po.status === "draft").length,
      inApproval: all.filter(po => po.status === "sent_to_vendor").length,
      active: all.filter(po => ["acknowledged", "partial_received"].includes(po.status || "")).length,
      delayed: all.filter(po => {
        if (!po.expected_delivery_date || po.status === "received" || po.status === "cancelled") return false;
        return new Date(po.expected_delivery_date) < new Date();
      }).length,
      received: all.filter(po => po.status === "received").length,
      cancelled: all.filter(po => po.status === "cancelled").length,
    };
  }, [purchaseOrders]);

  // Filter POs based on status and search
  const filteredPOs = useMemo(() => {
    let result = purchaseOrders;
    
    if (statusFilter !== "all") {
      result = result.filter(po => po.status === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(po => 
        po.po_number?.toLowerCase().includes(term) ||
        po.supplier_name?.toLowerCase().includes(term) ||
        po.indent_number?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [purchaseOrders, statusFilter, searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier_id: "",
      expected_delivery_date: "",
      shipping_address: "",
      billing_address: "",
      payment_terms: "Net 30",
      notes: "",
    });
  };

  // Create new PO
  const handleCreatePO = async () => {
    if (!formData.supplier_id) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createPurchaseOrder({
      supplier_id: formData.supplier_id,
      expected_delivery_date: formData.expected_delivery_date || undefined,
      shipping_address: formData.shipping_address || undefined,
      billing_address: formData.billing_address || undefined,
      payment_terms: formData.payment_terms || undefined,
      notes: formData.notes || undefined,
    });
    setIsSubmitting(false);

    if (result) {
      toast({
        title: "Purchase Order Created",
        description: `PO ${result.po_number || result.id.slice(0, 8)} has been created as draft`,
      });
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  // Open PO detail sheet
  const openDetailSheet = async (po: PurchaseOrder) => {
    setDetailLoading(true);
    setDetailSheetOpen(true);
    await selectPO(po.id);
    const items = await fetchPOItems(po.id);
    setDetailItems(items);
    setDetailLoading(false);
  };

  // Handle action with confirmation
  const handleActionConfirm = async () => {
    if (!confirmAction) return;
    
    setIsSubmitting(true);
    let success = false;

    switch (confirmAction.type) {
      case "send":
        success = await sendToVendor(confirmAction.poId);
        if (success) {
          toast({ title: "PO Sent", description: `${confirmAction.poNumber} has been sent to vendor` });
        }
        break;
      case "acknowledge":
        success = await acknowledgePO(confirmAction.poId);
        if (success) {
          toast({ title: "PO Acknowledged", description: `${confirmAction.poNumber} has been acknowledged` });
        }
        break;
      case "cancel":
        success = await cancelPO(confirmAction.poId);
        if (success) {
          toast({ title: "PO Cancelled", description: `${confirmAction.poNumber} has been cancelled` });
        }
        break;
      case "delete":
        success = await deletePurchaseOrder(confirmAction.poId);
        if (success) {
          toast({ title: "PO Deleted", description: `${confirmAction.poNumber} has been deleted` });
        }
        break;
    }

    setIsSubmitting(false);
    setConfirmDialogOpen(false);
    setConfirmAction(null);

    // Close detail sheet if the action was performed from there
    if (success && detailSheetOpen) {
      setDetailSheetOpen(false);
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (type: string, po: PurchaseOrder) => {
    setConfirmAction({
      type,
      poId: po.id,
      poNumber: po.po_number || `PO-${po.id.slice(0, 8)}`,
    });
    setConfirmDialogOpen(true);
  };

  // Get action text for confirmation
  const getActionText = (type: string) => {
    switch (type) {
      case "send": return { title: "Send to Vendor", description: "This will send the PO to the vendor for acknowledgment.", action: "Send" };
      case "acknowledge": return { title: "Acknowledge PO", description: "Mark this PO as acknowledged by the vendor.", action: "Acknowledge" };
      case "cancel": return { title: "Cancel PO", description: "This will cancel the purchase order. This action cannot be undone for non-draft POs.", action: "Cancel", variant: "destructive" as const };
      case "delete": return { title: "Delete PO", description: "This will permanently delete the purchase order. Only draft POs can be deleted.", action: "Delete", variant: "destructive" as const };
      default: return { title: "Confirm", description: "Are you sure?", action: "Confirm" };
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Check if PO is delayed
  const isDelayed = (po: PurchaseOrder) => {
    if (!po.expected_delivery_date || po.status === "received" || po.status === "cancelled") return false;
    return new Date(po.expected_delivery_date) < new Date();
  };

  // Table columns
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "po_number",
      header: "PO Reference",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">{row.original.po_number || `PO-${row.original.id.slice(0, 8)}`}</span>
              {isDelayed(row.original) && (
                <Badge variant="outline" className="h-4 px-1 text-[8px] bg-critical/10 text-critical border-critical/20">
                  DELAYED
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              {formatDate(row.original.po_date)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">{row.original.supplier_name || "Unknown"}</span>
        </div>
      ),
    },
    {
      accessorKey: "indent_number",
      header: "Linked Indent",
      cell: ({ row }) => (
        row.original.indent_number ? (
          <Badge variant="outline" className="bg-muted/30 border-none font-medium text-xs gap-1">
            <ClipboardList className="h-3 w-3" />
            {row.original.indent_number}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Direct PO</span>
        )
      ),
    },
    {
      accessorKey: "grand_total",
      header: "Order Value",
      cell: ({ row }) => (
        <span className="text-sm font-bold">
          {row.original.grand_total ? formatCurrency(row.original.grand_total) : "TBD"}
        </span>
      ),
    },
    {
      accessorKey: "expected_delivery_date",
      header: "Expected Delivery",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className={cn(
            isDelayed(row.original) && "text-critical font-medium"
          )}>
            {formatDate(row.original.expected_delivery_date)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || "draft";
        const config = PO_STATUS_CONFIG[status];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config?.className)}>
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const po = row.original;
        const status = po.status || "draft";
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openDetailSheet(po)} className="gap-2">
                <Eye className="h-3.5 w-3.5" /> View Details
              </DropdownMenuItem>
              
              {status === "draft" && (
                <DropdownMenuItem onClick={() => openConfirmDialog("send", po)} className="gap-2 text-info">
                  <Send className="h-3.5 w-3.5" /> Send to Vendor
                </DropdownMenuItem>
              )}
              
              {status === "sent_to_vendor" && (
                <DropdownMenuItem onClick={() => openConfirmDialog("acknowledge", po)} className="gap-2 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Mark Acknowledged
                </DropdownMenuItem>
              )}
              
              {["acknowledged", "partial_received"].includes(status) && (
                <DropdownMenuItem onClick={() => handleRecordReceipt(po)} className="gap-2 text-success">
                  <PackageCheck className="h-3.5 w-3.5" /> Record Receipt
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {["draft", "sent_to_vendor"].includes(status) && (
                <DropdownMenuItem onClick={() => openConfirmDialog("cancel", po)} className="gap-2 text-critical">
                  <Ban className="h-3.5 w-3.5" /> Cancel PO
                </DropdownMenuItem>
              )}
              
              {status === "draft" && (
                <DropdownMenuItem onClick={() => openConfirmDialog("delete", po)} className="gap-2 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Purchase Orders"
        description="Lifecycle tracking for all material procurement from external vendors."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Raise New PO
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats.draft}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Draft</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-info">{stats.inApproval}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sent</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{stats.active}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-critical">{stats.delayed}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Delayed</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-critical/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-critical" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-success">{stats.received}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Received</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{purchaseOrders.length}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search PO number, supplier, indent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as POStatus | "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* PO Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Purchase Orders
          </CardTitle>
          <CardDescription>
            {filteredPOs.length} purchase order{filteredPOs.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {filteredPOs.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No purchase orders found</CardDescription>
              <Button onClick={() => setCreateDialogOpen(true)} variant="link" className="mt-2">
                Create your first PO
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredPOs} searchKey="po_number" />
          )}
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise New Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new direct PO. For indent-based POs, use the Indents page.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersLoading ? (
                    <div className="p-2 text-center text-muted-foreground">Loading...</div>
                  ) : suppliers.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No active suppliers</div>
                  ) : (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {supplier.supplier_name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Expected Delivery</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select 
                  value={formData.payment_terms} 
                  onValueChange={(val) => setFormData({ ...formData, payment_terms: val })}
                >
                  <SelectTrigger id="payment_terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Advance">Advance</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping_address">Shipping Address</Label>
              <Textarea
                id="shipping_address"
                value={formData.shipping_address}
                onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                placeholder="Delivery location address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or instructions"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={isSubmitting || !formData.supplier_id}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Draft PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedPO?.po_number || `PO-${selectedPO?.id.slice(0, 8)}`}
            </SheetTitle>
            <SheetDescription>
              Purchase Order Details
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPO && (
            <div className="mt-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-bold text-xs uppercase px-3 py-1",
                    PO_STATUS_CONFIG[selectedPO.status || "draft"]?.className
                  )}
                >
                  {PO_STATUS_CONFIG[selectedPO.status || "draft"]?.label}
                </Badge>
                {isDelayed(selectedPO) && (
                  <Badge variant="outline" className="bg-critical/10 text-critical border-critical/20 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" /> Delivery Delayed
                  </Badge>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Supplier</span>
                  <p className="font-semibold text-sm mt-1">{selectedPO.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPO.supplier_code}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Order Value</span>
                  <p className="font-bold text-lg mt-1">
                    {selectedPO.grand_total ? formatCurrency(selectedPO.grand_total) : "TBD"}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">PO Date:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedPO.po_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Delivery:</span>
                  <span className={cn("ml-2 font-medium", isDelayed(selectedPO) && "text-critical")}>
                    {formatDate(selectedPO.expected_delivery_date)}
                  </span>
                </div>
                {selectedPO.sent_to_vendor_at && (
                  <div>
                    <span className="text-muted-foreground">Sent to Vendor:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedPO.sent_to_vendor_at)}</span>
                  </div>
                )}
                {selectedPO.vendor_acknowledged_at && (
                  <div>
                    <span className="text-muted-foreground">Acknowledged:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedPO.vendor_acknowledged_at)}</span>
                  </div>
                )}
              </div>

              {/* Linked Indent */}
              {selectedPO.indent_number && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Linked to Indent: {selectedPO.indent_number}</span>
                  </div>
                </div>
              )}

              {/* Addresses */}
              {(selectedPO.shipping_address || selectedPO.billing_address) && (
                <div className="space-y-3">
                  {selectedPO.shipping_address && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <MapPin className="h-3 w-3" /> Shipping Address
                      </div>
                      <p className="text-sm">{selectedPO.shipping_address}</p>
                    </div>
                  )}
                  {selectedPO.billing_address && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase mb-1">
                        <Receipt className="h-3 w-3" /> Billing Address
                      </div>
                      <p className="text-sm">{selectedPO.billing_address}</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Line Items ({detailItems.length})
                </h4>
                
                {detailItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No items added yet</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Rate</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.product_name || item.item_description || "Unnamed Item"}
                                </span>
                                {item.product_code && (
                                  <span className="text-[10px] text-muted-foreground">{item.product_code}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.ordered_quantity} {item.unit_of_measure}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(item.unit_price)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(item.line_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                {selectedPO.grand_total && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(selectedPO.subtotal || 0)}</span>
                    </div>
                    {(selectedPO.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedPO.discount_amount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(selectedPO.tax_amount || 0)}</span>
                    </div>
                    {(selectedPO.shipping_cost || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatCurrency(selectedPO.shipping_cost || 0)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Grand Total</span>
                      <span>{formatCurrency(selectedPO.grand_total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div>
                  <h4 className="font-bold text-xs uppercase text-muted-foreground mb-2">Notes</h4>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedPO.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedPO.status === "draft" && (
                  <>
                    <Button 
                      onClick={() => openConfirmDialog("send", selectedPO)} 
                      className="flex-1 gap-2"
                    >
                      <Send className="h-4 w-4" /> Send to Vendor
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => openConfirmDialog("delete", selectedPO)}
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {selectedPO.status === "sent_to_vendor" && (
                  <Button 
                    onClick={() => openConfirmDialog("acknowledge", selectedPO)} 
                    className="flex-1 gap-2"
                  >
                    <BadgeCheck className="h-4 w-4" /> Mark Acknowledged
                  </Button>
                )}
                {["acknowledged", "partial_received"].includes(selectedPO.status || "") && (
                  <Button onClick={() => handleRecordReceipt(selectedPO)} className="flex-1 gap-2">
                    <PackageCheck className="h-4 w-4" /> Record Receipt
                  </Button>
                )}
                {["draft", "sent_to_vendor"].includes(selectedPO.status || "") && (
                  <Button 
                    variant="outline"
                    onClick={() => openConfirmDialog("cancel", selectedPO)}
                    className="gap-2"
                  >
                    <Ban className="h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction ? getActionText(confirmAction.type).title : "Confirm"}</DialogTitle>
            <DialogDescription>
              {confirmAction ? getActionText(confirmAction.type).description : "Are you sure?"}
            </DialogDescription>
          </DialogHeader>
          
          {confirmAction && (
            <div className="py-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Purchase Order:</span>{" "}
                <strong>{confirmAction.poNumber}</strong>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialogOpen(false); setConfirmAction(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleActionConfirm} 
              disabled={isSubmitting}
              variant={confirmAction ? getActionText(confirmAction.type).variant || "default" : "default"}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmAction ? getActionText(confirmAction.type).action : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

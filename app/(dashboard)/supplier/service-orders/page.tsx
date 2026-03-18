"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  FileText,
  Upload,
  Eye,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatCurrency } from "@/src/lib/utils/currency";
import { cn } from "@/lib/utils";
import { ServiceDeliveryNoteDialog } from "@/components/dialogs/ServiceDeliveryNoteDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  useServicePurchaseOrders,
  ServicePurchaseOrder,
  SPO_STATUS_CONFIG,
} from "@/hooks/useServicePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAuth } from "@/hooks/useAuth";

export default function SupplierServiceOrdersPage() {
  const { orders, isLoading, error, createOrder, refresh } = useServicePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { user } = useAuth();

  const [deliveryNoteOrder, setDeliveryNoteOrder] = useState<ServicePurchaseOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<ServicePurchaseOrder | null>(null);
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    vendor_id: "",
    service_type: "",
    description: "",
    start_date: "",
    end_date: "",
    total_amount: "",
    terms_conditions: "",
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => o.status === "in_progress" || o.status === "acknowledged").length,
    pending: orders.filter((o) => o.status === "draft" || o.status === "sent_to_vendor").length,
    totalValue: orders.reduce((sum, o) => sum + o.total_amount, 0),
  };

  const handleCreateOrder = async () => {
    if (!newOrderForm.vendor_id || !newOrderForm.service_type || !newOrderForm.start_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    const result = await createOrder({
      vendor_id: newOrderForm.vendor_id,
      service_type: newOrderForm.service_type,
      description: newOrderForm.description,
      start_date: newOrderForm.start_date,
      end_date: newOrderForm.end_date || null,
      total_amount: Math.round(parseFloat(newOrderForm.total_amount || "0") * 100), // rupees → paise
      status: "draft",
      terms_conditions: newOrderForm.terms_conditions || null,
      created_by: user?.id || "",
    });
    setIsSubmitting(false);
    if (result) {
      toast.success("Service order created", { description: `${result.spo_number} — Draft` });
      setNewOrderDialogOpen(false);
      setNewOrderForm({ vendor_id: "", service_type: "", description: "", start_date: "", end_date: "", total_amount: "", terms_conditions: "" });
    } else {
      toast.error("Failed to create service order");
    }
  };

  const columns: ColumnDef<ServicePurchaseOrder>[] = [
    {
      accessorKey: "spo_number",
      header: "Order #",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs">{row.getValue("spo_number")}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {row.original.description}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vendor_name",
      header: "Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.original.vendor_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Service Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-bold">
          <Briefcase className="h-3 w-3 mr-1" />
          {row.getValue("service_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Value",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {formatCurrency(row.getValue("total_amount"))}
        </span>
      ),
    },
    {
      accessorKey: "start_date",
      header: "Contract Period",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span>{format(new Date(row.original.start_date), "MMM d, yyyy")}</span>
            {row.original.end_date && (
              <span className="text-[10px] text-muted-foreground">
                to {format(new Date(row.original.end_date), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const config = SPO_STATUS_CONFIG[status as keyof typeof SPO_STATUS_CONFIG];
        return (
          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", config?.className)}>
            {config?.label ?? status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setViewOrder(row.original)}>
            <Eye className="h-3 w-3" /> View
          </Button>
          {(row.original.status === "in_progress" || row.original.status === "acknowledged" || row.original.status === "sent_to_vendor") && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs text-primary border-primary/20 hover:bg-primary/5"
              onClick={() => setDeliveryNoteOrder(row.original)}
            >
              <Upload className="h-3 w-3" /> Delivery Note
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Service Purchase Orders"
        description="Manage staffing and service contracts with vendors."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setNewOrderDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New Service Order
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-bold">{stats.total}</span>}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Orders</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-bold">{stats.active}</span>}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? <Skeleton className="h-8 w-12" /> : <span className="text-2xl font-bold">{stats.pending}</span>}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? <Skeleton className="h-8 w-16" /> : <span className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</span>}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Value</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Service Orders</CardTitle>
          <CardDescription className="text-xs">
            Active and pending service/staffing contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={orders} searchKey="vendor_name" />
          )}
        </CardContent>
      </Card>

      {deliveryNoteOrder && (
        <ServiceDeliveryNoteDialog
          open={!!deliveryNoteOrder}
          onOpenChange={(open) => { if (!open) setDeliveryNoteOrder(null); }}
          poId={deliveryNoteOrder.id}
          poNumber={deliveryNoteOrder.spo_number}
          onSuccess={refresh}
        />
      )}

      {/* View Order Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(open) => { if (!open) setViewOrder(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Service Order — {viewOrder?.spo_number}</DialogTitle>
            <DialogDescription>{viewOrder?.vendor_name}</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Service Type</p>
                  <p className="font-medium">{viewOrder.service_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", SPO_STATUS_CONFIG[viewOrder.status]?.className)}>
                    {SPO_STATUS_CONFIG[viewOrder.status]?.label ?? viewOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Value</p>
                  <p className="font-bold">{formatCurrency(viewOrder.total_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(viewOrder.start_date), "MMM d, yyyy")}</p>
                </div>
              </div>
              {viewOrder.description && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Description</p>
                  <p className="text-xs text-muted-foreground">{viewOrder.description}</p>
                </div>
              )}
              {viewOrder.terms_conditions && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Terms</p>
                  <p className="text-xs text-muted-foreground">{viewOrder.terms_conditions}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Service Order Dialog */}
      <Dialog open={newOrderDialogOpen} onOpenChange={setNewOrderDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New Service Order</DialogTitle>
            <DialogDescription>Create a new service or staffing contract order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Supplier / Vendor *</Label>
              <Select value={newOrderForm.vendor_id} onValueChange={(v) => setNewOrderForm({ ...newOrderForm, vendor_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Input
                value={newOrderForm.service_type}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, service_type: e.target.value })}
                placeholder="e.g., Security Staffing"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={newOrderForm.start_date}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newOrderForm.end_date}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Value (₹)</Label>
              <Input
                type="number"
                value={newOrderForm.total_amount}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, total_amount: e.target.value })}
                placeholder="e.g., 150000"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newOrderForm.description}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, description: e.target.value })}
                rows={2}
                placeholder="Service scope and terms..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrderDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!newOrderForm.vendor_id || !newOrderForm.service_type || !newOrderForm.start_date || isSubmitting}
              onClick={handleCreateOrder}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

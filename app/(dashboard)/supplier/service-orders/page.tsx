"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";

import { ServiceDeliveryNoteDialog } from "@/components/dialogs/ServiceDeliveryNoteDialog";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSupplierPortal, SupplierServiceOrder } from "@/hooks/useSupplierPortal";
import { SPO_STATUS_CONFIG } from "@/hooks/useServicePurchaseOrders";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function SupplierServiceOrdersPage() {
  const {
    serviceOrders,
    serviceAcknowledgments,
    acknowledgeServiceOrder,
    refresh,
    isLoading,
  } = useSupplierPortal();
  const { toast } = useToast();

  const [deliveryNoteOrder, setDeliveryNoteOrder] = useState<SupplierServiceOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SupplierServiceOrder | null>(null);

  const acknowledgmentBySpoId = useMemo(() => {
    const acknowledgmentMap = new Map();

    for (const acknowledgment of serviceAcknowledgments) {
      if (!acknowledgmentMap.has(acknowledgment.spo_id)) {
        acknowledgmentMap.set(acknowledgment.spo_id, acknowledgment);
      }
    }

    return acknowledgmentMap;
  }, [serviceAcknowledgments]);

  const stats = useMemo(() => {
    return {
      total: serviceOrders.length,
      pendingReceipt: serviceOrders.filter((order) => order.status === "sent_to_vendor").length,
      awaitingDeliveryNote: serviceOrders.filter((order) =>
        ["acknowledged", "in_progress"].includes(order.status)
      ).length,
      deploymentConfirmed: serviceOrders.filter((order) =>
        ["deployment_confirmed", "completed"].includes(order.status)
      ).length,
      totalValue: serviceOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
    };
  }, [serviceOrders]);

  const handleAcknowledge = async (spoId: string) => {
    const success = await acknowledgeServiceOrder(spoId);

    if (success) {
      toast({
        title: "Service Order Acknowledged",
        description: "You can upload the delivery note once personnel are ready for deployment.",
      });
      return;
    }

    toast({
      title: "Acknowledgment Failed",
      description: "The service order could not be acknowledged.",
      variant: "destructive",
    });
  };

  const columns: ColumnDef<SupplierServiceOrder>[] = [
    {
      accessorKey: "spo_number",
      header: "SPO #",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs">{row.original.spo_number}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
            {row.original.description || "No scope provided"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Service",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-bold uppercase">
          <Briefcase className="mr-1 h-3 w-3" />
          {row.original.service_type}
        </Badge>
      ),
    },
    {
      accessorKey: "start_date",
      header: "Contract",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span>{format(new Date(row.original.start_date), "MMM d, yyyy")}</span>
            {row.original.end_date ? (
              <span className="text-[10px] text-muted-foreground">
                to {format(new Date(row.original.end_date), "MMM d, yyyy")}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Open-ended</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Value",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">{formatCurrency(row.original.total_amount || 0)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusConfig = SPO_STATUS_CONFIG[row.original.status];
        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] uppercase font-bold", statusConfig?.className)}
          >
            {statusConfig?.label ?? row.original.status}
          </Badge>
        );
      },
    },
    {
      id: "acknowledgment",
      header: "Site Acknowledgment",
      cell: ({ row }) => {
        const acknowledgment = acknowledgmentBySpoId.get(row.original.id);

        if (acknowledgment) {
          return (
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-success">
                {acknowledgment.headcount_received ?? 0}/{acknowledgment.headcount_expected ?? 0} received
              </span>
              <span className="text-muted-foreground">
                Grade {acknowledgment.grade_verified ? "verified" : "pending"}
              </span>
            </div>
          );
        }

        if (row.original.status === "delivery_note_uploaded") {
          return <span className="text-xs text-warning">Awaiting site confirmation</span>;
        }

        return <span className="text-xs text-muted-foreground">Not acknowledged yet</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {row.original.status === "sent_to_vendor" && (
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => handleAcknowledge(row.original.id)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledge
            </Button>
          )}
          {["acknowledged", "in_progress"].includes(row.original.status) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs text-primary border-primary/20 hover:bg-primary/5"
              onClick={() => setDeliveryNoteOrder(row.original)}
            >
              <Upload className="h-3.5 w-3.5" />
              Delivery Note
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelectedOrder(row.original)}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Service Orders"
        description="Review your staffing/service orders, acknowledge issued SPOs, and upload deployment notes."
        actions={
          <Button variant="outline" className="gap-2" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{isLoading ? "..." : stats.total}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Total SPOs
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{isLoading ? "..." : stats.pendingReceipt}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Need Acknowledgment
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{isLoading ? "..." : stats.awaitingDeliveryNote}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Delivery Note Pending
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">
                {isLoading ? "..." : formatCurrency(stats.totalValue)}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Total Value
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Supplier-side service acknowledgments now flow as: acknowledge SPO, upload delivery note, then wait for site/admin confirmation.
        </AlertDescription>
      </Alert>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">My Service Orders</CardTitle>
          <CardDescription className="text-xs">
            Only service purchase orders assigned to your supplier account are shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={serviceOrders} searchKey="spo_number" />
          )}
        </CardContent>
      </Card>

      {deliveryNoteOrder && (
        <ServiceDeliveryNoteDialog
          open={!!deliveryNoteOrder}
          onOpenChange={(open) => {
            if (!open) setDeliveryNoteOrder(null);
          }}
          poId={deliveryNoteOrder.id}
          poNumber={deliveryNoteOrder.spo_number}
          onSuccess={refresh}
        />
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Service Order {selectedOrder?.spo_number}</DialogTitle>
            <DialogDescription>{selectedOrder?.service_type}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1 text-[10px] uppercase font-bold",
                      SPO_STATUS_CONFIG[selectedOrder.status]?.className
                    )}
                  >
                    {SPO_STATUS_CONFIG[selectedOrder.status]?.label ?? selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Value</p>
                  <p className="mt-1 font-semibold">{formatCurrency(selectedOrder.total_amount || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</p>
                  <p className="mt-1">{format(new Date(selectedOrder.start_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">End Date</p>
                  <p className="mt-1">
                    {selectedOrder.end_date ? format(new Date(selectedOrder.end_date), "MMM d, yyyy") : "Open-ended"}
                  </p>
                </div>
              </div>

              {selectedOrder.description && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Scope</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedOrder.description}</p>
                </div>
              )}

              {acknowledgmentBySpoId.get(selectedOrder.id) && (
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Site Acknowledgment</p>
                  <p className="mt-1 text-xs">
                    Headcount received: {acknowledgmentBySpoId.get(selectedOrder.id)?.headcount_received ?? 0}/
                    {acknowledgmentBySpoId.get(selectedOrder.id)?.headcount_expected ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grade verified: {acknowledgmentBySpoId.get(selectedOrder.id)?.grade_verified ? "Yes" : "No"}
                  </p>
                  {acknowledgmentBySpoId.get(selectedOrder.id)?.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {acknowledgmentBySpoId.get(selectedOrder.id)?.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  History,
  RotateCcw, 
  Truck, 
  MoreHorizontal, 
  PackageX,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRTVTickets } from "@/hooks/useRTVTickets";
import { RTVTicketDisplay } from "@/src/types/operations";
import { RTV_STATUS_LABELS, RTV_STATUS_COLORS } from "@/src/lib/constants";
import { InitiateReturnDialog } from "@/components/dialogs/InitiateReturnDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const CLOSED_RTV_STATUSES = ['credit_note_issued', 'credit_issued', 'rejected_by_vendor'] as const;

export default function RTVManagementPage() {
  const { tickets, isLoading, stats, refresh, updateStatus } = useRTVTickets();
  const { tickets: historyTickets, isLoading: isHistoryLoading } = useRTVTickets({
    statuses: CLOSED_RTV_STATUSES,
  });
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<RTVTicketDisplay | null>(null);

  const handleStatusUpdate = async (id: string, status: string) => {
    await updateStatus(id, status);
  };

  const getNextStatus = (status?: string | null) => {
    if (status === 'pending_dispatch') return 'in_transit';
    if (status === 'in_transit') return 'accepted_by_vendor';
    if (status === 'accepted_by_vendor') return 'credit_note_issued';
    return null;
  };

  const renderStatusBadge = (status?: string | null) => {
    const val = status || 'pending_dispatch';
    const label = RTV_STATUS_LABELS[val] || val;
    const colorClass = RTV_STATUS_COLORS[val] || '';
    
    let bgClass = "bg-muted text-muted-foreground";
    if (colorClass === 'text-success') bgClass = "bg-success/10 text-success border-success/20";
    if (colorClass === 'text-primary') bgClass = "bg-primary/10 text-primary border-primary/20";
    if (colorClass === 'text-warning') bgClass = "bg-warning/10 text-warning border-warning/20";
    if (colorClass === 'text-critical') bgClass = "bg-critical/10 text-critical border-critical/20";
    if (colorClass === 'text-info') bgClass = "bg-info/10 text-info border-info/20 animate-pulse-soft";
    
    return (
      <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", bgClass)}>
        {label}
      </Badge>
    );
  };

  const formatDateValue = (val?: string | null) => {
    if (!val) return "Not recorded";
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(val));
  };

  const columns: ColumnDef<RTVTicketDisplay>[] = [
    {
      accessorKey: "item",
      header: "Material Detail",
      cell: ({ row }) => {
        const product = row.original.product?.product_name || 'Product not linked';
        const poRef = row.original.purchase_order?.po_number || 'No PO';
        const rtvNumber = row.original.rtv_number;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-critical/5 flex items-center justify-center">
              <PackageX className="h-4 w-4 text-critical" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-sm">{product}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">
                REF: {rtvNumber} • {poRef}
              </span>
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const productName = row.original.product?.product_name || '';
        return productName.toLowerCase().includes(value.toLowerCase());
      }
    },
    {
      accessorKey: "vendor",
      header: "Origin Vendor",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {row.original.supplier?.supplier_name || 'Vendor not linked'}
        </span>
      ),
    },
    {
      accessorKey: "returnReason",
      header: "Defect Reason",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-critical/5 text-critical border-critical/10 font-bold text-[10px] uppercase">
            {row.original.return_reason}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Workflow Stage",
      cell: ({ row }) => renderStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Truck className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                  {row.original.status === 'pending_dispatch' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate(row.original.id, 'in_transit')}>
                      <ArrowRight className="h-4 w-4 mr-2" /> Mark In Transit
                    </DropdownMenuItem>
                  )}
                  {row.original.status === 'in_transit' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate(row.original.id, 'accepted_by_vendor')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Accepted by Vendor
                    </DropdownMenuItem>
                  )}
                  {row.original.status === 'accepted_by_vendor' && (
                    <DropdownMenuItem onClick={() => handleStatusUpdate(row.original.id, 'credit_note_issued')}>
                      <History className="h-4 w-4 mr-2" /> Credit Note Issued
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusUpdate(row.original.id, 'rejected_by_vendor')} className="text-destructive">
                    <PackageX className="h-4 w-4 mr-2" /> Reject by Vendor
                  </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8">
                   <MoreHorizontal className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={() => setSelectedTicket(row.original)}>
                   View Details
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   disabled={!getNextStatus(row.original.status)}
                   onClick={() => {
                     const nextStatus = getNextStatus(row.original.status);
                     if (nextStatus) handleStatusUpdate(row.original.id, nextStatus);
                   }}
                 >
                   Advance Status
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
        </div>
      ),
    },
  ];

  const historyColumns: ColumnDef<RTVTicketDisplay>[] = [
    {
      accessorKey: "item",
      header: "Material Detail",
      cell: ({ row }) => {
        const product = row.original.product?.product_name || 'Product not linked';
        const poRef = row.original.purchase_order?.po_number || 'No PO';
        return (
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{product}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.rtv_number} • {poRef}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const productName = row.original.product?.product_name || '';
        const rtvNumber = row.original.rtv_number || '';
        return `${productName} ${rtvNumber}`.toLowerCase().includes(value.toLowerCase());
      }
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.supplier?.supplier_name || 'Vendor not linked'}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Final Status",
      cell: ({ row }) => renderStatusBadge(row.original.status),
    },
    {
      accessorKey: "closedAt",
      header: "Closed On",
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <span className="text-sm text-muted-foreground">
            {formatDateValue(ticket.credit_issued_at || ticket.accepted_at || ticket.updated_at)}
          </span>
        );
      },
    },
    {
      accessorKey: "estimated_value",
      header: "Value",
      cell: ({ row }) => (
        <span className="text-sm font-bold">
          {formatCurrencyValue(Number(row.original.estimated_value || 0))}
        </span>
      ),
    },
  ];

  const formatCurrencyValue = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="animate-fade-in space-y-8 pb-20 text-left">
      <PageHeader
        title="Return To Vendor (RTV)"
        description="Formal lifecycle management for returning damaged, wrong, or surplus materials to the origin supplier."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsHistoryOpen(true)}>
               <History className="h-4 w-4" /> Return History
            </Button>
            <Button 
              variant="destructive" 
              className="gap-2 shadow-lg shadow-critical/20"
              onClick={() => setIsInitiateDialogOpen(true)}
            >
               <RotateCcw className="h-4 w-4" /> Initiate Return
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Pending Pickup", value: stats.pendingPickup.toString(), icon: PackageX, color: "text-critical" },
          { label: "In Transit (RTV)", value: stats.inTransit.toString(), icon: Truck, color: "text-info" },
          { label: "Credit Pending", value: formatCurrencyValue(stats.creditPendingValue), icon: CheckCircle2, color: "text-warning" },
          { label: "Monthly Returns", value: stats.monthlyReturnsCount.toString(), icon: History, color: "text-primary" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4 text-left">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable 
        columns={columns} 
        data={tickets} 
        searchKey="item" 
        isLoading={isLoading}
      />

      <InitiateReturnDialog 
        open={isInitiateDialogOpen}
        onOpenChange={setIsInitiateDialogOpen}
        onSuccess={refresh}
      />

      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>RTV Ticket Details</SheetTitle>
            <SheetDescription>
              {selectedTicket?.rtv_number || "Return ticket"}
            </SheetDescription>
          </SheetHeader>
          {selectedTicket && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Material</span>
                <span className="font-medium text-right">{selectedTicket.product?.product_name || "Product not linked"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium text-right">{selectedTicket.supplier?.supplier_name || "Vendor not linked"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">PO</span>
                <span className="font-medium text-right">{selectedTicket.purchase_order?.po_number || "No PO"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Reason</span>
                <span className="font-medium text-right">{selectedTicket.return_reason}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                {renderStatusBadge(selectedTicket.status)}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Estimated Value</span>
                <span className="font-medium text-right">{formatCurrencyValue(Number(selectedTicket.estimated_value || 0))}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="w-full sm:max-w-5xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Return History
            </SheetTitle>
            <SheetDescription>
              Resolved and historical RTV tickets with vendor credit or rejection outcomes.
            </SheetDescription>
          </SheetHeader>
          <DataTable
            columns={historyColumns}
            data={historyTickets}
            searchKey="item"
            isLoading={isHistoryLoading}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

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
  Eye,
  ArrowRight,
  Loader2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export default function RTVManagementPage() {
  const { tickets, isLoading, stats, refresh, updateStatus } = useRTVTickets();
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);

  const handleStatusUpdate = async (id: string, status: string) => {
    await updateStatus(id, status);
  };

  const columns: ColumnDef<RTVTicketDisplay>[] = [
    {
      accessorKey: "item",
      header: "Material Detail",
      cell: ({ row }) => {
        const product = row.original.product?.product_name || 'Unknown Product';
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
          {row.original.supplier?.supplier_name || 'Unknown Vendor'}
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
      cell: ({ row }) => {
          const val = row.original.status || 'pending_dispatch';
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
      },
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
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
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
            <Button variant="outline" className="gap-2">
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
    </div>
  );
}

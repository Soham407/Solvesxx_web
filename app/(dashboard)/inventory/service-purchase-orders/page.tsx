"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Building,
  Loader2,
  Briefcase
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServicePurchaseOrders, SPO_STATUS_CONFIG } from "@/hooks/useServicePurchaseOrders";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function ServicePurchaseOrdersPage() {
  const { 
    orders, 
    isLoading, 
    error, 
    refresh 
  } = useServicePurchaseOrders();

  const stats = {
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "spo_number",
      header: "SPO Number",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs">{row.original.spo_number}</span>
          <span className="text-[10px] text-muted-foreground">{row.original.service_type}</span>
        </div>
      ),
    },
    {
      accessorKey: "vendor_name",
      header: "Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.getValue("vendor_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Service Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {formatCurrency(row.getValue("total_amount"))}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof SPO_STATUS_CONFIG;
        const config = SPO_STATUS_CONFIG[status];
        return (
          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", config?.className)}>
            {config?.label || status}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit SPO</DropdownMenuItem>
              {row.original.status === 'draft' && (
                <DropdownMenuItem>Send to Vendor</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Service Purchase Orders"
        description="Manage staffing deployments and service-based procurement distinct from material POs."
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
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Create SPO
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-critical/10 text-critical border border-critical/20">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.total}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total SPOs</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.draft}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Draft</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">In Progress</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.completed}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Completed</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Active Service Orders</CardTitle>
          <CardDescription className="text-xs">
            Total value: {isLoading ? '...' : formatCurrency(stats.totalValue)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={orders} searchKey="spo_number" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

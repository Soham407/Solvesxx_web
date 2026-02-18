"use client";

import { useEffect, useState } from "react";
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
  FileText
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatCurrency } from "@/src/lib/utils/currency";
import { supabase } from "@/src/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface ServiceOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  service_type: string;
  monthly_value: number;
  start_date: string;
  end_date: string;
  status: "active" | "pending" | "completed" | "cancelled";
  description: string;
}

export default function SupplierServiceOrdersPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch purchase orders for services/staffing
      const { data, error: fetchError } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          po_number,
          po_date,
          expected_delivery_date,
          status,
          subtotal,
          suppliers:supplier_id (
            supplier_name
          ),
          indents:indent_id (
            description,
            service_category
          )
        `)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Filter for service/staffing related orders
      const serviceOrdersData = (data || [])
        .filter((po: any) => {
          const category = po.indents?.service_category?.toLowerCase() || "";
          const desc = po.indents?.description?.toLowerCase() || "";
          return (
            category.includes("service") ||
            category.includes("staffing") ||
            category.includes("manpower") ||
            desc.includes("service") ||
            desc.includes("staffing") ||
            desc.includes("manpower")
          );
        })
        .map((po: any): ServiceOrder => ({
          id: po.id,
          po_number: po.po_number || `PO-${po.id.substring(0, 8)}`,
          supplier_name: po.suppliers?.supplier_name || "Unknown Supplier",
          service_type: po.indents?.service_category || "General Service",
          monthly_value: po.subtotal || 0,
          start_date: po.po_date,
          end_date: po.expected_delivery_date,
          status: mapStatus(po.status),
          description: po.indents?.description || "No description",
        }));

      setServiceOrders(serviceOrdersData);
    } catch (err) {
      console.error("Error fetching service orders:", err);
      setError("Failed to load service orders");
    } finally {
      setIsLoading(false);
    }
  };

  const mapStatus = (status: string): ServiceOrder["status"] => {
    switch (status) {
      case "received":
      case "acknowledged":
        return "active";
      case "sent_to_vendor":
        return "pending";
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  };

  useEffect(() => {
    fetchServiceOrders();
  }, []);

  const stats = {
    total: serviceOrders.length,
    active: serviceOrders.filter((o) => o.status === "active").length,
    pending: serviceOrders.filter((o) => o.status === "pending").length,
    totalValue: serviceOrders.reduce((sum, o) => sum + o.monthly_value, 0),
  };

  const columns: ColumnDef<ServiceOrder>[] = [
    {
      accessorKey: "po_number",
      header: "Order #",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs">{row.getValue("po_number")}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {row.original.description}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: "Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.getValue("supplier_name")}</span>
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
      accessorKey: "monthly_value",
      header: "Monthly Value",
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {formatCurrency(row.getValue("monthly_value"))}
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
            <span className="text-[10px] text-muted-foreground">
              to {format(new Date(row.original.end_date), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variants: Record<string, string> = {
          active: "bg-success/10 text-success border-success/20",
          pending: "bg-warning/10 text-warning border-warning/20",
          completed: "bg-info/10 text-info border-info/20",
          cancelled: "bg-critical/10 text-critical border-critical/20",
        };
        return (
          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", variants[status])}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="sm" className="gap-1">
          <FileText className="h-3 w-3" /> View
        </Button>
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
              onClick={fetchServiceOrders}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
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
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{stats.total}</span>
              )}
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
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{stats.active}</span>
              )}
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
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-2xl font-bold">{stats.pending}</span>
              )}
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
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</span>
              )}
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
            <DataTable columns={columns} data={serviceOrders} searchKey="supplier_name" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

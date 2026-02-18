"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Building2, 
  Wrench, 
  Link2, 
  MoreHorizontal, 
  ShieldCheck, 
  Tag,
  Loader2,
  RefreshCw,
  AlertCircle,
  Star,
  Phone
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useVendorWiseServices } from "@/hooks/useVendorWiseServices";
import { formatCurrency } from "@/src/lib/utils/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VendorServiceMappingPage() {
  const { 
    vendorServices, 
    isLoading, 
    error, 
    refresh 
  } = useVendorWiseServices();

  const stats = {
    total: vendorServices.length,
    preferred: vendorServices.filter(vs => vs.is_preferred).length,
    vendors: new Set(vendorServices.map(vs => vs.supplier_id)).size,
    services: new Set(vendorServices.map(vs => vs.service_id)).size,
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "supplier.supplier_name",
      header: "Service Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.supplier?.supplier_name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {row.original.supplier?.supplier_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "service.service_name",
      header: "Linked Service",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <div className="flex flex-col">
            <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[10px] uppercase w-fit">
              {row.original.service?.service_name}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {row.original.service?.service_category}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "vendor_rate",
      header: "Vendor Rate",
      cell: ({ row }) => (
        <span className="text-xs font-bold">
          {row.getValue("vendor_rate") 
            ? formatCurrency(row.getValue("vendor_rate"))
            : "Not set"
          }
        </span>
      ),
    },
    {
      accessorKey: "is_preferred",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_preferred ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-bold text-[10px] uppercase">
              <Star className="h-3 w-3 mr-1 fill-success" />
              Preferred
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] uppercase">
              Standard
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "supplier.mobile",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {row.original.supplier?.mobile || "N/A"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Mapping</DropdownMenuItem>
            <DropdownMenuItem>View Supplier Details</DropdownMenuItem>
            <DropdownMenuItem>Rate History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Vendor-Service Mapping"
        description="Establish direct links between service providers and the specific treatment/technical categories they are authorized to handle."
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
              <Link2 className="h-4 w-4" /> New Authorization
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
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.total}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Authorized Links</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <Star className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.preferred}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Preferred</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.services}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Service Types</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.vendors}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Vendors</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Vendor-Service Authorizations</CardTitle>
          <CardDescription className="text-xs">
            Linked suppliers with their authorized service categories and rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={vendorServices} searchKey="supplier.supplier_name" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

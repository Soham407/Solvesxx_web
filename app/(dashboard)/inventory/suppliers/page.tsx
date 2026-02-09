"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Truck, 
  Star, 
  Phone, 
  Mail, 
  Box, 
  Receipt, 
  MoreHorizontal,
  BadgeCheck,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  contactPerson: string;
  email: string;
  activeOrders: number;
  status: "Verified" | "Pending" | "Blacklisted";
}

const data: Supplier[] = [
  { id: "SUP-001", name: "Bharat Security Supplies", category: "Security Equipment", rating: 4.8, contactPerson: "Manoj Tiwari", email: "manoj@bharatsupply.com", activeOrders: 3, status: "Verified" },
  { id: "SUP-002", name: "Refresh Beverage Corp", category: "Pantry & Beverages", rating: 4.2, contactPerson: "Meena Patel", email: "meena@refresh.com", activeOrders: 0, status: "Verified" },
  { id: "SUP-003", name: "CleanPro Industrial", category: "Cleaning Supplies", rating: 3.9, contactPerson: "Vikram Malhotra", email: "v.malhotra@cleanpro.com", activeOrders: 1, status: "Pending" },
  { id: "SUP-004", name: "QuickPrint Media", category: "Printing Services", rating: 4.5, contactPerson: "Kavita Joshi", email: "kavita@qpmedia.com", activeOrders: 2, status: "Verified" },
];

export default function SuppliersPage() {
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Supplier / Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm ">{row.original.name}</span>
                {row.original.status === "Verified" && <BadgeCheck className="h-3.5 w-3.5 text-info" />}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Service Category",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-medium px-2 py-0.5">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="text-sm font-bold">{row.getValue("rating")}</span>
        </div>
      ),
    },
    {
      accessorKey: "activeOrders",
      header: "Active POs",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{row.getValue("activeOrders")} Orders</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          return (
            <Badge variant="outline" className={cn(
                "font-bold text-[10px] uppercase h-5",
                val === "Verified" ? "bg-success/10 text-success border-success/20" :
                val === "Pending" ? "bg-warning/10 text-warning border-warning/20" : "bg-critical/10 text-critical border-critical/20"
            )}>
                {val}
            </Badge>
          );
      },
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2">
                <Box className="h-3.5 w-3.5" /> View Products
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
                <Phone className="h-3.5 w-3.5" /> Contact Details
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-primary font-bold">
                <Truck className="h-3.5 w-3.5" /> Raise Indent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Supplier Master"
        description="Comprehensive repository of verified vendors, service categories, and performance ratings."
        actions={
          <Button className="gap-2 shadow-sh-primary/10">
            <Plus className="h-4 w-4" /> Onboard Supplier
          </Button>
        }
      />
      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Receipt, 
  Download, 
  Mail, 
  MoreHorizontal, 
  Clock, 
  CreditCard,
  Building,
  User,
  Filter,
  FileCheck
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BuyerBill {
  id: string;
  resident: string;
  flatNo: string;
  billType: "Maintenance" | "Special Service" | "Pantry Order" | "Electricity";
  amount: string;
  dueDate: string;
  status: "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue";
}

const data: BuyerBill[] = [
  { id: "INV-B-4001", resident: "Amit Khanna", flatNo: "Penthouse P1", billType: "Maintenance", amount: "₹18,500", dueDate: "2024-02-10", status: "Sent" },
  { id: "INV-B-4005", resident: "Anjali Sharma", flatNo: "Tower B-203", billType: "Special Service", amount: "₹4,200", dueDate: "2024-02-05", status: "Overdue" },
  { id: "INV-B-4008", resident: "Arjun Reddy", flatNo: "Sector C-404", billType: "Pantry Order", amount: "₹1,250", dueDate: "2024-02-01", status: "Paid" },
];

export default function BuyerBillingPage() {
  const columns: ColumnDef<BuyerBill>[] = [
    {
      accessorKey: "resident",
      header: "Resident / Buyer",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.resident}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.flatNo}</span>
        </div>
      ),
    },
    {
      accessorKey: "billType",
      header: "Billing Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium h-5">
          {row.getValue("billType")}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Grand Total",
      cell: ({ row }) => <span className="text-sm font-bold text-primary">{row.getValue("amount")}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due By",
      cell: ({ row }) => <span className="text-xs font-bold text-muted-foreground">{row.getValue("dueDate")}</span>,
    },
    {
      accessorKey: "status",
      header: "Flow Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "Paid": "bg-success/10 text-success border-success/20",
              "Sent": "bg-info/10 text-info border-info/20",
              "Overdue": "bg-critical/10 text-critical border-critical/20 animate-pulse-soft",
              "Draft": "bg-muted text-muted-foreground border-border"
          };
          return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[val] || "")}>
                {val}
            </Badge>
          );
      },
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Download className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Buyer & Resident Invoicing"
        description="Consolidated portal for generating and managing sale invoices for maintenance fees, specialized technical services, and internal pantry orders."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <Mail className="h-4 w-4" /> Bulk Dispatch
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> Generate Invoice
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Accounts Receivable", value: "₹4,25,000", icon: CreditCard, color: "text-primary", sub: "Total outstanding" },
          { label: "Collection (30d)", value: "₹2,12,000", icon: FileCheck, color: "text-success", sub: "Month-to-date" },
          { label: "Overdue Count", value: "14", icon: Clock, color: "text-critical", sub: "Action required" },
          { label: "Pending Drafts", value: "3", icon: Receipt, color: "text-warning", sub: "Ready to send" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
               <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
                    </div>
                </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={data} searchKey="resident" />
    </div>
  );
}

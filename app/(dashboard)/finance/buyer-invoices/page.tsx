"use client";

import { FileText, Plus, MoreHorizontal, DollarSign, Clock, AlertCircle, Loader2 } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBuyerInvoices, INVOICE_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/hooks/useBuyerInvoices";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Badge } from "@/components/ui/badge";

export default function BuyerInvoicesPage() {
  const { invoices, isLoading, error } = useBuyerInvoices();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "invoice_number",
      header: "Invoice ID",
      cell: ({ row }) => <span className="font-bold font-mono text-xs">{row.original.invoice_number}</span>
    },
    {
      accessorKey: "client_name",
      header: "Buyer / Client",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm ">{row.original.client_name}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Contract {row.original.contract_number || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-bold text-sm">
          {formatCurrency(row.original.total_amount || 0)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.original.status as string;
        const config = INVOICE_STATUS_CONFIG[val as keyof typeof INVOICE_STATUS_CONFIG] || { label: val, className: "" };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => {
        const val = row.original.payment_status as string;
        const config = PAYMENT_STATUS_CONFIG[val as keyof typeof PAYMENT_STATUS_CONFIG] || { label: val, className: "" };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{row.original.due_date ? new Date(row.original.due_date).toLocaleDateString() : "N/A"}</span>
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Invoice Options</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2">
               <FileText className="h-4 w-4" /> View PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 font-bold text-primary"
              onClick={() => {
                const confirmed = window.confirm(`Initiating Razorpay checkout for Invoice ${row.original.invoice_number} (Amount: ${formatCurrency(row.original.total_amount)}). Proceed?`);
                if (confirmed) {
                  alert("Gateway initialization successful. Redirecting to secure checkout...");
                }
              }}
            >
               <DollarSign className="h-4 w-4" /> Pay Online
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground text-xs">Record Manual Payment</DropdownMenuItem>
            <DropdownMenuItem className="text-critical font-bold">Write Off</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-12 w-12 rounded-full bg-critical/10 flex items-center justify-center text-critical">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Failed to load invoices</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.due_amount || 0), 0);
  const collectedMTD = invoices
    .filter(inv => inv.payment_status === "paid")
    .reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
  const overdueInvoices = invoices.filter(inv => {
    if (inv.payment_status === "paid") return false;
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  });
  const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + (inv.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Finance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
         <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Total Outstanding</CardDescription>
              <CardTitle className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-none shadow-card ring-1 ring-border bg-success/5 border-l-4 border-l-success">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-success">Collected (Total)</CardDescription>
              <CardTitle className="text-2xl font-bold text-success">{formatCurrency(collectedMTD)}</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-none shadow-card ring-1 ring-border bg-critical/5 border-l-4 border-l-critical">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-critical">Overdue</CardDescription>
              <CardTitle className="text-2xl font-bold text-critical">{formatCurrency(overdueAmount)}</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Invoice Count</CardDescription>
              <CardTitle className="text-2xl font-bold">{invoices.length}</CardTitle>
            </CardHeader>
         </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="module-title font-bold uppercase ">Buyer Invoices</h1>
          <p className="module-description">Monitor receivables and billing cycles for service clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="gap-2 shadow-lg bg-primary hover:bg-primary/90 font-bold">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={invoices} searchKey="client_name" />
    </div>
  );
}


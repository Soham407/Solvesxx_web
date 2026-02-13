"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  MoreHorizontal,
  Plus,
  ArrowRightLeft,
  FileCheck2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSupplierBills, formatCurrency, BILL_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/hooks/useSupplierBills";
import { useReconciliation } from "@/hooks/useReconciliation";

export default function SupplierBillsPage() {
  const { bills, isLoading: billsLoading, error } = useSupplierBills();
  const { reconciliations, isLoading: reconLoading } = useReconciliation();

  const isLoading = billsLoading || reconLoading;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "supplier_name",
      header: "Supplier Hub",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.supplier_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">REF: {row.original.po_number || "N/A"} • {row.original.bill_number}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Bill Value",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{formatCurrency(row.original.total_amount || 0)}</span>,
    },
    {
      accessorKey: "bill_date",
      header: "Date Received",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.bill_date ? new Date(row.original.bill_date).toLocaleDateString() : "N/A"}</span>,
    },
    {
      accessorKey: "status",
      header: "Audit Verification",
      cell: ({ row }) => {
          const status = row.original.status;
          const config = BILL_STATUS_CONFIG[status as keyof typeof BILL_STATUS_CONFIG] || { label: status, className: "" };
          return (
            <div className="flex items-center gap-2">
                <FileCheck2 className={cn(
                    "h-3.5 w-3.5",
                    status === "approved" ? "text-success" : status === "disputed" ? "text-critical" : "text-warning"
                )} />
                <span className="text-[10px] font-bold uppercase ">{config.label}</span>
            </div>
          );
      },
    },
    {
      accessorKey: "payment_status",
      header: "Payout Status",
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
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5" asChild>
                <Link href="/finance/reconciliation">Reconcile</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading billing data...</p>
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
          <h3 className="text-lg font-bold">Failed to load bills</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const accountsPayable = bills.reduce((acc, bill) => acc + (bill.due_amount || 0), 0);
  const approvedPayouts = bills
    .filter(b => b.status === "approved")
    .reduce((acc, bill) => acc + (bill.total_amount || 0), 0);
  const pendingVerification = bills
    .filter(b => b.status === "submitted" || b.status === "draft")
    .length;

    const auditDiscrepancies = reconciliations.filter(r => r.status === "discrepancy").length;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Supplier Bill Processing"
        description="Verify, reconcile and approve vendor invoices against Purchase Orders and Receipt Notes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
               <Link href="/finance/reconciliation">
                  <ArrowRightLeft className="h-4 w-4" /> Reconciliation Sheet
               </Link>
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> New Bill Intake
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Accounts Payable", value: formatCurrency(accountsPayable), icon: Wallet, color: "text-primary", sub: "Total current liability" },
          { label: "Approved Payouts", value: formatCurrency(approvedPayouts), icon: CheckCircle2, color: "text-success", sub: "Scheduled for payment" },
          { label: "Pending Verification", value: pendingVerification.toString(), icon: Clock, color: "text-warning", sub: `${pendingVerification} bills in queue` },
          { label: "Audit Discrepancies", value: auditDiscrepancies.toString(), icon: AlertCircle, color: "text-critical", sub: "Price/Qty mismatch" },
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

      <Card className="border-none shadow-premium overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Billing Registry</CardTitle>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/5 text-success border-success/20">Active Cycle</Badge>
                <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-bold">A{i}</div>
                    ))}
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <DataTable columns={columns} data={bills} searchKey="supplier_name" />
        </CardContent>
      </Card>
    </div>
  );
}


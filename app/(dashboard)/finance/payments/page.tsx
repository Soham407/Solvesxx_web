"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreHorizontal, 
  ExternalLink,
  Loader2,
  AlertCircle,
  FileSearch
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFinance, PaymentModel } from "@/hooks/useFinance";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function PaymentsTrackerPage() {
  const { payments, isLoading, refresh } = useFinance();

  const columns: ColumnDef<PaymentModel>[] = [
    {
      accessorKey: "payment_number",
      header: "Ref #",
      cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.payment_number}</span>,
    },
    {
      accessorKey: "payment_type",
      header: "Flow",
      cell: ({ row }) => {
        const isPayout = row.original.payment_type === 'payout';
        return (
          <div className="flex items-center gap-2">
            {isPayout ? (
              <ArrowUpRight className="h-3 w-3 text-critical" />
            ) : (
              <ArrowDownLeft className="h-3 w-3 text-success" />
            )}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tighter",
              isPayout ? "text-critical" : "text-success"
            )}>
              {isPayout ? "Payout" : "Receipt"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Transaction Value",
      cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "payment_date",
      header: "Date",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.payment_date).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: "Truth Status",
      cell: ({ row }) => {
        const variants: Record<string, string> = {
          completed: "bg-success/10 text-success border-success/20",
          pending: "bg-warning/10 text-warning border-warning/20",
          failed: "bg-critical/10 text-critical border-critical/20",
        };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", variants[row.original.status] || "")}>
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.evidence_url && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild>
              <a href={row.original.evidence_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
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
        <p className="text-sm text-muted-foreground">Syncing ledger...</p>
      </div>
    );
  }

  const receipts = payments.filter(p => p.payment_type === 'receipt').reduce((sum, p) => sum + p.amount, 0);
  const payouts = payments.filter(p => p.payment_type === 'payout').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Universal Payment Ledger"
        description="Consolidated financial truth tracking across Buyers and Suppliers with mandatory audit linkage."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => refresh()}>
             <FileSearch className="h-4 w-4" /> Export Audit Trail
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Total Receipts", value: formatCurrency(receipts), sub: "Buyer collections", color: "text-success", icon: ArrowDownLeft },
          { label: "Total Payouts", value: formatCurrency(payouts), sub: "Supplier settlements", color: "text-critical", icon: ArrowUpRight },
          { label: "Net Cash Flow", value: formatCurrency(receipts - payouts), sub: "Operational liquidity", color: "text-primary", icon: CreditCard },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-5">
               <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <span className="text-2xl font-bold font-mono ">{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{stat.label}</span>
                    </div>
                    <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
               </div>
               <div className="mt-4 pt-4 border-t border-dashed">
                    <span className="text-[10px] font-medium text-muted-foreground">{stat.sub}</span>
               </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={payments} searchKey="payment_number" />
    </div>
  );
}

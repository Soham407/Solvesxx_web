"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Receipt, 
  Box, 
  FileCheck2,
  MoreHorizontal,
  History,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReconciliation, formatCurrency, RECONCILIATION_STATUS_CONFIG } from "@/hooks/useReconciliation";

export default function ReconciliationHubPage() {
  const { reconciliations, isLoading, error } = useReconciliation();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "supplier_name",
      header: "Vendor Entity",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.supplier_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">ID: {row.original.reconciliation_number}</span>
        </div>
      ),
    },
    {
      accessorKey: "refs",
      header: "Matching Documents",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
                 <Receipt className="h-3 w-3 text-primary/50" />
                 <span className="text-[10px] font-mono font-bold mt-1">{row.original.bill_number || "---"}</span>
            </div>
            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
            <div className="flex flex-col items-center">
                 <Box className="h-3 w-3 text-info/50" />
                 <span className="text-[10px] font-mono font-bold mt-1">{row.original.grn_number || "---"}</span>
            </div>
        </div>
      ),
    },
    {
      accessorKey: "bill_amount",
      header: "Billed Value",
      cell: ({ row }) => <span className="text-sm font-medium text-muted-foreground">{formatCurrency(row.original.bill_amount || 0)}</span>,
    },
    {
        accessorKey: "grn_amount",
        header: "Received Value",
        cell: ({ row }) => <span className="text-sm font-medium text-muted-foreground">{formatCurrency(row.original.grn_amount || 0)}</span>,
      },
    {
      accessorKey: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const variance = row.original.bill_grn_variance || 0;
        return (
          <span className={cn(
              "text-sm font-bold",
              Math.abs(variance) < 100 ? "text-success" : "text-critical"
          )}>
              {formatCurrency(variance)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Recon Status",
      cell: ({ row }) => {
          const val = row.original.status as string;
          const config = RECONCILIATION_STATUS_CONFIG[val as keyof typeof RECONCILIATION_STATUS_CONFIG] || { label: val, className: "" };
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
            <Button size="sm" variant="outline" className="h-8 gap-2 border-primary/20 text-primary">
                Resolve
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
        <p className="text-sm text-muted-foreground animate-pulse">Loading reconciliation data...</p>
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
          <h3 className="text-lg font-bold">Failed to load reconciliations</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const matchesFound = reconciliations.filter(r => r.status === "matched").length;
  const discrepancies = reconciliations.filter(r => r.status === "discrepancy").length;
  const pendingRecon = reconciliations.filter(r => r.status === "pending").length;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Account Reconciliation Hub"
        description="Triple-match audit system to reconcile Supplier Bills against Goods Received Notes (GRN) and Purchase Orders."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <History className="h-4 w-4" /> Recon Logs
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <FileCheck2 className="h-4 w-4" /> Automated Sync
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Matches Found", value: matchesFound.toString(), icon: CheckCircle2, color: "text-success", sub: "Verified this cycle" },
          { label: "Billing Discrepancy", value: discrepancies.toString(), icon: AlertTriangle, color: "text-critical", sub: "Potential leakage" },
          { label: "Pending Recon", value: pendingRecon.toString(), icon: History, color: "text-warning", sub: "Requires manual check" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-5">
               <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <span className="text-2xl font-bold ">{stat.value}</span>
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

      <DataTable columns={columns} data={reconciliations} searchKey="supplier_name" />
    </div>
  );
}


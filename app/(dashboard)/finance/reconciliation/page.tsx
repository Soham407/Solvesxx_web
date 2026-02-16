"use client";

import { useState } from "react";
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
  AlertCircle,
  Check,
  X,
  Scale
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useReconciliation, RECONCILIATION_STATUS_CONFIG, Reconciliation, ReconciliationLine } from "@/hooks/useReconciliation";
import { formatCurrency } from "@/src/lib/utils/currency";
import { toast } from "sonner";

export default function ReconciliationHubPage() {
  const { 
    reconciliations, 
    isLoading, 
    error, 
    lines, 
    selectReconciliation, 
    selectedReconciliation,
    resolveDiscrepancy,
    fetchReconciliations
  } = useReconciliation();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleResolveManual = async (id: string) => {
    const success = await resolveDiscrepancy(id, {
      resolution_action: 'accept',
      resolution_notes: 'Verified manually by Accounts. Discrepancy within acceptable variance.',
    });
    if (success) {
      toast.success("Reconciliation resolved");
      fetchReconciliations();
    }
  };

  const columns: ColumnDef<Reconciliation>[] = [
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 gap-2 border-primary/20 text-primary"
              onClick={() => {
                selectReconciliation(row.original);
                setIsSheetOpen(true);
              }}
            >
                Review Items
            </Button>
            {row.original.status === 'discrepancy' && (
              <Button 
                size="sm" 
                variant="default" 
                className="h-8 gap-1 bg-success hover:bg-success/90"
                onClick={() => handleResolveManual(row.original.id)}
              >
                  <Check className="h-3 w-3" /> Force Match
              </Button>
            )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Running 3-way match algorithm...</p>
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
          <h3 className="text-lg font-bold">Audit Synchronizer Error</h3>
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
        title="Triple-Match Reconciliation"
        description="Establishing financial truth by reconciling Purchase Orders, Material Receipts (GRN), and Supplier Bills."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <History className="h-4 w-4" /> View Audit Logs
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20 bg-primary">
               <Scale className="h-4 w-4" /> Trigger Auto-Sync
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Verified Matches", value: matchesFound.toString(), icon: CheckCircle2, color: "text-success", sub: "Ready for Payout" },
          { label: "Leakage Detected", value: discrepancies.toString(), icon: AlertTriangle, color: "text-critical", sub: "Variance flagged" },
          { label: "Awaiting Sync", value: pendingRecon.toString(), icon: History, color: "text-warning", sub: "Requires matching" },
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

      {/* Detail Review Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Trail: {selectedReconciliation?.reconciliation_number}</SheetTitle>
            <SheetDescription>
              Detailed item-level comparison for <strong>{selectedReconciliation?.supplier_name}</strong>.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Billed</span>
                 <p className="text-lg font-bold">{formatCurrency(selectedReconciliation?.bill_amount || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Received</span>
                 <p className="text-lg font-bold">{formatCurrency(selectedReconciliation?.grn_amount || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Variance</span>
                 <p className={cn(
                   "text-lg font-bold",
                   Math.abs(selectedReconciliation?.bill_grn_variance || 0) < 100 ? "text-success" : "text-critical"
                 )}>{formatCurrency(selectedReconciliation?.bill_grn_variance || 0)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider">Line Items</h3>
              {lines.map((line: ReconciliationLine) => (
                <div key={line.id} className="p-4 rounded-xl border border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{line.product_name}</span>
                    <span className="text-[10px] text-muted-foreground">{line.product_code}</span>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Qty Match</span>
                      <span className="text-xs font-bold">
                        {line.qty_billed} vs {line.qty_received}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Status</span>
                      <Badge variant="outline" className={cn(
                        "h-4 text-[9px] font-black uppercase",
                        line.status === 'matched' ? "bg-success/10 text-success" : "bg-critical/10 text-critical"
                      )}>
                        {line.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedReconciliation?.status === 'discrepancy' && (
              <div className="pt-6 border-t flex gap-3">
                 <Button className="flex-1 bg-success hover:bg-success/90 gap-2" onClick={() => handleResolveManual(selectedReconciliation.id)}>
                   <Check className="h-4 w-4" /> Approve Manual Match
                 </Button>
                 <Button variant="outline" className="flex-1 text-critical hover:text-critical gap-2">
                   <X className="h-4 w-4" /> Dispute Bill
                 </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

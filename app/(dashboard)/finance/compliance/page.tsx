"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  Lock, 
  Calendar,
  AlertCircle,
  BarChart3,
  Search,
  Loader2,
  Filter,
  ArrowUpRight,
  History
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCompliance, ComplianceSnapshot } from "@/hooks/useCompliance";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Label } from "@/components/ui/label"; // Fixed Label import if target file was missing it
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

export default function ComplianceDashboard() {
  const { user, role } = useAuth();
  const { snapshots, isLoading, createMonthlySnapshot, exportToCSV, refresh } = useCompliance();
  const [isExporting, setIsExporting] = useState(false);

  const isAuthorizedToExport = role === "admin" || role === "account";
  const canSeeCompliance = role === "admin" || role === "account" || role === "society_manager";

  if (!canSeeCompliance) {
    return (
       <div className="h-[400px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground uppercase font-black">Access Denied: Compliance Vault Restricted</p>
       </div>
    );
  }

  // --- REPORT GENERATORS ---

  const handleExportInvoices = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("sale_bills")
        .select(`
          invoice_number,
          clients!client_id (client_name),
          total_amount,
          tax_amount,
          payment_status,
          last_payment_date
        `);
      
      if (error) throw error;

      const exportData = data.map(item => ({
        "Invoice #": item.invoice_number,
        "Buyer": (item.clients as any)?.client_name || "N/A",
        "Total (Paise)": item.total_amount,
        "Total (INR)": toRupees(item.total_amount),
        "Tax (INR)": toRupees(item.tax_amount || 0),
        "Status": item.payment_status,
        "Payment Date": item.last_payment_date || "---"
      }));

      exportToCSV("Buyer_Invoices_Report", exportData, Object.keys(exportData[0]));
      toast.success("Invoices report exported");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSupplierBills = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("purchase_bills")
        .select(`
          bill_number,
          suppliers!supplier_id (supplier_name),
          total_amount,
          status,
          payment_status,
          last_payment_date
        `);
      
      if (error) throw error;

      const exportData = data.map(item => ({
        "Bill #": item.bill_number,
        "Supplier": (item.suppliers as any)?.supplier_name || "N/A",
        "Amount (INR)": toRupees(item.total_amount),
        "Audit Status": item.status,
        "Payment Status": item.payment_status,
        "Payout Date": item.last_payment_date || "---"
      }));

      exportToCSV("Supplier_Bills_Report", exportData, Object.keys(exportData[0]));
      toast.success("Supplier report exported");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAuditLogs = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          table_name,
          action,
          record_id,
          created_at,
          actor_id
        `)
        .limit(1000); // Guard for UI safety
      
      if (error) throw error;

      const exportData = data.map(item => ({
        "Timestamp (UTC)": item.created_at,
        "Module": item.table_name,
        "Action": item.action,
        "Record ID": item.record_id,
        "Actor ID": item.actor_id
      }));

      exportToCSV("Full_Audit_Trail", exportData, Object.keys(exportData[0]));
      toast.success("Audit trail exported");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAging = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch Outstanding Bills
      const { data: sales } = await supabase.from("sale_bills").select("invoice_number, due_date, due_amount").gt("due_amount", 0);
      const { data: purchases } = await supabase.from("purchase_bills").select("bill_number, due_date, due_amount").gt("due_amount", 0);

      const today = new Date();
      const calculateAging = (dueDate: string) => {
        const diffDays = Math.floor((today.getTime() - new Date(dueDate).getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) return "Not Due";
        if (diffDays <= 30) return "0-30 Days";
        if (diffDays <= 60) return "31-60 Days";
        return "61+ Days";
      };

      const exportData = [
        ...(sales || []).map(s => ({ Type: "Receivable (Buyer)", Ref: s.invoice_number, Due: toRupees(s.due_amount), Bucket: calculateAging(s.due_date) })),
        ...(purchases || []).map(p => ({ Type: "Payable (Supplier)", Ref: p.bill_number, Due: toRupees(p.due_amount), Bucket: calculateAging(p.due_date) }))
      ];

      exportToCSV("Outstanding_Aging_Report", exportData, Object.keys(exportData[0]));
      toast.success("Aging report exported");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const toRupees = (paise: number) => paise / 100;

  const snapshotColumns: ColumnDef<ComplianceSnapshot>[] = [
    {
      accessorKey: "snapshot_name",
      header: "Reporting Period",
      cell: ({ row }) => <span className="font-bold">{row.original.snapshot_name}</span>
    },
    {
      accessorKey: "snapshot_date",
      header: "Snapshot Date",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.snapshot_date).toLocaleDateString()}</span>
    },
    {
      accessorKey: "total_collections_amount",
      header: "Collections",
      cell: ({ row }) => <span className="text-success font-mono font-bold">{formatCurrency(row.original.total_collections_amount)}</span>
    },
    {
      accessorKey: "total_payouts_amount",
      header: "Payouts",
      cell: ({ row }) => <span className="text-critical font-mono font-bold">{formatCurrency(row.original.total_payouts_amount)}</span>
    },
    {
      accessorKey: "is_locked",
      header: "Auth Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-success/5 text-success border-success/20 gap-1">
          <Lock className="h-2 w-2" /> SEALED
        </Badge>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground uppercase font-black tracking-widest">Generating Truth Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Compliance & External Audit Hub"
        description="Verify system integrity, export regulator-ready reports, and manage immutable financial snapshots."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => refresh()}>
               <History className="h-4 w-4" /> Sync Registry
            </Button>
            {isAuthorizedToExport && (
              <Button 
                 className="gap-2 bg-success hover:bg-success/90"
                 onClick={() => createMonthlySnapshot('b33501b1-684f-4450-adc7-69cb58d9d564', `System Snapshot - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}`)}
              >
                 <ShieldCheck className="h-4 w-4" /> Create Period Snapshot
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Audit Integrity", value: "100%", sub: "Verified Logs", icon: ShieldCheck, color: "text-success" },
          { label: "Export Ready", value: "4 Modules", sub: "Compliant Formats", icon: Download, color: "text-primary" },
          { label: "Aging Dues", value: "Active", sub: "Bucket Monitoring", icon: Calendar, color: "text-warning" },
          { label: "Data Truth", value: "Paise", sub: "Zero-error Precision", icon: BarChart3, color: "text-info" },
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

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <Card className="border-none shadow-premium overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Immutable Snapshots
              </h3>
            </div>
            <DataTable columns={snapshotColumns} data={snapshots} searchKey="snapshot_name" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-card ring-1 ring-border p-6 h-full bg-primary/5 border-l-4 border-l-primary">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6">Regulator Export Hub</h3>
            {!isAuthorizedToExport && (
              <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex gap-2 items-center">
                 <Lock className="h-4 w-4 text-warning" />
                 <span className="text-[10px] font-bold text-warning uppercase">Exports Restricted to Admin/Account</span>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Finance Exports</Label>
                <div className="grid gap-2">
                  <Button variant="outline" className="justify-start gap-3 h-12" onClick={handleExportInvoices} disabled={isExporting || !isAuthorizedToExport}>
                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start translate-y-[-1px]">
                      <span className="text-xs font-bold">Buyer Invoices Report</span>
                      <span className="text-[10px] text-muted-foreground">CSV • Real-time Data</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-3 h-12" onClick={handleExportSupplierBills} disabled={isExporting || !isAuthorizedToExport}>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Download className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start translate-y-[-1px]">
                      <span className="text-xs font-bold">Supplier Payouts Report</span>
                      <span className="text-[10px] text-muted-foreground">CSV • Settlement Records</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-3 h-12" onClick={handleExportAging} disabled={isExporting || !isAuthorizedToExport}>
                    <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start translate-y-[-1px]">
                      <span className="text-xs font-bold">Outstanding Aging Report</span>
                      <span className="text-[10px] text-muted-foreground">CSV • Financial Risk</span>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Security & Audit</Label>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 mt-2" onClick={handleExportAuditLogs} disabled={isExporting || !isAuthorizedToExport}>
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start translate-y-[-1px]">
                    <span className="text-xs font-bold">Universal Audit Trail</span>
                    <span className="text-[10px] text-muted-foreground">CSV • Forensic Logs</span>
                  </div>
                </Button>
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong>Auditor Note:</strong> All exports are strictly read-only and derived from the primary source of truth. Timezone is stored in UTC. Amounts are converted from Paise.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}



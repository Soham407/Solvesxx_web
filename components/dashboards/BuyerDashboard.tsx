"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, FileText, Clock, CheckCircle2, TrendingUp, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { useBuyerInvoices } from "@/hooks/useBuyerInvoices";
import { formatCurrency } from "@/src/lib/utils/currency";
import { cn } from "@/lib/utils";
import { DashboardKPIGrid } from "@/components/shared/DashboardKPIGrid";

const ACTIVE_STATUSES = [
  "accepted", "indent_generated", "indent_forwarded", "indent_accepted",
  "po_issued", "po_received", "po_dispatched", "material_received",
  "material_acknowledged", "bill_generated", "feedback_pending",
];

export function BuyerDashboard() {
  const router = useRouter();
  const { requests, isLoading } = useBuyerRequests();
  const { invoices, isLoading: isLoadingInvoices, getInvoiceStatistics } = useBuyerInvoices();

  const pending = requests.filter((r) => r.status === "pending").length;
  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const completed = requests.filter((r) => r.status === "completed" || r.status === "paid").length;

  const invoiceStats = getInvoiceStatistics ? getInvoiceStatistics() : null;
  const totalInvoiced = invoiceStats?.totalAmount ?? 0;
  const outstanding = invoiceStats?.totalOutstanding ?? 0;

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 5);

  const kpis = [
    { label: "Total Requests", value: isLoading ? null : requests.length, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pending Approval", value: isLoading ? null : pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Active Orders", value: isLoading ? null : active, icon: TrendingUp, color: "text-info", bg: "bg-info/10" },
    { label: "Completed", value: isLoading ? null : completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Order & Requisition Portal</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Select service category and specify requirements.
          </p>
        </div>
        <Button variant="outline" className="font-bold gap-2" onClick={() => router.push("/buyer/requests")}>
          <ShoppingCart className="h-4 w-4" /> My Active Orders
        </Button>
      </div>

      {/* KPI Cards */}
      <DashboardKPIGrid kpis={kpis} />

      {/* Invoice Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" /> Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isLoadingInvoices ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Invoiced</span>
                  <span className="text-base font-bold">{formatCurrency(totalInvoiced)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Outstanding</span>
                  <span className={cn("text-base font-bold", outstanding > 0 ? "text-warning" : "text-success")}>
                    {formatCurrency(outstanding)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Invoices</span>
                  <span className="text-base font-bold">{invoices.length}</span>
                </div>
              </>
            )}
            <Button variant="outline" size="sm" className="w-full font-bold gap-2 mt-2" onClick={() => router.push("/buyer/invoices")}>
              <ExternalLink className="h-3.5 w-3.5" /> View Invoices
            </Button>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="border-none shadow-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : recentRequests.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No requests yet</div>
            ) : (
              <div className="divide-y">
                {recentRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold truncate">{req.title || req.request_number}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{req.request_number}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border-t">
              <Button variant="ghost" size="sm" className="w-full font-bold gap-2 text-primary" onClick={() => router.push("/buyer/requests")}>
                View All Requests <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Package, FileText, Truck, Loader2, ExternalLink, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { formatCurrency } from "@/src/lib/utils/currency";
import { cn } from "@/lib/utils";

const OPEN_INDENT_STATUSES = ["indent_forwarded", "pending"];
const ACTIVE_PO_STATUSES = ["acknowledged", "dispatched", "partial_received"];

export function SupplierDashboard() {
  const router = useRouter();
  const { indents, pos, bills, isLoading } = useSupplierPortal();

  const openIndents = indents.filter((i) => OPEN_INDENT_STATUSES.includes(i.status)).length;
  const activePOs = pos.filter((p) => ACTIVE_PO_STATUSES.includes(p.status)).length;
  const totalBilled = bills.reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

  const recentPOs = [...pos]
    .sort((a, b) => new Date(b.po_date ?? 0).getTime() - new Date(a.po_date ?? 0).getTime())
    .slice(0, 5);

  const kpis = [
    { label: "Open Indents", value: isLoading ? null : openIndents, icon: Package, color: "text-warning", bg: "bg-warning/10" },
    { label: "Active POs", value: isLoading ? null : activePOs, icon: Truck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Billed", value: isLoading ? null : formatCurrency(totalBilled), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Vendor Fulfillment Portal</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Review indents and manage personnel roster.
          </p>
        </div>
        <Button variant="outline" className="gap-2 font-bold shadow-sm" onClick={() => router.push("/supplier")}>
          <ExternalLink className="h-4 w-4" /> Supplier Portal
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight mt-1">
                {kpi.value === null ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  kpi.value
                )}
              </div>
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em] mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent POs */}
        <Card className="border-none shadow-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Truck className="h-4 w-4" /> Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : recentPOs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No purchase orders yet</div>
            ) : (
              <div className="divide-y">
                {recentPOs.map((po) => (
                  <div key={po.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold truncate">{po.po_number}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{formatCurrency(po.grand_total ?? 0)}</p>
                    </div>
                    <StatusBadge status={po.status} />
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border-t">
              <Button variant="ghost" size="sm" className="w-full font-bold gap-2 text-primary" onClick={() => router.push("/supplier/purchase-orders")}>
                View All POs <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card className="border-none shadow-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" /> Billing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Bills</span>
                  <span className="text-base font-bold">{bills.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Amount</span>
                  <span className="text-base font-bold">{formatCurrency(totalBilled)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Open Indents</span>
                  <span className="text-base font-bold">{openIndents}</span>
                </div>
              </>
            )}
            <Button variant="outline" size="sm" className="w-full font-bold gap-2 mt-2" onClick={() => router.push("/supplier/bills")}>
              <ExternalLink className="h-3.5 w-3.5" /> View Bills
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";
import { Package, AlertTriangle, ArrowLeftRight, FileWarning, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useGRN } from "@/hooks/useGRN";
import { useReorderAlerts } from "@/hooks/useReorderAlerts";
import { useRTVTickets } from "@/hooks/useRTVTickets";
import { useShortageNotes } from "@/hooks/useShortageNotes";
import { cn } from "@/lib/utils";

export function StorekeeperDashboard() {
  const { materialReceipts: grns, isLoading: grnLoading } = useGRN();
  const { alerts, isLoading: alertsLoading } = useReorderAlerts();
  const { tickets: rtvTickets, isLoading: rtvLoading } = useRTVTickets();
  const { notes: shortageNotes, isLoading: shortageLoading } = useShortageNotes();

  const isLoading = grnLoading || alertsLoading || rtvLoading || shortageLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const pendingGRNs = grns?.filter(g => g.status === "draft" || g.status === "inspecting") || [];
  const openRTVs = rtvTickets?.filter(t => t.status === "pending" || t.status === "approved" || t.status === "pending_dispatch") || [];
  const criticalAlerts = alerts?.filter(a => a.priority === "critical" || a.priority === "high") || [];

  const kpiCards = [
    {
      title: "Pending GRNs",
      value: pendingGRNs.length,
      icon: Package,
      color: "bg-blue-600",
      description: "Awaiting verification",
    },
    {
      title: "Stock Alerts",
      value: alerts?.length || 0,
      icon: AlertTriangle,
      color: alerts?.length > 0 ? "bg-red-600" : "bg-emerald-600",
      description: `${criticalAlerts.length} critical`,
    },
    {
      title: "Open RTV Items",
      value: openRTVs.length,
      icon: ArrowLeftRight,
      color: "bg-amber-600",
      description: "Pending return",
    },
    {
      title: "Shortage Notes",
      value: shortageNotes?.length || 0,
      icon: FileWarning,
      color: "bg-purple-600",
      description: "Quantity gaps",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-none shadow-card hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-xl shadow-lg shadow-black/10", card.color)}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent GRNs */}
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Recent GRNs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {grns && grns.length > 0 ? (
              <div className="divide-y">
                {grns.slice(0, 6).map((grn: any) => (
                  <div key={grn.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                    <div>
                      <p className="text-sm font-semibold">{grn.grn_number || `GRN-${grn.id.slice(0, 6)}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {grn.supplier_name || "Unknown Supplier"}
                      </p>
                    </div>
                    <StatusBadge status={grn.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm">No pending GRNs</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {alerts && alerts.length > 0 ? (
              <div className="divide-y">
                {alerts.slice(0, 6).map((alert: any) => (
                  <div key={alert.id} className={cn(
                    "flex items-center justify-between px-4 py-3 border-l-4",
                    alert.priority === "critical" || alert.priority === "high"
                      ? "border-critical bg-critical/5"
                      : "border-warning bg-warning/5"
                  )}>
                    <div>
                      <p className="text-sm font-semibold">{alert.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.warehouseName} • Stock: {alert.currentStock}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                      alert.priority === "critical" || alert.priority === "high"
                        ? "bg-critical/10 text-critical"
                        : "bg-warning/10 text-warning"
                    )}>
                      {alert.alertType === "out_of_stock" ? "Out of Stock" : "Low Stock"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm">All stock levels normal</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RTV Items */}
      {openRTVs.length > 0 && (
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Open Return-to-Vendor Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {openRTVs.slice(0, 5).map((rtv: any) => (
                <div key={rtv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{rtv.rtv_number}</p>
                    <p className="text-xs text-muted-foreground capitalize">{rtv.return_reason?.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={rtv.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

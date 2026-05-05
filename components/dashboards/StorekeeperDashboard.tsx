"use client";
import { Package, AlertTriangle, ArrowLeftRight, FileWarning, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGRN } from "@/hooks/useGRN";
import { useReorderAlerts } from "@/hooks/useReorderAlerts";
import { useRTVTickets } from "@/hooks/useRTVTickets";
import { useShortageNotes } from "@/hooks/useShortageNotes";
import { StorekeeperKpiCards } from "@/components/dashboards/StorekeeperKpiCards";
import { StorekeeperGrnSection } from "@/components/dashboards/StorekeeperGrnSection";
import { StorekeeperStockAlertsSection } from "@/components/dashboards/StorekeeperStockAlertsSection";
import { StorekeeperRtvSection } from "@/components/dashboards/StorekeeperRtvSection";

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

  const pendingGRNs = grns?.filter((g) => g.status === "draft" || g.status === "inspecting") || [];
  const openRTVs = rtvTickets?.filter(
    (t) => t.status === "pending" || t.status === "approved" || t.status === "pending_dispatch",
  ) || [];
  const criticalAlerts = alerts?.filter((a) => a.priority === "critical" || a.priority === "high") || [];

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
      <StorekeeperKpiCards cards={kpiCards} />

      <div className="grid gap-6 md:grid-cols-2">
        <StorekeeperGrnSection grns={grns || []} />
        <StorekeeperStockAlertsSection alerts={alerts || []} />
      </div>

      <StorekeeperRtvSection tickets={openRTVs} />
    </div>
  );
}

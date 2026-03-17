"use client";
import { Users, ClipboardCheck, AlertOctagon, UserCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { usePersonnelDispatches } from "@/hooks/usePersonnelDispatches";
import { useBehaviorTickets } from "@/hooks/useBehaviorTickets";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { cn } from "@/lib/utils";

import { format, isToday, parseISO } from "date-fns";

export function SiteSupervisorDashboard() {
  const { requests, isLoading: reqLoading } = useServiceRequests({ status: ["open", "assigned", "in_progress"] });
  const { dispatches, isLoading: dispatchLoading } = usePersonnelDispatches();
  const { tickets, isLoading: ticketsLoading } = useBehaviorTickets();
  const { data: records, isLoading: attendanceLoading } = useAnalyticsData("attendance");


  const isLoading = reqLoading || dispatchLoading || ticketsLoading || attendanceLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // Compute KPI values
  const activeDeployments = requests?.filter(r => ["open", "assigned", "in_progress"].includes(r.status)) || [];
  const todayDispatches = dispatches?.filter(d => {

    try { return isToday(parseISO(d.dispatch_date || d.created_at)); } catch { return false; }
  }) || [];
  const openIncidents = tickets?.filter(t => t.status === "open" || t.status === "under_review") || [];
  const todayAttendance = records?.filter(r => {
    try { return isToday(parseISO(r.check_in_time || r.created_at)); } catch { return false; }
  }) || [];

  const kpiCards = [
    {
      title: "Active Deployments",
      value: activeDeployments.length,
      icon: ClipboardCheck,
      color: "bg-blue-600",
      description: "Services currently running",
    },
    {
      title: "Staff Dispatched Today",
      value: todayDispatches.reduce((acc, d) => acc + (d.personnel_json?.length || 0), 0),
      icon: Users,
      color: "bg-emerald-600",
      description: "Personnel dispatched",
    },
    {
      title: "Open Incidents",
      value: openIncidents.length,
      icon: AlertOctagon,
      color: openIncidents.length > 0 ? "bg-red-600" : "bg-slate-500",
      description: openIncidents.length > 0 ? "Need resolution" : "All clear",
    },
    {
      title: "Attendance Today",
      value: todayAttendance.length,
      icon: UserCheck,
      color: "bg-purple-600",
      description: "Staff punched in",
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
        {/* Active Service Deployments */}
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeDeployments.length > 0 ? (
              <div className="divide-y">
                {activeDeployments.slice(0, 6).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                    <div>
                      <p className="text-sm font-semibold">{req.item_description || req.service_name || "Service Request"}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.request_number}
                        {req.priority ? ` • ${req.priority} priority` : ""}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm">No active deployments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Incidents */}
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {openIncidents.length > 0 ? (
              <div className="divide-y">
                {openIncidents.slice(0, 6).map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                    <div>
                      <p className="text-sm font-semibold">{ticket.category?.replace(/_/g, " ") || "Incident"}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.employee ? `${ticket.employee.first_name} ${ticket.employee.last_name}` : "Unknown"} • {
                          ticket.created_at ? format(parseISO(ticket.created_at), "dd MMM") : ""
                        }
                      </p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-6 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm">No open incidents</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Personnel Dispatches */}
      {dispatches && dispatches.length > 0 && (
        <Card className="border-none shadow-card">
          <CardHeader className="border-b py-4 bg-muted/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Recent Personnel Dispatches</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {dispatches.slice(0, 5).map((dispatch: any) => (
                <div key={dispatch.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{dispatch.dispatch_number || "Dispatch"}</p>
                    <p className="text-xs text-muted-foreground">
                      {dispatch.supplier_name} • {dispatch.personnel_json?.length || 0} personnel • {
                        dispatch.dispatch_date ? format(parseISO(dispatch.dispatch_date), "dd MMM") : ""
                      }
                    </p>
                  </div>
                  <StatusBadge status={dispatch.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

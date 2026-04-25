"use client";

import { ShieldCheck, Users, ClipboardList, Map, AlertCircle, TrendingUp, CheckCircle2, MoreHorizontal, Bell, Clock, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSupervisorStats } from "@/hooks/useSupervisorStats";
import { usePatrolLogs } from "@/hooks/usePatrolLogs";
import { usePanicAlertSubscription } from "@/hooks/usePanicAlertSubscription";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { GuardLiveMap } from "./GuardLiveMap";

interface ErrorBoundaryProps {
  error?: string | null;
  title?: string;
}

function ErrorFallback({ error, title }: ErrorBoundaryProps) {
  return (
    <Card className="border-critical/20 bg-critical/5">
      <CardContent className="p-6 flex items-center gap-4 text-critical">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm">{title || "Error loading data"}</p>
          {error && <p className="text-xs text-muted-foreground mt-1">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SecuritySupervisorDashboard() {
  const { 
    employeeId, 
    isLoading: isProfileLoading,
    error: profileError
  } = useEmployeeProfile();

  const { stats, isLoading: isLoadingStats, error: statsError } = useSupervisorStats();
  const { logs, isLoading: isLoadingLogs, error: logsError } = usePatrolLogs(undefined, 10);
  const { 
    unresolvedCount, 
    isLoading: isLoadingAlerts,
    isConnected,
    error: alertsError
  } = usePanicAlertSubscription();

  const isLoading = isProfileLoading || isLoadingStats || isLoadingLogs || isLoadingAlerts;

  // Render error boundary if profile failed to load
  if (profileError && !isProfileLoading) {
    return <ErrorFallback error={profileError} title="Failed to load supervisor profile" />;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Security Operations Control</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Site supervision, patrol verification, and staff compliance.
            {isConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
            <Link href="/services/security">
              <Button className="gap-2 font-bold shadow-lg shadow-primary/20 bg-primary">
                  <ShieldCheck className="h-4 w-4" /> Personnel Audit
              </Button>
            </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
          {statsError ? (
            <ErrorFallback error={statsError} title="Failed to load stats" />
          ) : (
            [
                { 
                  label: "Guards on Site", 
                  value: isLoadingStats ? "..." : `${stats.guardsOnSite}`, 
                  sub: `${stats.totalGuards} total guards`, 
                  icon: Users, 
                  color: "text-primary" 
                },
                { 
                  label: "Checkpoint Compliance", 
                  value: isLoadingStats ? "..." : `${stats.checkpointCompliance}%`, 
                  sub: "Last 4 hours", 
                  icon: Map, 
                  color: stats.checkpointCompliance >= 80 ? "text-success" : "text-warning" 
                },
                { 
                  label: "Pending Checklists", 
                  value: isLoadingStats ? "..." : stats.pendingChecklists.toString(), 
                  sub: "Awaiting completion", 
                  icon: ClipboardList, 
                  color: stats.pendingChecklists > 0 ? "text-warning" : "text-success" 
                },
                { 
                  label: "Unresolved Alerts", 
                  value: isLoadingAlerts ? "..." : unresolvedCount.toString(), 
                  sub: unresolvedCount > 0 ? "Active alerts" : "All clear", 
                  icon: AlertCircle, 
                  color: unresolvedCount > 0 ? "text-critical" : "text-success",
                  highlight: unresolvedCount > 0
                },
            ].map((stat, i) => (
                <Card key={i} className={cn(
                  "border-none shadow-card ring-1 ring-border p-4",
                  stat.highlight && "ring-2 ring-critical/30 bg-critical/5"
                )}>
                    <div className="flex items-center gap-4 text-left">
                        <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold">{stat.value}</span>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</span>
                        </div>
                    </div>
                </Card>
            ))
          )}
      </div>

      <div className="grid gap-6">
        {alertsError ? (
          <ErrorFallback error={alertsError} title="Failed to load panic alerts" />
        ) : (
          <GuardLiveMap />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-card ring-1 ring-border">
              <CardHeader className="bg-muted/5 border-b">
                  <CardTitle className="text-sm font-bold uppercase ">Site Patrol Log Real-time</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  {logsError ? (
                    <div className="p-4">
                      <ErrorFallback error={logsError} title="Failed to load patrol logs" />
                    </div>
                  ) : (
                    <div className="divide-y text-left">
                        {isLoadingLogs ? (
                          <div className="p-8 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : logs && logs.length > 0 ? (
                          logs.map((log) => (
                            <div key={log.id} className="p-4 flex items-center justify-between group hover:bg-muted/20">
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px]", log.status === "completed" ? "bg-success/10 text-success" : log.status === "overdue" ? "bg-critical/10 text-critical animate-pulse" : "bg-warning/10 text-warning")}>
                                        {log.guardName.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold ">{log.guardName}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                          {log.checkpointsVerified}/{log.totalCheckpoints} checkpoints verified
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {log.patrolTime}
                                    </span>
                                    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", log.status === "completed" ? "bg-success/5 text-success border-success/20" : log.status === "overdue" ? "bg-critical/5 text-critical border-critical/20" : "bg-warning/5 text-warning border-warning/20")}>
                                        {log.status}
                                    </Badge>
                                </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            No patrol activity recorded today.
                          </div>
                        )}
                    </div>
                  )}
              </CardContent>
          </Card>

          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Staff Attendance Pulse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-4 py-6 border-b border-dashed">
                        <div className={cn(
                          "h-20 w-20 rounded-full border-4 flex items-center justify-center",
                          isLoadingStats ? "border-muted" : stats.shiftAttendance >= 90 ? "border-success border-t-transparent" : stats.shiftAttendance >= 70 ? "border-warning border-t-transparent" : "border-critical border-t-transparent"
                        )}>
                            <span className={cn(
                              "text-lg font-bold",
                              isLoadingStats ? "text-muted-foreground" : stats.shiftAttendance >= 90 ? "text-success" : stats.shiftAttendance >= 70 ? "text-warning" : "text-critical"
                            )}>
                              {isLoadingStats ? "..." : `${stats.shiftAttendance}%`}
                            </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                          Attendance for Current Shift
                        </p>
                    </div>
                    <div className="space-y-4 pt-4">
                        <Link href="/hrms/attendance">
                          <Button variant="outline" className="w-full text-[10px] font-bold uppercase h-10 border-muted-foreground/20">
                            Check Late Comers
                          </Button>
                        </Link>
                        <Link href="/admin/guards">
                          <Button variant="ghost" className="w-full text-[10px] font-bold uppercase h-10 text-primary">
                            Manage Guard Assignments
                          </Button>
                        </Link>
                    </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

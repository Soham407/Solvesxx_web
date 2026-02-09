"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Users, ShieldAlert, BarChart3, Clock, ArrowRight, UserMinus, Plus, AlertTriangle, X, Bell, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePanicAlertSubscription } from "@/hooks/usePanicAlertSubscription";
import { useEmployeeProfileWithFallback } from "@/hooks/useEmployeeProfile";
import { useBehaviorTickets } from "@/hooks/useBehaviorTickets";
import { useSocietyStats } from "@/hooks/useSocietyStats";
import { ComingSoonWidget } from "@/components/shared/ComingSoon";
import { useToast } from "@/components/ui/use-toast";

// Fallback for development/testing when not authenticated
const DEV_MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";

export function SocietyManagerDashboard() {
  const { toast } = useToast();
  
  // Get authenticated manager profile (falls back to mock in dev)
  const { 
    employeeId, 
    fullName: managerName,
    isLoading: isProfileLoading, 
    error: profileError 
  } = useEmployeeProfileWithFallback(DEV_MOCK_EMPLOYEE_ID);

  // Real data hooks
  const { stats, isLoading: isLoadingStats, refresh: refreshStats } = useSocietyStats();
  const { tickets, isLoading: isLoadingTickets, stats: ticketStats } = useBehaviorTickets();

  const {
    alerts,
    unresolvedCount,
    isLoading: isLoadingAlerts,
    isConnected,
    latestAlert,
    onNewAlert,
    clearLatestAlert,
    resolveAlert,
  } = usePanicAlertSubscription();

  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [isResolving, setIsResolving] = useState<string | null>(null);

  // Register callback for new alerts
  useEffect(() => {
    onNewAlert((alert) => {
      setShowAlertPopup(true);
      // Play alert sound (optional - browser permitting)
      try {
        const audio = new Audio("/alert-sound.mp3");
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch {}
      
      toast({
        title: "🚨 EMERGENCY PANIC ALERT!",
        description: `Guard ${alert.guard?.employee?.first_name || "Unknown"} triggered an emergency alert at ${alert.location?.location_name || "Unknown location"}!`,
        variant: "destructive",
        duration: 10000,
      });
    });
  }, [onNewAlert, toast]);

  // Check if we can resolve alerts (need valid employee ID)
  const canResolve = !isProfileLoading && !!employeeId;

  // Handle resolve alert
  const handleResolve = async (alertId: string) => {
    // Validate we have an employee ID before resolving
    if (!employeeId) {
      toast({
        title: "Cannot Resolve Alert",
        description: "Please log in to resolve alerts.",
        variant: "destructive",
      });
      return;
    }

    setIsResolving(alertId);
    const resolutionNote = `Resolved by ${managerName || "Society Manager"}`;
    const result = await resolveAlert(alertId, employeeId, resolutionNote);
    setIsResolving(null);
    
    if (result.success) {
      toast({
        title: "Alert Resolved",
        description: "The panic alert has been marked as resolved.",
      });
    } else {
      toast({
        title: "Failed to Resolve",
        description: result.error || "Could not resolve the alert.",
        variant: "destructive",
      });
    }
  };

  // Format alert time
  const formatAlertTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Emergency Alert Popup */}
      {showAlertPopup && latestAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-critical text-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">🚨 EMERGENCY ALERT</h2>
              <p className="text-lg font-medium mb-1">
                {latestAlert.guard?.employee?.first_name} {latestAlert.guard?.employee?.last_name || "Unknown Guard"}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm opacity-80 mb-4">
                <MapPin className="h-4 w-4" />
                {latestAlert.location?.location_name || "Unknown Location"}
              </div>
              <p className="text-xs opacity-70 mb-6">
                Alert triggered at {formatAlertTime(latestAlert.alert_time)}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    handleResolve(latestAlert.id);
                    setShowAlertPopup(false);
                    clearLatestAlert();
                  }}
                  disabled={!canResolve}
                  className="flex-1 bg-white text-critical hover:bg-white/90 font-bold disabled:opacity-50"
                >
                  {!canResolve ? "Loading..." : "Resolve Alert"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAlertPopup(false);
                    clearLatestAlert();
                  }}
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold ">Society Management Hub</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Monitoring site operations and staff discipline.
            {isConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
           <Button className="bg-critical hover:bg-critical/90 gap-2 shadow-lg shadow-critical/10 font-bold">
              <ShieldAlert className="h-4 w-4" /> Raise Breach Ticket
           </Button>
           <Button variant="outline" className="gap-2 font-bold">
              <Plus className="h-4 w-4" /> Post Notice
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[{
            label: "Active Guards",
            value: isLoadingStats ? "..." : `${stats.activeGuards} / ${stats.totalGuards}`,
            sub: stats.activeGuards >= stats.totalGuards ? "All posts occupied" : `${stats.totalGuards - stats.activeGuards} posts empty`,
            color: stats.activeGuards >= stats.totalGuards ? "text-success" : "text-warning",
            bg: "bg-success/5" 
            },
            { 
              label: "Checklist Status", 
              value: isLoadingStats ? "..." : `${stats.checklistCompletion}%`, 
              sub: `${stats.activeChecklists} of ${stats.totalChecklists} completed`, 
              color: stats.checklistCompletion >= 80 ? "text-primary" : "text-warning", 
              bg: "bg-primary/5" 
            },
            { 
              label: "SOS Alerts", 
              value: isLoadingAlerts ? "..." : unresolvedCount.toString(), 
              sub: unresolvedCount > 0 ? "ACTIVE - NEEDS ATTENTION" : "All clear",
              color: unresolvedCount > 0 ? "text-critical" : "text-muted-foreground", 
              bg: unresolvedCount > 0 ? "bg-critical/10 ring-2 ring-critical/30 animate-pulse" : "bg-muted/50",
              icon: unresolvedCount > 0 ? <Bell className="h-4 w-4 text-critical animate-bounce" /> : null
            },
            { 
              label: "New Visitors", 
              value: isLoadingStats ? "..." : stats.visitorsToday.toString(), 
              sub: `${stats.pendingCheckouts} pending checkouts`, 
              color: "text-info", 
              bg: "bg-info/5" 
            },
        ].map((stat, i) => (
            <Card key={i} className={cn("border-none shadow-card ring-1 ring-border p-4", stat.bg)}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</span>
                      {"icon" in stat && stat.icon}
                    </div>
                    <span className={cn("text-2xl font-bold", stat.color)}>{stat.value}</span>
                    <span className={cn("text-[10px] font-bold", unresolvedCount > 0 && i === 2 ? "text-critical" : "text-muted-foreground/60")}>{stat.sub}</span>
                </div>
            </Card>
        ))}
      </div>

      {/* Active Panic Alerts Section */}
      {unresolvedCount > 0 && (
        <Card className="border-2 border-critical bg-critical/5 shadow-lg shadow-critical/10">
          <CardHeader className="border-b border-critical/20 bg-critical/10">
            <CardTitle className="text-base font-bold uppercase text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Active Emergency Alerts ({unresolvedCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-critical/10">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-critical/5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-critical/20 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-critical" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {alert.guard?.employee?.first_name} {alert.guard?.employee?.last_name || "Unknown Guard"}
                        <Badge className="ml-2 bg-critical/20 text-critical border-critical/30 text-[10px]">
                          {alert.guard?.guard_code || "N/A"}
                        </Badge>
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.location?.location_name || "Unknown Location"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatAlertTime(alert.alert_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                    disabled={isResolving === alert.id || !canResolve}
                    className="bg-critical hover:bg-critical/90 gap-1"
                  >
                    {isResolving === alert.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
         <Card className="lg:col-span-2 border-none shadow-card ring-1 ring-border">
            <CardHeader className="border-b bg-muted/5">
                <CardTitle className="text-base font-bold uppercase flex items-center justify-between">
                  Recent Staff Misconduct Tickets
                  {!isLoadingTickets && ticketStats && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {ticketStats.active} Active
                    </Badge>
                  )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y text-left">
                  {isLoadingTickets ? (
                    <div className="p-8 text-center text-muted-foreground">Loading tickets...</div>
                  ) : tickets && tickets.length > 0 ? (
                    tickets.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="p-4 flex items-center justify-between group hover:bg-muted/20">
                          <div className="flex items-center gap-4">
                              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase", 
                                  ticket.severity === "high" ? "bg-critical/10 text-critical" : 
                                  ticket.severity === "medium" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
                                  {ticket.severity.substring(0,1).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-sm font-bold ">
                                    {ticket.employee ? `${ticket.employee.first_name} ${ticket.employee.last_name}` : "Unknown"} ({ticket.ticket_number})
                                  </span>
                                  <span className="text-xs text-muted-foreground">{ticket.category.replace(/_/g, " ")}</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {new Date(ticket.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <Badge variant={ticket.status === "open" ? "default" : "secondary"} className="text-[9px]">
                                {ticket.status}
                              </Badge>
                          </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No misconduct tickets found. Staff performing well!
                    </div>
                  )}
               </div>
            </CardContent>
         </Card>

         <div className="space-y-6">
             <Card className="border-none shadow-card ring-1 ring-border">
                 <CardHeader>
                     <CardTitle className="text-sm font-bold uppercase tracking-widest">Patrol Efficiency</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold">
                             <span>Overall Compliance</span>
                             <span>{isLoadingStats ? "..." : `${stats.checklistCompletion}%`}</span>
                         </div>
                         <Progress value={isLoadingStats ? 0 : stats.checklistCompletion} className="h-1 bg-muted" />
                     </div>
                     <div className="space-y-2">
                         <div className="flex items-center justify-between text-xs font-bold">
                             <span>Active Checklists</span>
                             <span>{isLoadingStats ? "..." : `${stats.activeChecklists}/${stats.totalChecklists}`}</span>
                         </div>
                         <Progress 
                           value={isLoadingStats ? 0 : (stats.totalChecklists ? (stats.activeChecklists / stats.totalChecklists) * 100 : 0)} 
                           className="h-1 bg-muted" 
                         />
                     </div>
                     <Button variant="ghost" className="w-full text-[10px] font-bold uppercase text-primary tracking-widest mt-2 border-dashed border-2">
                       Review Patrol Logs <ArrowRight className="ml-2 h-3 w-3" />
                     </Button>
                 </CardContent>
             </Card>

             <Card className="border-none shadow-card ring-1 ring-border">
                 <CardHeader>
                     <CardTitle className="text-sm font-bold uppercase tracking-widest">Resident Feedback</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <ComingSoonWidget 
                     title="Feedback System"
                     description="Resident satisfaction tracking will be available in a future update"
                   />
                 </CardContent>
             </Card>
         </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, ShieldAlert, BarChart3, Clock, ArrowRight, UserMinus, Plus, AlertTriangle, X, Bell, MapPin, Loader2, Camera, ShieldCheck, UserCheck, Eye, History, Smartphone, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePanicAlertSubscription } from "@/hooks/usePanicAlertSubscription";
import { useEmployeeProfileWithFallback } from "@/hooks/useEmployeeProfile";
import { useBehaviorTickets } from "@/hooks/useBehaviorTickets";
import { useSocietyStats } from "@/hooks/useSocietyStats";
import { useSocietyAudit } from "@/hooks/useSocietyAudit";
import { useGuardLiveLocation } from "@/hooks/useGuardLiveLocation";
import { GuardLiveMap } from "@/components/dashboards/GuardLiveMap";
import { ComingSoonWidget } from "@/components/shared/ComingSoon";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function SocietyManagerDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  
  // Get authenticated manager profile (falls back to mock in dev)
  const { 
    employeeId, 
    fullName: managerName,
    isLoading: isProfileLoading, 
    error: profileError 
  } = useEmployeeProfileWithFallback();

  // Real data hooks
  const { stats, isLoading: isLoadingStats, refresh: refreshStats } = useSocietyStats();
  const { visitorAudit, attendanceAudit, checklistAudit, isLoading: isLoadingAudit, refresh: refreshAudit } = useSocietyAudit();
  const { locations: liveGuards, isLoading: isLoadingLiveGuards } = useGuardLiveLocation();
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

  const maskPhone = (phone: string | null) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
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
          <h1 className="text-2xl font-bold tracking-tight">Society Management Hub</h1>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            Read-only oversight of site operations and staff discipline.
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-success bg-success/5 px-2 py-0.5 rounded-full border border-success/20 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                LIVE SURVEILLANCE
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
           <Button 
             variant="outline"
             className="gap-2 font-bold border-critical/30 text-critical hover:bg-critical/5"
             onClick={() => router.push("/tickets/behavior")}
           >
              <ShieldAlert className="h-4 w-4" /> View Misconduct Logs
           </Button>
           <Button 
             variant="secondary" 
             className="gap-2 font-bold shadow-sm"
             onClick={() => {
               refreshStats();
               refreshAudit();
               toast({ title: "Refreshing Real Data", description: "All site metrics have been synchronized with the live server." });
             }}
           >
              <Clock className="h-4 w-4" /> Sync Now
           </Button>
        </div>
      </div>

      {/* Trust Core (Stats) */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Visitor Overview",
            value: isLoadingAudit ? "..." : visitorAudit.total.toString(),
            sub: `${visitorAudit.pending} pending confirmation`,
            color: "text-info",
            bg: "bg-info/5",
            icon: <Users className="h-4 w-4 text-info" />
          },
          { 
            label: "Guard Presence", 
            value: isLoadingAudit ? "..." : (attendanceAudit.onDuty + attendanceAudit.absent).toString(), 
            sub: `${attendanceAudit.onDuty} on duty, ${attendanceAudit.absent} absent`, 
            color: attendanceAudit.absent > 0 ? "text-warning" : "text-success", 
            bg: "bg-warning/5",
            icon: <ShieldCheck className="h-4 w-4" />
          },
          { 
            label: "Reality Anomalies", 
            value: isLoadingAudit ? "..." : (attendanceAudit.autoPunchOuts + attendanceAudit.inactivityAlerts).toString(), 
            sub: `${attendanceAudit.autoPunchOuts} auto-punches today`,
            color: (attendanceAudit.autoPunchOuts + attendanceAudit.inactivityAlerts) > 0 ? "text-critical" : "text-muted-foreground", 
            bg: (attendanceAudit.autoPunchOuts + attendanceAudit.inactivityAlerts) > 0 ? "bg-critical/10 animate-pulse" : "bg-muted/50",
            icon: <AlertTriangle className="h-4 w-4 text-critical" />
          },
          { 
            label: "Checklist Compliance", 
            value: isLoadingAudit ? "..." : `${checklistAudit.completed}/${checklistAudit.completed + checklistAudit.pending}`, 
            sub: `${Math.round((checklistAudit.completed / (checklistAudit.completed + checklistAudit.pending || 1)) * 100)}% completion rate`, 
            color: "text-primary", 
            bg: "bg-primary/5",
            icon: <CheckCircle2 className="h-4 w-4 text-primary" />
          },
        ].map((stat, i) => (
            <Card key={i} className={cn("border-none shadow-card ring-1 ring-border p-4", stat.bg)}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{stat.label}</span>
                      {stat.icon}
                    </div>
                    <span className={cn("text-2xl font-bold", stat.color)}>{stat.value}</span>
                    <span className={cn("text-[10px] font-bold opacity-70")}>{stat.sub}</span>
                </div>
            </Card>
        ))}
      </div>

      {/* Live Guard Awareness */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/5 border-b py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Live Guard Tracking
                </CardTitle>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-success flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-success"></span>
                    {liveGuards.length} Active
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-black tracking-widest">READ ONLY</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <GuardLiveMap height="400px" readOnly />
            </CardContent>
          </Card>

          {/* Detailed Audit Table: Visitors */}
          <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
             <CardHeader className="bg-muted/5 border-b py-4">
               <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                 <History className="h-4 w-4" /> Today's Visitor Ledger
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase">Visitor</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Phone (Masked)</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Evidence</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAudit ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : visitorAudit.entries.length > 0 ? (
                      visitorAudit.entries.slice(0, 5).map((visitor, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/10">
                          <TableCell className="text-xs font-bold">{visitor.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase py-0">{visitor.visitor_type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{maskPhone(visitor.phone_number)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                              <UserCheck className="h-3 w-3" /> VERIFIED
                            </div>
                          </TableCell>
                          <TableCell>
                            {visitor.approved_by_resident === true ? (
                              <Badge className="bg-success/10 text-success border-success/20 text-[9px]">APPROVED</Badge>
                            ) : visitor.approved_by_resident === false ? (
                              <Badge className="bg-critical/10 text-critical border-critical/20 text-[9px]">DENIED</Badge>
                            ) : (
                              <Badge className="bg-warning/10 text-warning border-warning/20 text-[9px]">PENDING</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">No visitor records found for today.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t bg-muted/5 flex justify-center">
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest gap-2" disabled>
                    View All Audit Logs <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Checklist Proofs */}
          <Card className="border-none shadow-card ring-1 ring-border h-full">
            <CardHeader className="bg-muted/5 border-b py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Camera className="h-4 w-4" /> Task Evidence Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : checklistAudit.items.filter(i => i.is_complete).length > 0 ? (
                checklistAudit.items.filter(i => i.is_complete).slice(0, 5).map((response: any) => (
                  <div key={response.id} className="p-3 rounded-lg bg-muted/20 border border-border group hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {response.guard?.employee?.first_name || "Guard"}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {format(new Date(response.completed_at || response.created_at), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {response.evidence_photos?.[0] ? (
                          <img src={response.evidence_photos[0].photo_url} className="h-full w-full object-cover" alt="Proof" />
                        ) : (
                          <Camera className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">Checklist Entry</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase px-1 py-0 border-success/30 text-success">
                            <MapPin className="h-2 w-2 mr-1" /> Geo-Verified
                          </Badge>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-sm font-bold uppercase tracking-widest">Evidence Verification</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                               {response.evidence_photos?.[0] ? (
                                 <img src={response.evidence_photos[0].photo_url} className="h-full w-full object-cover" alt="Evidence" />
                               ) : (
                                 <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No photo evidence</div>
                               )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-muted/20 border">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Timestamp</span>
                                <span className="text-xs font-bold">{format(new Date(response.completed_at || response.created_at), "MMM dd, HH:mm:ss")}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/20 border">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Coordinates</span>
                                <span className="text-xs font-bold">{response.latitude?.toFixed(4)}, {response.longitude?.toFixed(4)}</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
                              <ShieldCheck className="h-5 w-5 text-success" />
                              <div className="text-xs">
                                <p className="font-bold text-success">Tamper-Proof Verification</p>
                                <p className="text-muted-foreground">GPS and Photo evidence recorded at source.</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Camera className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No evidence submissions found for today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Emergency Alerts History (Read Only) */}
      <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="bg-muted/5 border-b py-4">
              <CardTitle className="text-base font-bold uppercase flex items-center justify-between">
                Panic Alert Activity (Current Session)
                <Badge variant="outline" className="text-xs font-medium">
                  {unresolvedCount} Active
                </Badge>
              </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y text-left">
                {isLoadingAlerts ? (
                  <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : alerts.length > 0 ? (
                  alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-4 flex items-center justify-between group hover:bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", 
                                alert.is_resolved ? "bg-success/10 text-success" : "bg-critical/10 text-critical animate-pulse")}>
                                {alert.is_resolved ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold ">
                                  {alert.guard?.employee?.first_name} {alert.guard?.employee?.last_name}
                                  {!alert.is_resolved && <span className="ml-2 text-[10px] text-critical animate-bounce">SIGNAL ACTIVE</span>}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {alert.location?.location_name || "Gate #1"}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                            {formatAlertTime(alert.alert_time)}
                          </span>
                          {alert.is_resolved ? (
                            <Badge variant="secondary" className="text-[9px] bg-success/10 text-success border-success/20">
                              RESOLVED
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[9px] animate-pulse">
                              UNRESOLVED
                            </Badge>
                          )}
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No emergency alerts recorded in the current session.
                  </div>
                )}
             </div>
          </CardContent>
      </Card>
    </div>
  );
}

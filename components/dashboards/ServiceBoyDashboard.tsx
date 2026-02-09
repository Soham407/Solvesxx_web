"use client";

import { Wrench, Camera, Play, CheckCircle, Clock, MapPin, ClipboardCheck, AlertCircle, Loader2, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployeeProfileWithFallback } from "@/hooks/useEmployeeProfile";
import { useJobSessions } from "@/hooks/useJobSessions";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useReorderAlerts } from "@/hooks/useReorderAlerts";
import { ComingSoonWidget } from "@/components/shared/ComingSoon";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

const DEV_MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";

export function ServiceBoyDashboard() {
  const { toast } = useToast();
  
  const { 
    employeeId, 
    fullName,
    isLoading: isProfileLoading 
  } = useEmployeeProfileWithFallback(DEV_MOCK_EMPLOYEE_ID);

  // Get real data for service technician
  const { sessions, activeSession, isLoading: isLoadingSessions } = useJobSessions(undefined, employeeId);
  const { requests, isLoading: isLoadingRequests } = useServiceRequests({ 
    assignedTo: employeeId || undefined,
    status: ["assigned", "in_progress"]
  });
  const { alerts, isLoading: isLoadingAlerts } = useReorderAlerts();

  const isLoading = isProfileLoading || isLoadingSessions || isLoadingRequests || isLoadingAlerts;

  const handleStartWork = () => {
    toast({
      title: "Starting Job Session",
      description: "Opening job session tracker...",
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex flex-col text-left">
          <h1 className="text-xl font-bold ">Technician Portal</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Welcome, {fullName || "Technician"} • {employeeId ? "ID: " + employeeId.substring(0, 8) : "Loading..."}
          </p>
      </div>

      {/* Active Job Highlight */}
      {isLoadingSessions ? (
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/20">
          <CardContent className="p-4 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : activeSession ? (
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/20 border-l-4 border-l-primary">
            <div className="flex flex-col gap-4 text-left">
                <div className="flex items-center justify-between">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">CURRENT JOB</Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Started: {new Date(activeSession.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-bold ">{activeSession.service_request?.title || "Active Job Session"}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase mt-1">
                        <MapPin className="h-3 w-3" /> {activeSession.service_request?.location?.location_name || "Location TBD"}
                    </div>
                </div>
                <div className="flex gap-2">
                      <Button 
                        onClick={handleStartWork}
                        className="flex-1 font-bold uppercase text-[10px] tracking-widest gap-2 bg-success hover:bg-success/90 h-10 shadow-lg shadow-success/10"
                      >
                          <Navigation className="h-3.5 w-3.5" /> Navigate
                      </Button>
                      <Button variant="outline" className="flex-1 font-bold uppercase text-[10px] tracking-widest gap-2 h-10 border-muted-foreground/20">
                          <Camera className="h-3.5 w-3.5" /> Add Photo
                      </Button>
                </div>
            </div>
        </Card>
      ) : (
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm font-medium">No active job session</p>
            <p className="text-xs text-muted-foreground">Select a task below to start</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Assigned Tasks ({isLoadingRequests ? "..." : requests.length})
              </h2>
              <Button variant="link" className="text-xs font-bold p-0">Service Log</Button>
          </div>

          {isLoadingRequests ? (
            <div className="text-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : requests && requests.length > 0 ? (
            requests.map((job) => (
              <Card key={job.id} className="border-none shadow-card ring-1 ring-border p-4 text-left group hover:ring-primary/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold ">{job.title || job.service?.service_name || "Service Request"}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{job.request_number}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] font-bold", 
                        job.priority === "urgent" ? "bg-critical/5 text-critical border-critical/20" : 
                        job.priority === "high" ? "bg-warning/5 text-warning border-warning/20" : ""
                      )}>
                        {job.priority}
                      </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {job.location?.location_name || "TBD"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase">
                          <Clock className="h-3 w-3" /> 
                          {job.scheduled_time ? new Date(job.scheduled_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "ASAP"}
                      </div>
                  </div>
              </Card>
            ))
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium">No pending tasks</p>
              <p className="text-xs">All tasks completed or no assignments</p>
            </div>
          )}
      </div>

      {/* Stock Alerts */}
      <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="bg-muted/5 border-b pb-3">
              <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock Alerts</CardTitle>
                  {alerts && alerts.filter(a => a.priority === "critical").length > 0 && (
                    <AlertCircle className="h-4 w-4 text-critical animate-pulse" />
                  )}
              </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingAlerts ? (
              <div className="text-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">{alert.product?.product_name || "Product"}</span>
                        <span className="text-[10px] text-muted-foreground">{alert.warehouse?.warehouse_name || "Warehouse"}</span>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                          "text-sm font-bold uppercase",
                          alert.priority === "critical" ? "text-critical" : 
                          alert.priority === "high" ? "text-warning" : "text-primary"
                        )}>
                          {alert.alert_type.replace("_", " ")}
                        </span>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Qty: {alert.current_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium">Stock levels good</p>
                <p className="text-xs">No reorder alerts</p>
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Camera,
  Play,
  Pause,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  QrCode,
  RefreshCw,
  User,
  Timer,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useJobSessions } from "@/hooks/useJobSessions";
import { JobSessionPanel } from "@/components/jobs";
import { QrScanner, QrScanResult } from "@/components/qr-codes";
import { PriorityBadge, RequestStatusBadge } from "@/components/assets/AssetStatusBadge";
import type { ServiceRequestWithDetails, QrScanResult as QrScanResultType } from "@/src/types/operations";

export default function ServiceBoyPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<QrScanResultType | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithDetails | null>(null);

  const { employeeId, fullName, isLoading: profileLoading, error: profileError } = useEmployeeProfile();

  const {
    requests,
    isLoading: requestsLoading,
    refresh: refreshRequests,
  } = useServiceRequests(
    employeeId ? { assignedTo: employeeId } : {}
  );

  const {
    activeSession,
    sessions,
    isLoading: sessionsLoading,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    refresh: refreshSessions,
  } = useJobSessions(undefined, employeeId || undefined);

  const isLoading = profileLoading || requestsLoading || sessionsLoading;

  // Separate assigned requests by status
  const openRequests = requests.filter((r) => r.status === "open" || r.status === "assigned");
  const inProgressRequests = requests.filter((r) => r.status === "in_progress");
  const completedToday = requests.filter((r) => {
    if (r.status !== "completed" || !r.completed_at) return false;
    const today = new Date().toDateString();
    return new Date(r.completed_at).toDateString() === today;
  });

  const handleScanComplete = (qrId: string) => {
    // In real app, this would scan and get asset info
    // For now, just close the scanner
    setShowScanner(false);
  };

  const handleStartJob = async (request: ServiceRequestWithDetails) => {
    if (!employeeId) return;

    // Get GPS coords
    let coords: { latitude?: number; longitude?: number } = {};
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (e) {
        console.warn("Could not get GPS location:", e);
      }
    }

    await startSession({
      serviceRequestId: request.id!, // View column can be null but in practice won't be
      technicianId: employeeId!, // Already validated in handleStartJob guard
      startLatitude: coords.latitude,
      startLongitude: coords.longitude,
    });

    refreshRequests();
    refreshSessions();
  };

  const handleRefresh = () => {
    refreshRequests();
    refreshSessions();
  };

  if (profileError) {
    return (
      <div className="max-w-md mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Profile Error</h2>
            <p className="text-muted-foreground">{profileError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col text-left">
          <h1 className="text-xl font-bold">Technician Portal</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {fullName || "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowScanner(true)}
            className="h-10 w-10"
          >
            <QrCode className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-10 w-10"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Active Job Session */}
      {activeSession && inProgressRequests.length > 0 ? (
        <Card className="border-none shadow-card ring-1 ring-border p-0 bg-muted/20 border-l-4 border-l-primary">
          <div className="flex flex-col text-left">
            <div className="flex items-center justify-between p-4 pb-0">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
                <Timer className="h-3 w-3 mr-1" />
                ACTIVE JOB
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {activeSession.status === "paused" ? "PAUSED" : "IN PROGRESS"}
              </span>
            </div>
            {/* Use JobSessionPanel with correct props */}
            <JobSessionPanel
              serviceRequest={inProgressRequests[0]}
              technicianId={employeeId || ""}
              onComplete={() => {
                refreshRequests();
                refreshSessions();
              }}
            />
          </div>
        </Card>
      ) : (
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-muted/10">
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <p className="text-sm font-medium">No active job session</p>
          </div>
        </Card>
      )}

      {/* Assigned Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Assigned Tasks ({openRequests.length})
          </h2>
          <Badge variant="outline" className="text-[10px]">
            {completedToday.length} Completed Today
          </Badge>
        </div>

        {isLoading && openRequests.length === 0 ? (
          <Card className="border-none shadow-card ring-1 ring-border p-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <p className="text-sm">Loading tasks...</p>
            </div>
          </Card>
        ) : openRequests.length === 0 ? (
          <Card className="border-none shadow-card ring-1 ring-border p-8">
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No pending tasks assigned</p>
            </div>
          </Card>
        ) : (
          openRequests.map((request) => (
            <Card
              key={request.id}
              className="border-none shadow-card ring-1 ring-border p-4 text-left group hover:ring-primary/40 transition-all cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold line-clamp-1">
                      {request.title || request.description?.slice(0, 40) || "Service Request"}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                      {request.request_number}
                    </span>
                  </div>
                </div>
                <PriorityBadge status={request.priority || "normal"} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {request.location_name || "No location"}
                </div>
                {request.scheduled_date && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase">
                    <Clock className="h-3 w-3" />
                    {new Date(request.scheduled_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              {!activeSession && (
                <Button
                  className="w-full mt-3 gap-2 font-bold uppercase text-[10px] tracking-widest"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartJob(request);
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Job
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      {/* In Progress Section */}
      {inProgressRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            In Progress ({inProgressRequests.length})
          </h2>
          {inProgressRequests.map((request) => (
            <Card
              key={request.id}
              className="border-none shadow-card ring-1 ring-amber-500/30 p-4 text-left bg-amber-500/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold">
                    {request.title || request.request_number}
                  </span>
                </div>
                <RequestStatusBadge status={request.status || "open"} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Asset QR Code</DialogTitle>
          </DialogHeader>
          <QrScanner
            onScan={handleScanComplete}
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title || "Service Request"}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RequestStatusBadge status={selectedRequest.status || "open"} />
                <PriorityBadge status={selectedRequest.priority || "normal"} />
              </div>
              <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Location</p>
                  <p>{selectedRequest.location_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Asset</p>
                  <p>{selectedRequest.asset_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Scheduled</p>
                  <p>
                    {selectedRequest.scheduled_date
                      ? new Date(selectedRequest.scheduled_date).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Service</p>
                  <p>{selectedRequest.service_name || "General"}</p>
                </div>
              </div>
              {!activeSession && (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    handleStartJob(selectedRequest);
                    setSelectedRequest(null);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Start This Job
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

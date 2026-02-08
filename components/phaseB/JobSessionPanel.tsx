"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  Camera,
  Package,
  MapPin,
  X,
  Loader2,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useJobSessions } from "@/hooks/useJobSessions";
import { useJobPhotos } from "@/hooks/useJobPhotos";
import type { ServiceRequestWithDetails } from "@/src/types/phaseB";
import {
  JOB_SESSION_STATUS_LABELS,
  JOB_SESSION_STATUS_COLORS,
  JOB_PHOTO_TYPES,
} from "@/src/lib/constants";

interface JobSessionPanelProps {
  serviceRequest: ServiceRequestWithDetails;
  technicianId: string;
  onComplete?: () => void;
  onClose?: () => void;
}

export function JobSessionPanel({
  serviceRequest,
  technicianId,
  onComplete,
  onClose,
}: JobSessionPanelProps) {
  const serviceRequestId = serviceRequest.id || undefined;
  
  const {
    activeSession,
    isLoading,
    error,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    refresh,
  } = useJobSessions(serviceRequestId, technicianId);

  const {
    photos,
    isUploading,
    fetchPhotos,
    uploadPhoto,
    deletePhoto,
  } = useJobPhotos();

  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch photos when session is active
  useEffect(() => {
    if (activeSession?.id) {
      fetchPhotos(activeSession.id);
    }
  }, [activeSession?.id, fetchPhotos]);

  // Timer for job duration
  useEffect(() => {
    if (activeSession?.status === "started" && activeSession.start_time) {
      const startTime = new Date(activeSession.start_time).getTime();

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession?.status, activeSession?.start_time]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle start job
  const handleStart = async () => {
    if (!serviceRequest.id) {
      alert("Invalid service request");
      return;
    }
    const result = await startSession({
      serviceRequestId: serviceRequest.id,
      technicianId: technicianId,
    });

    if (!result.success) {
      alert(result.error || "Failed to start job");
    }
  };

  // Handle pause
  const handlePause = async () => {
    if (!activeSession) return;
    await pauseSession(activeSession.id);
  };

  // Handle resume
  const handleResume = async () => {
    if (!activeSession) return;
    await resumeSession(activeSession.id);
  };

  // Handle complete
  const handleComplete = async () => {
    if (!activeSession) return;
    setIsCompleting(true);

    const result = await completeSession(activeSession.id, {
      workPerformed: completionNotes || "Completed",
      remarks: undefined,
    });

    if (result.success) {
      onComplete?.();
    } else {
      alert(result.error || "Failed to complete job");
    }

    setIsCompleting(false);
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!activeSession) return;
    if (confirm("Are you sure you want to cancel this job?")) {
      await cancelSession(activeSession.id);
      onClose?.();
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (photoType: string, file: File) => {
    if (!activeSession) return;

    await uploadPhoto(
      {
        jobSessionId: activeSession.id,
        photoType: photoType as "before" | "during" | "after",
        photoUrl: "", // Will be set by upload
      },
      file
    );
  };

  // Photo input ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<string>("");

  const triggerPhotoUpload = (type: string) => {
    setSelectedPhotoType(type);
    photoInputRef.current?.click();
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPhotoType) {
      handlePhotoUpload(selectedPhotoType, file);
    }
    e.target.value = "";
  };

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Job Session
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Service Request Info */}
        <div className="p-4 rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{serviceRequest.request_number}</Badge>
            {activeSession && (
              <Badge
                style={{
                  backgroundColor: `${JOB_SESSION_STATUS_COLORS[activeSession.status || "started"]}20`,
                  color: JOB_SESSION_STATUS_COLORS[activeSession.status || "started"],
                }}
              >
                {JOB_SESSION_STATUS_LABELS[activeSession.status || "started"]}
              </Badge>
            )}
          </div>
          <p className="font-semibold">
            {serviceRequest.title || serviceRequest.service_name || "Service Request"}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {serviceRequest.asset_name && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {serviceRequest.asset_name}
              </span>
            )}
            {serviceRequest.location_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {serviceRequest.location_name}
              </span>
            )}
          </div>
        </div>

        {/* Timer Display */}
        {activeSession && activeSession.status === "started" && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Job Duration
            </p>
            <p className="text-5xl font-mono font-bold text-primary">
              {formatElapsedTime(elapsedTime)}
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={refresh} className="ml-2">
              Retry
            </Button>
          </div>
        )}

        {/* Controls */}
        {!isLoading && (
          <div className="space-y-4">
            {/* No active session - Start button */}
            {!activeSession && (
              <Button
                className="w-full h-14 text-lg gap-2 bg-success hover:bg-success/90"
                onClick={handleStart}
              >
                <Play className="h-6 w-6" />
                Start Job
              </Button>
            )}

            {/* Active session controls */}
            {activeSession && activeSession.status === "started" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12 gap-2"
                  onClick={handlePause}
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </Button>
                <Button
                  className="h-12 gap-2 bg-success hover:bg-success/90"
                  onClick={() => document.getElementById("completion-section")?.scrollIntoView()}
                >
                  <CheckCircle className="h-5 w-5" />
                  Complete
                </Button>
              </div>
            )}

            {/* Paused session */}
            {activeSession && activeSession.status === "paused" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-12 gap-2"
                  onClick={handleResume}
                >
                  <Play className="h-5 w-5" />
                  Resume
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 gap-2"
                  onClick={handleCancel}
                >
                  <XCircle className="h-5 w-5" />
                  Cancel
                </Button>
              </div>
            )}

            {/* Photo Capture Section */}
            {activeSession && (activeSession.status === "started" || activeSession.status === "paused") && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Capture Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(JOB_PHOTO_TYPES).map(([key, value]) => {
                    const typePhotos = photos.filter((p) => p.photo_type === value);
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="h-20 flex-col gap-1 relative"
                        onClick={() => triggerPhotoUpload(value)}
                        disabled={isUploading}
                      >
                        {typePhotos.length > 0 ? (
                          <ImageIcon className="h-6 w-6 text-success" />
                        ) : (
                          <Camera className="h-6 w-6" />
                        )}
                        <span className="text-xs capitalize">{value}</span>
                        {typePhotos.length > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                            {typePhotos.length}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onFileSelect}
                  className="hidden"
                />
                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading photo...
                  </div>
                )}
              </div>
            )}

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Captured Photos ({photos.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.photo_type || "Job photo"}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5"
                        onClick={() => deletePhoto(photo.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Section */}
            {activeSession && (activeSession.status === "started" || activeSession.status === "paused") && (
              <div id="completion-section" className="space-y-3 pt-4 border-t">
                <Label htmlFor="notes">Work Performed Notes</Label>
                <Textarea
                  id="notes"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Describe the work completed, parts replaced, etc."
                  rows={3}
                />
                <Button
                  className="w-full h-12 gap-2 bg-success hover:bg-success/90"
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  Complete Job
                </Button>
              </div>
            )}

            {/* Completed Session Summary */}
            {activeSession && activeSession.status === "completed" && (
              <div className="p-4 rounded-lg bg-success/10 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-success" />
                <h3 className="font-bold mt-2 text-success">Job Completed</h3>
                {activeSession.work_performed && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {activeSession.work_performed}
                  </p>
                )}
                {activeSession.end_time && activeSession.start_time && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Duration:{" "}
                    {formatElapsedTime(
                      Math.floor(
                        (new Date(activeSession.end_time).getTime() -
                          new Date(activeSession.start_time).getTime()) /
                          1000
                      )
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

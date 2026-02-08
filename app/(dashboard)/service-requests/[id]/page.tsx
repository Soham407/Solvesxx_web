"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ClipboardList,
  MapPin,
  Calendar,
  User,
  Clock,
  Package,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  XCircle,
  Building,
  Phone,
  Edit,
  Image as ImageIcon,
  ChevronRight,
  Timer,
  Camera,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useJobSessions } from "@/hooks/useJobSessions";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { JobSessionPanel } from "@/components/phaseB";
import type { ServiceRequestWithDetails, JobSessionWithPhotos } from "@/src/types/phaseB";
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_COLORS,
  SERVICE_PRIORITY_LABELS,
  SERVICE_PRIORITY_COLORS,
  JOB_SESSION_STATUS_LABELS,
  JOB_SESSION_STATUS_COLORS,
} from "@/src/lib/constants";

// Detail row component
function DetailRow({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-3 py-3 border-b border-border/50 last:border-0", className)}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// Timeline item component
function TimelineItem({
  title,
  description,
  timestamp,
  icon: Icon,
  iconColor = "text-muted-foreground",
  isLast = false,
}: {
  title: string;
  description?: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center bg-muted", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px h-full bg-border flex-1 my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
      </div>
    </div>
  );
}

export default function ServiceRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<ServiceRequestWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { getRequestById, assignRequest, completeRequest, cancelRequest, refresh } = useServiceRequests();
  const { sessions, isLoading: isSessionsLoading, refresh: refreshSessions } = useJobSessions(requestId);
  const { employeeId, fullName: currentUserName } = useEmployeeProfile();

  // Fetch request details
  useEffect(() => {
    async function fetchRequest() {
      if (!requestId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await getRequestById(requestId);
        if (result) {
          setRequest(result);
        } else {
          setError("Service request not found");
        }
      } catch (err) {
        setError("Failed to load request details");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequest();
  }, [requestId]);

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration
  const formatDuration = (startTime: string | null, endTime: string | null | undefined) => {
    if (!startTime) return "N/A";
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Handle status actions
  const handleComplete = async () => {
    if (!request?.id) return;
    try {
      await completeRequest(request.id);
      refresh();
      const updated = await getRequestById(requestId);
      if (updated) setRequest(updated);
    } catch (err) {
      console.error("Failed to complete request:", err);
    }
  };

  const handleCancel = async () => {
    if (!request?.id) return;
    if (!confirm("Are you sure you want to cancel this request?")) return;
    try {
      await cancelRequest(request.id);
      refresh();
      const updated = await getRequestById(requestId);
      if (updated) setRequest(updated);
    } catch (err) {
      console.error("Failed to cancel request:", err);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "cancelled":
        return XCircle;
      case "in_progress":
        return Play;
      case "on_hold":
        return Pause;
      default:
        return Clock;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !request) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive/50" />
          <h2 className="mt-4 text-lg font-semibold">Request Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error || "The requested service request could not be found."}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/service-requests")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(request.status || "open");
  const statusColor = SERVICE_REQUEST_STATUS_COLORS[request.status || "open"];
  const priorityColor = SERVICE_PRIORITY_COLORS[request.priority || "normal"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/service-requests")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="font-mono">{request.request_number}</Badge>
              <Badge
                variant="outline"
                style={{ borderColor: statusColor, color: statusColor }}
              >
                {SERVICE_REQUEST_STATUS_LABELS[request.status || "open"]}
              </Badge>
              <Badge
                variant="outline"
                style={{ borderColor: priorityColor, color: priorityColor }}
              >
                {SERVICE_PRIORITY_LABELS[request.priority || "normal"]} Priority
              </Badge>
            </div>
            <h1 className="text-xl font-bold mt-2">{request.title || "Service Request"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.status !== "completed" && request.status !== "cancelled" && (
            <>
              {employeeId && (
                <Button variant="outline" size="sm" onClick={() => setShowJobPanel(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Job
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleCancel}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2">
                <Timer className="h-4 w-4" />
                Job Sessions
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <DetailRow label="Request Number" value={request.request_number} icon={ClipboardList} />
                  <DetailRow label="Title" value={request.title} />
                  <div className="py-3 border-b border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{request.description}</p>
                  </div>
                  <DetailRow label="Service Type" value={request.service_name} icon={Wrench} />
                  <DetailRow label="Priority" value={SERVICE_PRIORITY_LABELS[request.priority || "normal"]} icon={AlertTriangle} />
                  <DetailRow label="Created" value={formatDateTime(request.created_at)} icon={Calendar} />
                  {request.scheduled_date && (
                    <DetailRow
                      label="Scheduled"
                      value={`${formatDate(request.scheduled_date)}${request.scheduled_time ? ` at ${request.scheduled_time}` : ""}`}
                      icon={Calendar}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Location & Asset
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <DetailRow label="Location" value={request.location_name} icon={MapPin} />
                  {request.asset_name && (
                    <div
                      className="flex items-start gap-3 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 -mx-4 px-4"
                      onClick={() => request.asset_id && router.push(`/assets/${request.asset_id}`)}
                    >
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Related Asset</p>
                        <p className="text-sm font-medium mt-0.5 text-primary">{request.asset_name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  {request.requester_phone && (
                    <DetailRow label="Contact Phone" value={request.requester_phone} icon={Phone} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Job Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Job Sessions
                    </CardTitle>
                    <Badge variant="outline">{sessions.length} sessions</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isSessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-8">
                      <Timer className="h-12 w-12 mx-auto text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">No job sessions recorded</p>
                      {employeeId && request.status !== "completed" && request.status !== "cancelled" && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowJobPanel(true)}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Job Session
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sessions.map((session: JobSessionWithPhotos) => (
                        <div
                          key={session.id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {session.technicianName?.substring(0, 2).toUpperCase() || "T"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{session.technicianName || "Technician"}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(session.start_time)}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: JOB_SESSION_STATUS_COLORS[session.status || "started"],
                                color: JOB_SESSION_STATUS_COLORS[session.status || "started"],
                              }}
                            >
                              {JOB_SESSION_STATUS_LABELS[session.status || "started"]}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="font-medium">{formatDuration(session.start_time, session.end_time)}</p>
                            </div>
                            {session.photos && session.photos.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Photos</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Camera className="h-3 w-3" />
                                  {session.photos.length} photos
                                </p>
                              </div>
                            )}
                          </div>

                          {session.work_performed && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground">Work Performed</p>
                              <p className="text-sm mt-1">{session.work_performed}</p>
                            </div>
                          )}

                          {/* Session Photos */}
                          {session.photos && session.photos.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Session Photos</p>
                              <div className="flex gap-2 overflow-x-auto">
                                {session.photos.map((photo: any) => (
                                  <div
                                    key={photo.id}
                                    className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden"
                                  >
                                    {photo.photo_url ? (
                                      <img
                                        src={photo.photo_url}
                                        alt={photo.photo_type || "Photo"}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card className="border-none shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {/* Build timeline from request and sessions */}
                    <TimelineItem
                      title="Request Created"
                      description={`Request ${request.request_number} was created`}
                      timestamp={formatDateTime(request.created_at)}
                      icon={ClipboardList}
                      iconColor="text-blue-500"
                    />

                    {request.assigned_to && (
                      <TimelineItem
                        title="Assigned to Technician"
                        description={`Assigned to ${request.technician_name || "technician"}`}
                        timestamp={formatDateTime(request.updated_at)}
                        icon={User}
                        iconColor="text-purple-500"
                      />
                    )}

                    {sessions.map((session: JobSessionWithPhotos, index: number) => (
                      <TimelineItem
                        key={session.id}
                        title={`Job Session ${session.status === "completed" ? "Completed" : "Started"}`}
                        description={session.work_performed || `Session by ${session.technicianName}`}
                        timestamp={formatDateTime(session.status === "completed" ? session.end_time : session.start_time)}
                        icon={session.status === "completed" ? CheckCircle : Play}
                        iconColor={session.status === "completed" ? "text-success" : "text-amber-500"}
                      />
                    ))}

                    {request.status === "completed" && (
                      <TimelineItem
                        title="Request Completed"
                        description={request.resolution_notes || "Request was marked as completed"}
                        timestamp={formatDateTime(request.completed_at || request.updated_at)}
                        icon={CheckCircle}
                        iconColor="text-success"
                        isLast
                      />
                    )}

                    {request.status === "cancelled" && (
                      <TimelineItem
                        title="Request Cancelled"
                        timestamp={formatDateTime(request.updated_at)}
                        icon={XCircle}
                        iconColor="text-destructive"
                        isLast
                      />
                    )}

                    {request.status !== "completed" && request.status !== "cancelled" && (
                      <TimelineItem
                        title="In Progress"
                        description="Waiting for completion"
                        timestamp="Current"
                        icon={Clock}
                        iconColor="text-muted-foreground"
                        isLast
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Assignment Card */}
          <Card className="border-none shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.technician_name ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {request.technician_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.technician_name}</p>
                    <p className="text-xs text-muted-foreground">Assigned Technician</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">Not assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Card className="border-none shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  style={{ borderColor: statusColor, color: statusColor }}
                >
                  {SERVICE_REQUEST_STATUS_LABELS[request.status || "open"]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Badge
                  variant="outline"
                  style={{ borderColor: priorityColor, color: priorityColor }}
                >
                  {SERVICE_PRIORITY_LABELS[request.priority || "normal"]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="text-sm font-medium">{sessions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Age</span>
                <span className="text-sm font-medium">
                  {request.created_at
                    ? `${Math.floor((Date.now() - new Date(request.created_at).getTime()) / 86400000)} days`
                    : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {request.status !== "completed" && request.status !== "cancelled" && (
            <Card className="border-none shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {employeeId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowJobPanel(true)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Job Session
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-success"
                  onClick={handleComplete}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive"
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Job Session Panel Dialog */}
      <Dialog open={showJobPanel} onOpenChange={setShowJobPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Session</DialogTitle>
          </DialogHeader>
          {employeeId && (
            <JobSessionPanel
              serviceRequest={request}
              technicianId={employeeId}
              onComplete={() => {
                setShowJobPanel(false);
                refreshSessions();
                getRequestById(requestId).then(setRequest);
              }}
              onClose={() => setShowJobPanel(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

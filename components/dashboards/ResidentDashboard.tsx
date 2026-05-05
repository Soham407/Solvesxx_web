"use client";

import { useEffect, useState } from "react";

import { Home, Users, UserPlus, Clock, Loader2, RefreshCw, AlertCircle, Wrench } from "lucide-react";

import { ResidentAnnouncementsSection } from "@/components/dashboards/ResidentAnnouncementsSection";
import { ResidentOverviewSection } from "@/components/dashboards/ResidentOverviewSection";
import { ResidentPendingApprovalsSection } from "@/components/dashboards/ResidentPendingApprovalsSection";
import { ResidentVisitorsSection } from "@/components/dashboards/ResidentVisitorsSection";
import { DashboardKPIGrid, type KPIItem } from "@/components/shared/DashboardKPIGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyEvents } from "@/hooks/useCompanyEvents";
import { useResident } from "@/hooks/useResident";
import { useResidentProfile } from "@/hooks/useResidentProfile";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useVisitors } from "@/hooks/useVisitors";
import { ResidentDenyVisitorDialog } from "@/components/dashboards/ResidentDenyVisitorDialog";

export function ResidentDashboard() {
  const { isLoading: isAuthLoading, userId } = useAuth();

  const { residentId, fullName, isLoading: isProfileLoading, error: profileError } = useResidentProfile();

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (!residentId || !userId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-center text-sm text-muted-foreground">
          {profileError || "Please log in to access the Resident Dashboard."}
        </p>
        <a href="/login" className="text-sm font-medium text-primary hover:underline">
          Go to Login →
        </a>
      </div>
    );
  }

  return <ResidentDashboardContent residentId={residentId} authUserId={userId} residentName={fullName} />;
}

function ResidentDashboardContent({
  residentId,
  authUserId,
  residentName,
}: {
  residentId: string;
  authUserId: string;
  residentName: string | null;
}) {
  const { toast } = useToast();

  const {
    resident,
    pendingApprovals,
    activeResidents,
    isLoading: isResidentLoading,
    error: residentError,
    isLiveSyncConnected,
    inviteVisitor,
    approveVisitor: approveVisitorAction,
    denyVisitor: denyVisitorAction,
    refresh: refreshResident,
  } = useResident(residentId, {
    authUserId,
    displayName: residentName,
  });

  const flatId = resident?.flat?.id;
  const { visitors, isLoading: isLoadingVisitors, refresh: refreshVisitors } = useVisitors(
    flatId ? { flatId } : undefined,
  );

  const { requests, isLoading: isLoadingRequests, createRequest, refresh: refreshRequests } = useServiceRequests(
    authUserId ? { requesterId: authUserId } : undefined,
  );
  const { events } = useCompanyEvents();

  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  const [denyDialogVisitorId, setDenyDialogVisitorId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const activeVisitorsCount = visitors.filter(
    (visitor) => visitor.entry_time && visitor.entry_time.startsWith(today) && !visitor.exit_time,
  ).length;
  const pendingApprovalsCount = pendingApprovals.length;
  const openRequestsCount = requests.filter((request) => request.status !== "completed" && request.status !== "cancelled").length;
  const upcomingVisitorsCount = visitors.filter((visitor) => !visitor.entry_time && visitor.approved_by_resident === true).length;

  const kpis: KPIItem[] = [
    {
      label: "Active Visitors",
      value: activeVisitorsCount,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: "Currently in building",
    },
    {
      label: "Pending Approvals",
      value: pendingApprovalsCount,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      sub: "Waiting for you",
    },
    {
      label: "My Service Requests",
      value: openRequestsCount,
      icon: Wrench,
      color: "text-info",
      bg: "bg-info/10",
      sub: "Active requests",
    },
    {
      label: "Upcoming Visitors",
      value: upcomingVisitorsCount,
      icon: UserPlus,
      color: "text-success",
      bg: "bg-success/10",
      sub: "Pre-registered",
    },
  ];

  useEffect(() => {
    if (!denyDialogVisitorId) {
      return;
    }

    const visitorStillPending = pendingApprovals.some((visitor) => visitor.id === denyDialogVisitorId);

    if (!visitorStillPending) {
      setDenyDialogVisitorId(null);
      setDenyReason("");
      toast({
        title: "Queue updated",
        description: "This visitor was already handled from another resident session.",
      });
    }
  }, [denyDialogVisitorId, pendingApprovals, toast]);

  const handleApprove = async (visitorId: string) => {
    setIsProcessingApproval(visitorId);
    const result = await approveVisitorAction(visitorId);
    setIsProcessingApproval(null);

    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Entry Approved", description: "The guard has been notified." });
    refreshVisitors();
  };

  const handleDeny = async (visitorId: string, reason: string) => {
    setIsProcessingApproval(visitorId);
    const result = await denyVisitorAction(visitorId, reason);
    setIsProcessingApproval(null);

    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Entry Denied", description: "The guard has been notified." });
    refreshVisitors();
    setDenyDialogVisitorId(null);
    setDenyReason("");
  };

  const refreshAll = () => {
    refreshResident();
    refreshVisitors();
    refreshRequests();
  };

  if (isResidentLoading && !resident) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (residentError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md border-critical/20 bg-critical/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-critical" />
            <h3 className="mb-2 text-lg font-bold text-critical">Unable to Load</h3>
            <p className="mb-4 text-sm text-muted-foreground">{residentError}</p>
            <Button onClick={refreshAll} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeResidentsLabel = activeResidents.length
    ? `${activeResidents.map((residentMember) => residentMember.fullName).join(", ")} ${
        activeResidents.length === 1 ? "is" : "are"
      } also active for this flat.`
    : "You are the only active resident session for this flat right now.";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {resident?.full_name?.split(" ")[0] || "Resident"}</h1>
          <p className="text-sm text-muted-foreground">Manage your flat and visitor access</p>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshAll} aria-label="Refresh dashboard">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <DashboardKPIGrid kpis={kpis} isLoading={isLoadingVisitors || isLoadingRequests} />

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">
              {isLiveSyncConnected ? "Live queue sync active" : "Live queue sync reconnecting"}
            </p>
            <p className="text-xs text-muted-foreground">{activeResidentsLabel}</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase">
            {activeResidents.length} collaborator{activeResidents.length === 1 ? "" : "s"}
          </Badge>
        </CardContent>
      </Card>

      <ResidentPendingApprovalsSection
        pendingApprovals={pendingApprovals}
        isProcessingApproval={isProcessingApproval}
        onApprove={handleApprove}
        onDeny={(visitorId) => {
          setDenyDialogVisitorId(visitorId);
          setDenyReason("");
        }}
      />

      <ResidentOverviewSection
        resident={resident}
        activeResidents={activeResidents}
        isLiveSyncConnected={isLiveSyncConnected}
        onRefresh={refreshAll}
        onInviteVisitor={inviteVisitor}
        onCreateRequest={createRequest}
      />

      <ResidentVisitorsSection visitors={visitors} isLoading={isLoadingVisitors} onRefresh={refreshVisitors} />
      <ResidentAnnouncementsSection events={events} />

      <ResidentDenyVisitorDialog
        open={Boolean(denyDialogVisitorId)}
        denyReason={denyReason}
        isProcessing={isProcessingApproval === denyDialogVisitorId}
        onReasonChange={setDenyReason}
        onClose={() => {
          setDenyDialogVisitorId(null);
          setDenyReason("");
        }}
        onConfirm={() => {
          if (denyDialogVisitorId) {
            handleDeny(denyDialogVisitorId, denyReason.trim() || "Security policy");
          }
        }}
      />
    </div>
  );
}

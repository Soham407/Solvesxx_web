"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Home,
  Users,
  UserPlus,
  Clock,
  Building,
  Phone,
  Mail,
  Calendar,
  Car,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Bell,
  AlertCircle,
  Star,
  Shield,
  Wrench,
  Megaphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useResident } from "@/hooks/useResident";
import { useResidentProfile } from "@/hooks/useResidentProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useCompanyEvents } from "@/hooks/useCompanyEvents";
import { useVisitors, Visitor } from "@/hooks/useVisitors";
import { DashboardKPIGrid, KPIItem } from "@/components/shared/DashboardKPIGrid";
import { DataTable } from "@/components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { VisitorAvatar } from "@/components/society/VisitorAvatar";
import type { ServicePriority } from "@/src/types/operations";

interface InviteFormData {
  visitor_name: string;
  visitor_type: string;
  phone: string;
  purpose: string;
  vehicle_number: string;
}

const initialFormData: InviteFormData = {
  visitor_name: "",
  visitor_type: "guest",
  phone: "",
  purpose: "",
  vehicle_number: "",
};

// Helper: Format date for display
const formatDate = (isoString: string | null) => {
  if (!isoString) return "Pending";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper: Get visitor type badge color
const getVisitorTypeBadge = (type: string | null) => {
  switch (type) {
    case "guest":
      return "bg-info/10 text-info border-info/20";
    case "vendor":
      return "bg-warning/10 text-warning border-warning/20";
    case "contractor":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "service_staff":
    case "daily_helper":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ResidentDashboard() {
  const { isLoading: isAuthLoading } = useAuth();
  
  // Get authenticated resident profile
  const { 
    residentId, 
    isLoading: isProfileLoading, 
    error: profileError 
  } = useResidentProfile();

  // Show loading while auth/profile is being fetched
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!residentId) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Home className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-sm text-muted-foreground text-center">
          {profileError || "Please log in to access the Resident Dashboard."}
        </p>
        <a href="/login" className="text-sm text-primary hover:underline font-medium">
          Go to Login →
        </a>
      </div>
    );
  }

  return <ResidentDashboardContent residentId={residentId} />;
}

function ResidentDashboardContent({ residentId }: { residentId: string }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // 1. Core resident data (for profile and actions)
  const {
    resident,
    isLoading: isResidentLoading,
    error: residentError,
    inviteVisitor,
    approveVisitor: approveVisitorAction,
    denyVisitor: denyVisitorAction,
    toggleFrequentVisitor,
    refresh: refreshResident,
  } = useResident(residentId);

  // 2. Visitor data (filtered by flat)
  const flatId = resident?.flat?.id;
  const { 
    visitors, 
    isLoading: isLoadingVisitors, 
    refresh: refreshVisitors 
  } = useVisitors(flatId ? { flatId } : undefined);

  // 3. Service Request data (raised by this resident)
  const { 
    requests, 
    isLoading: isLoadingRequests, 
    createRequest,
    refresh: refreshRequests 
  } = useServiceRequests({ requesterId: residentId });

  const { notifications, isLoading: isNotifLoading, markAsRead, markAllRead } = useNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const { events } = useCompanyEvents();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [complaintPriority, setComplaintPriority] = useState<ServicePriority>("normal");
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);

  // Filter for pending visitor approvals (currently at gate)
  const pendingApprovals = visitors.filter(v => v.approved_by_resident === null && v.entry_time !== null);

  // KPI Calculations
  const today = new Date().toISOString().split("T")[0];
  const activeVisitorsCount = visitors.filter(v => v.entry_time && v.entry_time.startsWith(today) && !v.exit_time).length;
  const pendingApprovalsCount = pendingApprovals.length;
  const openRequestsCount = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
  const upcomingVisitorsCount = visitors.filter(v => !v.entry_time && v.approved_by_resident === true).length;

  const kpis: KPIItem[] = [
    {
      label: "Active Visitors",
      value: activeVisitorsCount,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: "Currently in building"
    },
    {
      label: "Pending Approvals",
      value: pendingApprovalsCount,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
      sub: "Waiting for you"
    },
    {
      label: "My Service Requests",
      value: openRequestsCount,
      icon: Wrench,
      color: "text-info",
      bg: "bg-info/10",
      sub: "Active requests"
    },
    {
      label: "Upcoming Visitors",
      value: upcomingVisitorsCount,
      icon: UserPlus,
      color: "text-success",
      bg: "bg-success/10",
      sub: "Pre-registered"
    }
  ];

  // DataTable Columns
  const visitorColumns: ColumnDef<Visitor>[] = [
    {
      accessorKey: "visitor_name",
      header: "Visitor",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <VisitorAvatar photoUrl={row.original.photo_url} name={row.original.visitor_name} className="h-8 w-8" />
          <span className="font-bold">{row.original.visitor_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "visitor_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", getVisitorTypeBadge(row.original.visitor_type))}>
          {row.original.visitor_type?.replace("_", " ") || "Guest"}
        </Badge>
      ),
    },
    {
      accessorKey: "entry_time",
      header: "Entry Time",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.entry_time)}</span>,
    },
    {
      accessorKey: "vehicle_number",
      header: "Vehicle",
      cell: ({ row }) => <span className="text-xs">{row.original.vehicle_number || "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const v = row.original;
        if (v.exit_time) return <Badge variant="outline" className="text-[10px] bg-muted font-bold">EXITED</Badge>;
        if (v.entry_time && v.approved_by_resident === true) return <Badge variant="success" className="text-[10px] font-bold">INSIDE</Badge>;
        if (v.entry_time && v.approved_by_resident === false) return <Badge variant="destructive" className="text-[10px] font-bold">DENIED</Badge>;
        return <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 font-bold">PRE-APPROVED</Badge>;
      }
    }
  ];

  // Announcements logic
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.status === "Scheduled" && e.event_date >= today)
      .slice(0, 3);
  }, [events, today]);

  const handleComplaintSubmit = async () => {
    if (!complaintTitle.trim() || !complaintDesc.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setIsSubmittingComplaint(true);
    const result = await createRequest({
      title: complaintTitle.trim(),
      description: complaintDesc.trim(),
      priority: complaintPriority,
      requester_id: residentId,
    } as any);
    setIsSubmittingComplaint(false);
    if (result.success) {
      toast({ title: "Complaint Raised", description: "Your complaint has been submitted successfully." });
      setComplaintTitle("");
      setComplaintDesc("");
      setComplaintPriority("normal");
      setIsComplaintOpen(false);
      refreshRequests();
    } else {
      toast({ title: "Failed", description: result.error || "Could not submit complaint.", variant: "destructive" });
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  useEffect(() => {
    if (searchParams.get("action") === "invite") {
      setIsInviteDialogOpen(true);
    }
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<InviteFormData>>({});

  const validateForm = (): boolean => {
    const errors: Partial<InviteFormData> = {};
    if (!formData.visitor_name.trim()) errors.visitor_name = "Visitor name is required";
    if (!formData.visitor_type) errors.visitor_type = "Visitor type is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const result = await inviteVisitor({
      visitor_name: formData.visitor_name.trim(),
      visitor_type: formData.visitor_type,
      phone: formData.phone.trim() || undefined,
      purpose: formData.purpose.trim() || undefined,
      vehicle_number: formData.vehicle_number.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Visitor Invited", description: `${formData.visitor_name} has been pre-approved for entry.` });
      setFormData(initialFormData);
      setIsInviteDialogOpen(false);
      refreshVisitors();
    } else {
      toast({ title: "Failed to Invite", description: result.error || "An error occurred.", variant: "destructive" });
    }
  };

  const handleApprove = async (visitorId: string) => {
    setIsProcessingApproval(visitorId);
    const result = await approveVisitorAction(visitorId);
    setIsProcessingApproval(null);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Entry Approved", description: "The guard has been notified." });
      refreshVisitors();
    }
  };

  const handleDeny = async (visitorId: string) => {
    const reason = window.prompt("Enter rejection reason (optional):") || "Security policy";
    setIsProcessingApproval(visitorId);
    const result = await denyVisitorAction(visitorId, reason);
    setIsProcessingApproval(null);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Entry Denied", description: "The guard has been notified." });
      refreshVisitors();
    }
  };

  const refreshAll = () => {
    refreshResident();
    refreshVisitors();
    refreshRequests();
  };

  if (isResidentLoading && !resident) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (residentError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-critical/20 bg-critical/5 max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-critical mx-auto mb-4" />
            <h3 className="text-lg font-bold text-critical mb-2">Unable to Load</h3>
            <p className="text-sm text-muted-foreground mb-4">{residentError}</p>
            <Button onClick={refreshAll} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {resident?.full_name?.split(" ")[0] || "Resident"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your flat and visitor access
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshAll} aria-label="Refresh dashboard">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Cards */}
      <DashboardKPIGrid kpis={kpis} isLoading={isLoadingVisitors || isLoadingRequests} />

      {/* 🚨 PENDING APPROVALS ALERT area */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 px-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-critical"></span>
            </span>
            <h2 className="text-sm font-black uppercase tracking-widest text-critical">Action Required: Visitor at Gate</h2>
          </div>
          
          <div className="grid gap-4">
            {pendingApprovals.map(visitor => (
              <Card key={visitor.id} className="border-none shadow-premium ring-2 ring-critical/20 overflow-hidden bg-critical/5">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                  <VisitorAvatar
                    photoUrl={visitor.photo_url}
                    name={visitor.visitor_name}
                    className="h-20 w-20 rounded-xl shadow-md ring-2 ring-white flex-shrink-0"
                  />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{visitor.visitor_name}</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                       {visitor.visitor_type} • {visitor.purpose || "Meeting Request"}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-muted-foreground/80 font-bold">
                      <span className="flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" /> {formatDate(visitor.entry_time)}
                      </span>
                      {visitor.vehicle_number && (
                        <span className="flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded">
                          <Car className="h-3 w-3" /> {visitor.vehicle_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-none border-critical text-critical hover:bg-critical/10 font-bold uppercase text-[10px]"
                      onClick={() => handleDeny(visitor.id)}
                      disabled={isProcessingApproval === visitor.id}
                    >
                      {isProcessingApproval === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Deny
                    </Button>
                    <Button 
                      className="flex-1 sm:flex-none bg-success hover:bg-success/90 shadow-lg shadow-success/20 font-bold uppercase text-[10px]"
                      onClick={() => handleApprove(visitor.id)}
                      disabled={isProcessingApproval === visitor.id}
                    >
                      {isProcessingApproval === visitor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Confirm Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Flat Details & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Flat Details Card */}
        <Card className="md:col-span-2 border-none shadow-card ring-1 ring-border overflow-hidden">
          <CardHeader className="pb-3 border-b bg-linear-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                My Flat
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold">
                {resident?.relation?.toUpperCase() || "RESIDENT"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Flat</span>
                <p className="text-lg font-bold">{resident?.flat?.flat_number || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Building</span>
                <p className="text-lg font-bold">{resident?.flat?.building?.building_name || "N/A"}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
              {resident?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{resident.phone}</span>
                </div>
              )}
              {resident?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{resident.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="space-y-4">
          {/* Invite Visitor Button */}
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start h-14 text-left shadow-card ring-1 ring-border bg-card hover:bg-muted/30 text-foreground group" variant="ghost">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-sm">Invite Visitor</div>
                  <div className="text-[10px] text-muted-foreground">Pre-approve entry</div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Invite a Visitor
                </DialogTitle>
                <DialogDescription>
                  Pre-approve a visitor for entry. The guard will be notified.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="visitor_name">Visitor Name <span className="text-critical">*</span></Label>
                  <Input id="visitor_name" placeholder="Full name" value={formData.visitor_name} onChange={e => setFormData({ ...formData, visitor_name: e.target.value })} className={formErrors.visitor_name ? "border-critical" : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitor_type">Visitor Type <span className="text-critical">*</span></Label>
                  <Select value={formData.visitor_type} onValueChange={value => setFormData({ ...formData, visitor_type: value })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="vendor">Vendor / Delivery</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="service_staff">Service Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+91" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleInviteSubmit} disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Raise Complaint Button */}
          <Dialog open={isComplaintOpen} onOpenChange={setIsComplaintOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start h-14 text-left shadow-card ring-1 ring-border bg-card hover:bg-muted/30 text-foreground group" variant="ghost">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mr-3 group-hover:bg-warning/20 transition-colors">
                  <Wrench className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <div className="font-bold text-sm">Raise Request</div>
                  <div className="text-[10px] text-muted-foreground">Report an issue</div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-warning" />
                  Raise a Service Request
                </DialogTitle>
                <DialogDescription>Describe the issue or service needed.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="complaint_title">Title <span className="text-critical">*</span></Label>
                  <Input id="complaint_title" placeholder="e.g. Water leakage" value={complaintTitle} onChange={e => setComplaintTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaint_desc">Description <span className="text-critical">*</span></Label>
                  <Textarea id="complaint_desc" placeholder="Details..." className="min-h-[100px] resize-none" value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={complaintPriority} onValueChange={(v) => setComplaintPriority(v as ServicePriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComplaintOpen(false)} disabled={isSubmittingComplaint}>Cancel</Button>
                <Button onClick={handleComplaintSubmit} disabled={isSubmittingComplaint} className="gap-2">
                  {isSubmittingComplaint && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* My Visitors Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b bg-muted/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              My Visitors
            </CardTitle>
            <CardDescription className="text-xs">Recent visitor activity for your unit</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshVisitors} disabled={isLoadingVisitors} className="h-8">
            <RefreshCw className={cn("h-3 w-3", isLoadingVisitors && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            columns={visitorColumns}
            data={visitors.slice(0, 10)}
            isLoading={isLoadingVisitors}
            searchKey="visitor_name"
          />
        </CardContent>
      </Card>

      {/* Society Announcements */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Society Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No upcoming announcements</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingEvents.map(event => (
                <div key={event.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">{event.title}</p>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase bg-primary/5 border-primary/20 shrink-0">
                        {event.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <Building className="h-3 w-3 shrink-0" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-none bg-muted/30">
        <CardContent className="p-4 flex items-center gap-4">
          <Shield className="h-8 w-8 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Security Notice:</strong> All visitor data shown is specific to your flat. Pre-approved visitors will be verified by security at the gate.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  MoreHorizontal,
  Briefcase,
  User,
  Filter,
  Loader2,
  FileText,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLeaveApplications, LeaveApplication } from "@/hooks/useLeaveApplications";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { useToast } from "@/components/ui/use-toast";

// Roles that manage leave for other employees
const LEAVE_MANAGER_ROLES = new Set([
  "admin",
  "super_admin",
  "company_hod",
  "society_manager",
]);

interface LeaveRequestRow {
  id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Approved" | "Pending" | "Rejected";
  rawStatus: "approved" | "pending" | "rejected";
  photoUrl?: string | null;
}

const statusVariants: Record<string, string> = {
  Approved: "bg-success/10 text-success border-success/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Rejected: "bg-critical/10 text-critical border-critical/20",
};

function toRow(leave: LeaveApplication): LeaveRequestRow {
  const firstName = leave.employee?.first_name || "Unknown";
  const lastName = leave.employee?.last_name || "";
  const statusDisplay = (
    leave.status.charAt(0).toUpperCase() + leave.status.slice(1)
  ) as "Approved" | "Pending" | "Rejected";
  return {
    id: leave.id,
    employeeName: `${firstName} ${lastName}`.trim(),
    employeeId: leave.employee_id,
    type: leave.leave_type?.leave_name || "Unspecified",
    startDate: leave.from_date,
    endDate: leave.to_date,
    days: leave.number_of_days,
    reason: leave.reason,
    status: statusDisplay,
    rawStatus: leave.status,
    photoUrl: leave.employee?.photo_url,
  };
}

// ─────────────────────────────────────────────
// Admin / HR view — full management
// ─────────────────────────────────────────────
function AdminLeaveView() {
  const { leaves, loading, stats, updateLeaveStatus } = useLeaveApplications();
  const { toast } = useToast();

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateLeaveStatus(id, "approved");
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateLeaveStatus(id, "rejected", "Rejected by admin");
  };

  const tableData: LeaveRequestRow[] = leaves.map(toRow);

  const columns: ColumnDef<LeaveRequestRow>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border">
            {row.original.photoUrl ? (
              <img src={row.original.photoUrl} alt={row.original.employeeName} className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {row.original.employeeName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.employeeName}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              EMP-{row.original.employeeId.slice(0, 4)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Leave Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-medium text-[10px] uppercase">
          {row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold">
            {row.original.startDate} to {row.original.endDate}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.original.days} Days Total
          </span>
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={row.getValue("reason")}>
          {row.getValue("reason")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", statusVariants[val] || "")}>
            {val}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.rawStatus === "pending" && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-success hover:bg-success/5 border-success/20"
                onClick={(e) => handleApprove(row.original.id, e)}
                title="Approve Leave"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-critical hover:bg-critical/5 border-critical/20"
                onClick={(e) => handleReject(row.original.id, e)}
                title="Reject Leave"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Leave Management"
        description="Review and process personnel time-off requests, yearly quotas, and carry-forward rules."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filter Quota
            </Button>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Add Configuration
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-premium bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Briefcase className="h-5 w-5" />
              </div>
              <Badge className="bg-white/20 hover:bg-white/30 border-none">Active Today</Badge>
            </div>
            <span className="text-3xl font-extrabold">92%</span>
            <p className="text-[10px] uppercase font-bold text-primary-foreground/70 tracking-widest mt-1">
              Personnel Availability
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 rounded-xl bg-warning/5 text-warning flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Review</span>
              <span className="text-2xl font-bold">{stats.pendingRequests} Requests</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Requiring your attention</p>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 rounded-xl bg-success/5 text-success flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">On Paid Leave</span>
              <span className="text-2xl font-bold">{stats.onLeaveToday} Members</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Currently on leave today</p>
        </Card>
      </div>

      <DataTable columns={columns} data={tableData} searchKey="employeeName" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Employee / Guard view — personal leaves only
// ─────────────────────────────────────────────
function MyLeaveView({ employeeId }: { employeeId: string }) {
  const { leaves, loading, leaveTypes, leaveBalance, applyForLeave } =
    useLeaveApplications(employeeId);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: "",
    from_date: "",
    to_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const tableData: LeaveRequestRow[] = leaves.map(toRow);

  const columns: ColumnDef<LeaveRequestRow>[] = [
    {
      accessorKey: "type",
      header: "Leave Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-medium text-[10px] uppercase">
          {row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold">
            {row.original.startDate} to {row.original.endDate}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.original.days} Days Total
          </span>
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[240px]" title={row.getValue("reason")}>
          {row.getValue("reason")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", statusVariants[val] || "")}>
            {val}
          </Badge>
        );
      },
    },
  ];

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.from_date || !form.to_date || !form.reason.trim()) return;
    setSubmitting(true);
    await applyForLeave(form);
    setSubmitting(false);
    setIsApplyOpen(false);
    setForm({ leave_type_id: "", from_date: "", to_date: "", reason: "" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="My Leave"
        description="Apply for time off and track your leave applications."
        actions={
          <Button className="gap-2 shadow-sm" onClick={() => setIsApplyOpen(true)}>
            <Plus className="h-4 w-4" /> Apply for Leave
          </Button>
        }
      />

      {/* Leave balance cards */}
      {leaveBalance.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leaveBalance.map((b) => (
            <Card key={b.leave_type} className="border-none shadow-card ring-1 ring-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  {b.leave_name}
                </span>
              </div>
              <div className="flex justify-between text-xs font-medium mt-2">
                <span className="text-muted-foreground">Available</span>
                <span className="font-bold text-success">{Math.max(0, b.available)} days</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Used</span>
                <span>{b.used} / {b.yearly_quota}</span>
              </div>
              {b.pending > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="text-warning">{b.pending} days</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <DataTable columns={columns} data={tableData} searchKey="type" />

      {/* Apply for Leave dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select
                value={form.leave_type_id}
                onValueChange={(v) => setForm((f) => ({ ...f, leave_type_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.leave_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={form.to_date}
                  min={form.from_date}
                  onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                placeholder="Brief reason for your leave..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.leave_type_id || !form.from_date || !form.to_date || !form.reason.trim()}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page entry point — branch by role
// ─────────────────────────────────────────────
export default function LeaveManagementPage() {
  const { role, isLoading: isAuthLoading } = useAuth();
  const { employeeId, isLoading: isProfileLoading } = useEmployeeProfile();

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role && LEAVE_MANAGER_ROLES.has(role)) {
    return <AdminLeaveView />;
  }

  if (employeeId) {
    return <MyLeaveView employeeId={employeeId} />;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <p className="text-sm text-muted-foreground">No employee profile found.</p>
    </div>
  );
}

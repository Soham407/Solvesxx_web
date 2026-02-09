"use client";

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
  Loader2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLeaveApplications, LeaveApplication } from "@/hooks/useLeaveApplications";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// Interface for the UI table row
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
  rawStatus: "approved" | "pending" | "rejected"; // For logic
  photoUrl?: string | null;
}

export default function LeaveManagementPage() {
  const { leaves, loading, error, stats, updateLeaveStatus } = useLeaveApplications();
  const { toast } = useToast();

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await updateLeaveStatus(id, "approved");
    } catch (err) {
        // Error handled in hook 
    }
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await updateLeaveStatus(id, "rejected", "Rejected by admin");
    } catch (err) {
         // Error handled in hook
    }
  };

  // Map hook data to table rows
  const tableData: LeaveRequestRow[] = leaves.map(leave => {
    const firstName = leave.employee?.first_name || "Unknown";
    const lastName = leave.employee?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Capitalize status for display
    const statusDisplay = (leave.status.charAt(0).toUpperCase() + leave.status.slice(1)) as "Approved" | "Pending" | "Rejected";

    return {
      id: leave.id,
      employeeName: fullName,
      employeeId: leave.employee_id, // Using concise ID for display
      type: leave.leave_type?.leave_name || "Unspecified",
      startDate: leave.from_date,
      endDate: leave.to_date,
      days: leave.number_of_days,
      reason: leave.reason,
      status: statusDisplay,
      rawStatus: leave.status,
      photoUrl: leave.employee?.photo_url
    };
  });

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
                    {row.original.employeeName.substring(0,2).toUpperCase()}
                </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.employeeName}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">EMP-{row.original.employeeId.slice(0, 4)}</span>
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
            <span className="text-xs font-bold">{row.original.startDate} to {row.original.endDate}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{row.original.days} Days Total</span>
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
          const variants: Record<string, string> = {
              "Approved": "bg-success/10 text-success border-success/20",
              "Pending": "bg-warning/10 text-warning border-warning/20",
              "Rejected": "bg-critical/10 text-critical border-critical/20"
          };
          return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[val] || "")}>
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
                <div className="flex flex-col">
                    <span className="text-3xl font-extrabold ">
                        {/* Placeholder for attendance data - pending implementation of attendance hook */}
                        92%
                    </span>
                    <span className="text-[10px] uppercase font-bold text-primary-foreground/70 tracking-widest mt-1">Personnel Availability</span>
                </div>
            </CardContent>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-6">
            <div className="flex items-center gap-4 mb-3">
                 <div className="h-10 w-10 rounded-xl bg-warning/5 text-warning flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Review</span>
                    <span className="text-2xl font-bold ">{stats.pendingRequests} Requests</span>
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
                    <span className="text-2xl font-bold ">{stats.onLeaveToday} Members</span>
                 </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Currently on leave today</p>
        </Card>
      </div>

      <DataTable columns={columns} data={tableData} searchKey="employeeName" />
    </div>
  );
}

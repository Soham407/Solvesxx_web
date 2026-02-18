"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  ShieldAlert, 
  UserX, 
  History, 
  Plus, 
  MoreHorizontal, 
  Loader2,
  FileText,
  BadgeAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Filter
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBehaviorTickets, BehaviorTicket } from "@/hooks/useBehaviorTickets";
import { useEmployees } from "@/hooks/useEmployees";
import { SummaryReportsDialog } from "@/components/dialogs/SummaryReportsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function BehaviorTicketsPage() {
  const { tickets, isLoading, stats, createTicket, updateStatus, refresh } = useBehaviorTickets();
  const { employees } = useEmployees();

  // Dialog states
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    category: "",
    severity: "low",
    description: "",
  });

  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<BehaviorTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const handleReport = async () => {
    setIsSubmitting(true);
    try {
      const result = await createTicket(formData);
      if (result.success) {
        setReportDialogOpen(false);
        setFormData({ employee_id: "", category: "", severity: "low", description: "" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket || !newStatus) return;
    setIsSubmitting(true);
    try {
      await updateStatus(selectedTicket.id, newStatus, resolution);
      setResolutionDialogOpen(false);
      setSelectedTicket(null);
      setResolution("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<BehaviorTicket>[] = [
    {
      accessorKey: "ticket_number",
      header: "Ticket ID",
      cell: ({ row }) => <span className="font-bold text-xs text-left">#{row.original.ticket_number}</span>
    },
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm">
            {row.original.employee?.first_name} {row.original.employee?.last_name}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {row.original.employee?.employee_code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-[10px] font-bold">
          {row.original.category.replace(/_/g, " ")}
        </Badge>
      )
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.original.severity;
        return (
          <Badge 
            variant="outline" 
            className={cn(
              "uppercase text-[9px] font-black tracking-tighter h-5",
              severity === "high" ? "bg-critical/10 text-critical border-critical/20" :
              severity === "medium" ? "bg-warning/10 text-warning border-warning/20" :
              "bg-info/10 text-info border-info/20"
            )}
          >
            {severity}
          </Badge>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const config: Record<string, { label: string, className: string }> = {
          open: { label: "Open", className: "bg-warning/10 text-warning" },
          under_review: { label: "Reviewing", className: "bg-info/10 text-info" },
          resolved_warning: { label: "Warned", className: "bg-success/10 text-success" },
          resolved_action: { label: "Actioned", className: "bg-primary/10 text-primary" },
          dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground" },
        };
        const s = config[status] || { label: status, className: "" };
        return (
          <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", s.className)}>
            {s.label}
          </Badge>
        );
      }
    },
    {
      accessorKey: "created_at",
      header: "Reported On",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedTicket(row.original);
              setResolutionDialogOpen(true);
              setNewStatus("under_review");
            }}>
              <History className="h-4 w-4 mr-2" /> Take Action
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" /> Dismiss Ticket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading behavior tickets...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Behavioral Tickets"
        description="Formal incident reporting system for tracking employee discipline, rudeness, and duty negligence."
        actions={
          <div className="flex gap-2">
            <SummaryReportsDialog reportType="tickets">
              <Button variant="outline" className="gap-2">
                 <Filter className="h-4 w-4" /> Summary Reports
              </Button>
            </SummaryReportsDialog>
            <Button className="gap-2 shadow-lg shadow-critical/20 bg-critical hover:bg-critical/90" onClick={() => setReportDialogOpen(true)}>
              <BadgeAlert className="h-4 w-4" /> Raise Incident
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Open Incidents", value: stats.active.toString(), sub: "Requires immediate attention", icon: AlertTriangle, color: "text-critical" },
          { label: "Under Review", value: stats.underReview.toString(), sub: "Investigation in progress", icon: Clock, color: "text-warning" },
          { label: "Resolved (30d)", value: stats.resolved.toString(), sub: "Successful interventions", icon: CheckCircle2, color: "text-success" },
          { label: "Repeat Offenders", value: stats.repeatOffenders.toString(), sub: "Multiple violations recorded", icon: ShieldAlert, color: "text-warning" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold ">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={tickets} searchKey="ticket_number" />

      {/* Raise Incident Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Raise Behavior Ticket</DialogTitle>
            <DialogDescription>Report a conduct violation or performance incident.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select value={formData.employee_id} onValueChange={(val) => setFormData({ ...formData, employee_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sleeping_on_duty">Sleeping on Duty</SelectItem>
                    <SelectItem value="rudeness">Insubordination / Rudeness</SelectItem>
                    <SelectItem value="absence">Unauthorized Absence</SelectItem>
                    <SelectItem value="uniform_issue">Uniform / Grooming</SelectItem>
                    <SelectItem value="late_arrival">Late Arrival</SelectItem>
                    <SelectItem value="mobile_use">Excessive Mobile Use</SelectItem>
                    <SelectItem value="other">Other Incident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Verbal Warning)</SelectItem>
                    <SelectItem value="medium">Medium (Written Warning)</SelectItem>
                    <SelectItem value="high">High (Action Required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Incident Description *</Label>
              <Textarea 
                id="description" 
                placeholder="Detailed description of the incident..." 
                className="h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button className="bg-critical hover:bg-critical/90" onClick={handleReport} disabled={isSubmitting || !formData.employee_id || !formData.category || !formData.description}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action/Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Action: #{selectedTicket?.ticket_number}</DialogTitle>
            <DialogDescription>Review incident and decide on resolution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="p-3 bg-muted/30 rounded-lg text-sm italic">
                "{selectedTicket?.description}"
             </div>
             <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_review">Mark as Under Review</SelectItem>
                    <SelectItem value="resolved_warning">Resolve with Warning</SelectItem>
                    <SelectItem value="resolved_action">Resolve with Penalty/Action</SelectItem>
                    <SelectItem value="dismissed">Dismiss Incident</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Resolution / Action Taken</Label>
                <Textarea 
                  placeholder="Record what action was taken or why it was dismissed..." 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>Close</Button>
            <Button onClick={handleResolve} disabled={isSubmitting || !newStatus}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSearch, UserCheck, MoreHorizontal, Briefcase, Loader2, Upload, FileText, ShieldCheck } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCandidates, CandidateStatus, Candidate } from "@/hooks/useCandidates";
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

import { toast } from "sonner";

// Status display configuration
const STATUS_CONFIG: Record<CandidateStatus, { label: string; className: string }> = {
  screening: { label: "Screening", className: "bg-warning/10 text-warning border-warning/20" },
  interviewing: { label: "Interviewing", className: "bg-info/10 text-info border-info/20" },
  background_check: { label: "Background Check", className: "bg-primary/10 text-primary border-primary/20 animate-pulse-soft" },
  offered: { label: "Offered", className: "bg-success/10 text-success border-success/20" },
  hired: { label: "Hired", className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

// Initial form state for adding candidate
const INITIAL_FORM_STATE = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  applied_position: "",
  department: "",
  expected_salary: "",
  source: "",
  notes: "",
};

export default function RecruitmentPortalPage() {
  const {
    candidates,
    isLoading,
    error,
    createCandidate,
    updateCandidateStatus,
    uploadBGVDocument,
    convertToEmployee,
    canTransitionTo,
    getStatusStats,
    refresh,
  } = useCandidates();

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [newStatus, setNewStatus] = useState<CandidateStatus | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [bgvFile, setBgvFile] = useState<File | null>(null);
  const bgvInputRef = useState<any>(null); // For resetting input

  // Convert dialog
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertData, setConvertData] = useState({
    employee_code: "",
    date_of_joining: new Date().toISOString().split("T")[0],
  });

  // Calculate stats
  const stats = getStatusStats();

  // Handle form submission
  const handleAddCandidate = async () => {
    setIsSubmitting(true);
    try {
      const result = await createCandidate({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        applied_position: formData.applied_position,
        department: formData.department || undefined,
        expected_salary: formData.expected_salary ? parseFloat(formData.expected_salary) : undefined,
        source: formData.source || undefined,
        notes: formData.notes || undefined,
      });

      if (result) {
        setAddDialogOpen(false);
        setFormData(INITIAL_FORM_STATE);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedCandidate || !newStatus) return;

    setIsSubmitting(true);
    try {
      const additionalData: Record<string, any> = {};
      
      if (newStatus === "rejected") {
        additionalData.rejection_reason = statusNotes;
      } else if (newStatus === "interviewing") {
        additionalData.interview_notes = statusNotes;
      } else if (newStatus === "background_check") {
        additionalData.bgv_notes = statusNotes;
        
        // Truth Engine: Upload BGV Evidence
        if (bgvFile) {

          const docUrl = await uploadBGVDocument(bgvFile, selectedCandidate.id);
          if (docUrl) {
            additionalData.bgv_document_url = docUrl;
          }
        } else {
          toast.error("BGV Document Required", { 
            description: "You must upload verification documents to initiate background check." 
          });
          setIsSubmitting(false);
          return;
        }
      }

      await updateCandidateStatus(selectedCandidate.id, newStatus, additionalData);
      setStatusDialogOpen(false);
      setSelectedCandidate(null);
      setNewStatus(null);
      setStatusNotes("");
      setBgvFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open status change dialog
  const openStatusDialog = (candidate: Candidate, status: CandidateStatus) => {
    setSelectedCandidate(candidate);
    if (status === "hired") {
      setConvertData({
        employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        date_of_joining: new Date().toISOString().split("T")[0],
      });
      setConvertDialogOpen(true);
    } else {
      setNewStatus(status);
      setStatusNotes("");
      setStatusDialogOpen(true);
    }
  };

  // Handle conversion
  const handleConvert = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    try {
      await convertToEmployee(selectedCandidate.id, {
        employee_code: convertData.employee_code,
        date_of_joining: convertData.date_of_joining,
        department: selectedCandidate.department || undefined,
      });
      setConvertDialogOpen(false);
      setSelectedCandidate(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Candidate>[] = [
    {
      accessorKey: "full_name",
      header: "Candidate / Applicant",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {row.original.first_name?.substring(0, 1).toUpperCase()}
              {row.original.last_name?.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.candidate_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "applied_position",
      header: "Opening / Role",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground/80">
          {row.getValue("applied_position")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Hiring Lifecycle",
      cell: ({ row }) => {
        const status = row.getValue("status") as CandidateStatus;
        const config = STATUS_CONFIG[status];
        return (
          <Badge
            variant="outline"
            className={cn("font-bold text-[10px] uppercase h-5", config?.className || "")}
          >
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">
          {row.getValue("source") || "Direct"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Application Date",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">
          {new Date(row.getValue("created_at")).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const candidate = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <FileSearch className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit Candidate</DropdownMenuItem>
                <DropdownMenuSeparator />
                {canTransitionTo(candidate.id, "interviewing") && (
                  <DropdownMenuItem onClick={() => openStatusDialog(candidate, "interviewing")}>
                    Move to Interviewing
                  </DropdownMenuItem>
                )}
                {canTransitionTo(candidate.id, "background_check") && (
                  <DropdownMenuItem onClick={() => openStatusDialog(candidate, "background_check")}>
                    Start Background Check
                  </DropdownMenuItem>
                )}
                {canTransitionTo(candidate.id, "offered") && (
                  <DropdownMenuItem onClick={() => openStatusDialog(candidate, "offered")}>
                    Make Offer
                  </DropdownMenuItem>
                )}
                {canTransitionTo(candidate.id, "hired") && (
                  <DropdownMenuItem onClick={() => openStatusDialog(candidate, "hired")}>
                    Convert to Employee
                  </DropdownMenuItem>
                )}
                {canTransitionTo(candidate.id, "rejected") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openStatusDialog(candidate, "rejected")}
                      className="text-destructive"
                    >
                      Reject Candidate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading candidates...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Recruitment Portal"
        description="Monitor candidates from 'Applicant' to 'Hired Staff' with integrated background verification tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Briefcase className="h-4 w-4" /> Job Requisitions
            </Button>
            <Button
              className="gap-2 shadow-lg shadow-primary/20"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4" /> Add Candidate
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "New Applicants",
            value: stats.screening.toString(),
            sub: "In screening",
            icon: UserPlus,
            color: "text-primary",
          },
          {
            label: "BGV Pending",
            value: stats.background_check.toString(),
            sub: "Verification required",
            icon: FileSearch,
            color: "text-warning",
          },
          {
            label: "Hired Tracker",
            value: stats.hired.toString(),
            sub: "Total hired",
            icon: UserCheck,
            color: "text-success",
          },
          {
            label: "Active Pipeline",
            value: (stats.screening + stats.interviewing + stats.background_check + stats.offered).toString(),
            sub: "In process",
            icon: Briefcase,
            color: "text-info",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center",
                  stat.color
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  {stat.label}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={candidates} searchKey="full_name" />

      {/* Add Candidate Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Enter the candidate details. They will start in the Screening stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Rahul"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Sharma"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rahul.sharma@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applied_position">Applied Position *</Label>
              <Input
                id="applied_position"
                value={formData.applied_position}
                onChange={(e) => setFormData({ ...formData, applied_position: e.target.value })}
                placeholder="Security Guard"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Security"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_salary">Expected Salary</Label>
                <Input
                  id="expected_salary"
                  type="number"
                  value={formData.expected_salary}
                  onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                  placeholder="25000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portal">Job Portal</SelectItem>
                  <SelectItem value="referral">Employee Referral</SelectItem>
                  <SelectItem value="consultant">Consultant/Agency</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="direct">Direct Application</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the candidate..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCandidate}
              disabled={
                isSubmitting ||
                !formData.first_name ||
                !formData.last_name ||
                !formData.email ||
                !formData.phone ||
                !formData.applied_position
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {newStatus === "rejected" ? "Reject Candidate" : `Move to ${STATUS_CONFIG[newStatus!]?.label}`}
            </DialogTitle>
            <DialogDescription>
              {selectedCandidate?.full_name} - {selectedCandidate?.applied_position}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status_notes">
                {newStatus === "rejected" ? "Rejection Reason" : "Notes"}
              </Label>
              <Textarea
                id="status_notes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder={
                  newStatus === "rejected"
                    ? "Reason for rejection..."
                    : "Add any relevant notes..."
                }
              />
            </div>

            {newStatus === "background_check" && (
              <div className="space-y-4 pt-2">
                <div className="p-4 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <input
                    type="file"
                    id="bgv-doc"
                    className="hidden"
                    onChange={(e) => setBgvFile(e.target.files ? e.target.files[0] : null)}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="bgv-doc" className="flex flex-col items-center justify-center cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                       {bgvFile ? <FileText className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-primary" />}
                    </div>
                    <span className="text-sm font-bold">{bgvFile ? bgvFile.name : "Upload BGV Evidence"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase mt-1">PDF, JPG or PNG (MAX 5MB)</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 p-3 bg-warning/5 border border-warning/10 rounded-lg">
                  <ShieldCheck className="h-4 w-4 text-warning" />
                  <p className="text-[10px] font-medium text-warning-foreground leading-tight">
                    Truth Engine Requirement: This document will be permanently attached to the candidate profile for audit.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isSubmitting || (newStatus === "rejected" && !statusNotes)}
              variant={newStatus === "rejected" ? "destructive" : "default"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {newStatus === "rejected" ? "Reject" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Employee Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Convert to Employee</DialogTitle>
            <DialogDescription>
              Assign employee details for {selectedCandidate?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee_code">Employee Code *</Label>
              <Input
                id="employee_code"
                value={convertData.employee_code}
                onChange={(e) => setConvertData({ ...convertData, employee_code: e.target.value })}
                placeholder="EMP-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doj">Date of Joining *</Label>
              <Input
                id="doj"
                type="date"
                value={convertData.date_of_joining}
                onChange={(e) => setConvertData({ ...convertData, date_of_joining: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={isSubmitting || !convertData.employee_code || !convertData.date_of_joining}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert to Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

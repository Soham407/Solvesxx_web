"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  ArrowRight, 
  ShoppingCart, 
  MoreHorizontal, 
  History, 
  ClipboardList,
  Loader2,
  AlertCircle,
  Send,
  CheckCircle,
  XCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  useIndents, 
  Indent, 
  INDENT_STATUS_CONFIG,
  INDENT_PRIORITY_CONFIG,
  formatCurrency 
} from "@/hooks/useIndents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

export default function IndentManagementPage() {
  const { 
    indents, 
    isLoading, 
    error,
    submitForApproval,
    approveIndent,
    rejectIndent,
    cancelIndent,
    refresh
  } = useIndents();

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null);
  const [approverNotes, setApproverNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate stats from real data
  const stats = {
    pendingApproval: indents.filter(i => i.status === "pending_approval").length,
    approved: indents.filter(i => i.status === "approved").length,
    drafts: indents.filter(i => i.status === "draft").length,
    // TAT would need creation timestamps - using placeholder for now
    avgTAT: "1.4d",
  };

  // Handlers
  const handleSubmitForApproval = async (indentId: string) => {
    setIsProcessing(true);
    const success = await submitForApproval(indentId);
    setIsProcessing(false);
    if (success) {
      refresh();
    }
  };

  const handleApprove = async () => {
    if (!selectedIndentId) return;
    setIsProcessing(true);
    const success = await approveIndent(selectedIndentId, approverNotes || undefined);
    setIsProcessing(false);
    if (success) {
      setShowApproveDialog(false);
      setSelectedIndentId(null);
      setApproverNotes("");
    }
  };

  const handleReject = async () => {
    if (!selectedIndentId || !rejectionReason.trim()) return;
    setIsProcessing(true);
    const success = await rejectIndent(selectedIndentId, rejectionReason);
    setIsProcessing(false);
    if (success) {
      setShowRejectDialog(false);
      setSelectedIndentId(null);
      setRejectionReason("");
    }
  };

  const handleCancel = async (indentId: string) => {
    setIsProcessing(true);
    await cancelIndent(indentId);
    setIsProcessing(false);
  };

  const columns: ColumnDef<Indent>[] = [
    {
      accessorKey: "indent_number",
      header: "Indent Ref",
      cell: ({ row }) => (
        <span className="text-xs font-bold font-mono">{row.getValue("indent_number")}</span>
      ),
    },
    {
      accessorKey: "requester_name",
      header: "Raised By",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold">{row.original.requester_name || "Unknown"}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">
            {row.original.department || "N/A"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "total_items",
      header: "Item Count",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.getValue("total_items")} SKUs</span>
      ),
    },
    {
      accessorKey: "total_estimated_value",
      header: "Est. Budget",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-primary">
          {formatCurrency(row.getValue("total_estimated_value") as number)}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        const config = INDENT_PRIORITY_CONFIG[priority as keyof typeof INDENT_PRIORITY_CONFIG];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config?.className || "")}>
            {config?.label || priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const config = INDENT_STATUS_CONFIG[status as keyof typeof INDENT_STATUS_CONFIG];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config?.className || "")}>
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const indent = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {indent.status === "draft" && (
                  <>
                    <DropdownMenuItem onClick={() => handleSubmitForApproval(indent.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCancel(indent.id)} className="text-critical">
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Indent
                    </DropdownMenuItem>
                  </>
                )}
                {indent.status === "pending_approval" && (
                  <>
                    <DropdownMenuItem onClick={() => {
                      setSelectedIndentId(indent.id);
                      setShowApproveDialog(true);
                    }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedIndentId(indent.id);
                      setShowRejectDialog(true);
                    }} className="text-critical">
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                {indent.status === "approved" && (
                  <DropdownMenuItem>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Create Purchase Order
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Details</DropdownMenuItem>
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
      <div className="animate-fade-in flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading indents...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center h-64 space-y-4">
        <div className="flex items-center text-critical">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Error loading indents</span>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Internal Indent Requests"
        description="Raise and track internal material requests before they are converted into formal Supplier Purchase Orders."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" /> Request History
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> New Indent
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Awaiting Appr.", value: stats.pendingApproval.toString(), icon: ClipboardList, color: "text-warning" },
          { label: "Ready for PO", value: stats.approved.toString(), icon: ShoppingCart, color: "text-success" },
          { label: "Drafts", value: stats.drafts.toString(), icon: FileText, color: "text-muted-foreground" },
          { label: "Avg Appr. TAT", value: stats.avgTAT, icon: History, color: "text-info" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={indents} searchKey="indent_number" />

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Indent</DialogTitle>
            <DialogDescription>
              Add optional notes for this approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approverNotes">Approver Notes (Optional)</Label>
              <Textarea
                id="approverNotes"
                value={approverNotes}
                onChange={(e) => setApproverNotes(e.target.value)}
                placeholder="Add any notes for the approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Indent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Indent</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this indent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={isProcessing || !rejectionReason.trim()}
              variant="destructive"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Indent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

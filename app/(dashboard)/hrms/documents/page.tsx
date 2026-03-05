"use client";

import { useState, useRef } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ShieldCheck,
  Upload,
  AlertCircle,
  MoreHorizontal,
  BookOpen,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useEmployeeDocuments,
  EmployeeDocument,
  DocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_CONFIG,
} from "@/hooks/useEmployeeDocuments";
import { useEmployees } from "@/hooks/useEmployees";
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

// Initial form state for uploading document
const INITIAL_UPLOAD_FORM = {
  employee_id: "",
  document_type: "" as DocumentType | "",
  document_name: "",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  notes: "",
};

export default function DocumentGovernancePage() {
  const {
    documents,
    isLoading,
    error,
    uploadDocument,
    verifyDocument,
    rejectDocument,
    getDownloadUrl,
    getStatusStats,
    formatFileSize,
    refresh,
  } = useEmployeeDocuments();

  const { employees } = useEmployees();

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState(INITIAL_UPLOAD_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verify/Reject dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"verify" | "reject">("verify");
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // Calculate stats
  const stats = getStatusStats();

  // Get expiring count (would need to check expiry_date manually or call getExpiringDocuments)
  const expiringCount = documents.filter((d) => {
    if (!d.expiry_date || d.status !== "verified") return false;
    const expiry = new Date(d.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  }).length;

  // Total storage size
  const totalStorageBytes = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name if empty
      if (!uploadForm.document_name) {
        setUploadForm((prev) => ({
          ...prev,
          document_name: file.name.replace(/\.[^/.]+$/, ""),
        }));
      }
    }
  };

  // Handle upload submission
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.employee_id || !uploadForm.document_type || !uploadForm.document_name) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await uploadDocument(selectedFile, {
        employee_id: uploadForm.employee_id,
        document_type: uploadForm.document_type as DocumentType,
        document_name: uploadForm.document_name,
        document_number: uploadForm.document_number || undefined,
        issue_date: uploadForm.issue_date || undefined,
        expiry_date: uploadForm.expiry_date || undefined,
        notes: uploadForm.notes || undefined,
      });

      if (result) {
        setUploadDialogOpen(false);
        setUploadForm(INITIAL_UPLOAD_FORM);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle verify/reject
  const handleAction = async () => {
    if (!selectedDocument) return;

    setIsSubmitting(true);
    try {
      if (actionType === "verify") {
        await verifyDocument(selectedDocument.id, actionNotes || undefined);
      } else {
        await rejectDocument(selectedDocument.id, actionNotes);
      }
      setActionDialogOpen(false);
      setSelectedDocument(null);
      setActionNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open action dialog
  const openActionDialog = (doc: EmployeeDocument, action: "verify" | "reject") => {
    setSelectedDocument(doc);
    setActionType(action);
    setActionNotes("");
    setActionDialogOpen(true);
  };

  // Handle download
  const handleDownload = async (doc: EmployeeDocument) => {
    const url = await getDownloadUrl(doc.file_path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const columns: ColumnDef<EmployeeDocument>[] = [
    {
      accessorKey: "document_type",
      header: "Compliance Document",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">
              {DOCUMENT_TYPE_LABELS[row.original.document_type] || row.original.document_type}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              REF: {row.original.document_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "employee_name",
      header: "Associated Staff",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{row.original.employee_name}</span>
          <span className="text-[10px] text-muted-foreground">{row.original.employee_code}</span>
        </div>
      ),
    },
    {
      accessorKey: "expiry_date",
      header: "Valid Until",
      cell: ({ row }) => {
        const expiry = row.original.expiry_date;
        if (!expiry) return <span className="text-xs text-muted-foreground">No Expiry</span>;

        const expiryDate = new Date(expiry);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        const isExpired = daysUntilExpiry <= 0;

        return (
          <span
            className={cn(
              "text-xs font-medium",
              isExpired ? "text-critical" : isExpiringSoon ? "text-warning" : "text-muted-foreground"
            )}
          >
            {expiryDate.toLocaleDateString()}
            {isExpired && " (Expired)"}
            {isExpiringSoon && ` (${daysUntilExpiry}d)`}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Review Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as DocumentStatus;
        const config = DOCUMENT_STATUS_CONFIG[status];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config?.className || "")}>
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "file_size",
      header: "Size",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatFileSize(row.original.file_size)}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleDownload(doc)}>
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
                {doc.status === "pending_review" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openActionDialog(doc, "verify")}>
                      <CheckCircle className="h-4 w-4 mr-2 text-success" /> Verify Document
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openActionDialog(doc, "reject")} className="text-destructive">
                      <XCircle className="h-4 w-4 mr-2" /> Reject Document
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
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
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
        title="Document Governance"
        description="Unified portal for tracking critical compliance documents like PSARA, Police Verifications, and Identity Proofs."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Audit Report
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Verified Docs",
            value: stats.verified.toString(),
            sub: "100% compliant",
            icon: ShieldCheck,
            color: "text-success",
          },
          {
            label: "Expiring Soon",
            value: expiringCount.toString(),
            sub: "Next 30 days",
            icon: AlertCircle,
            color: "text-warning",
          },
          {
            label: "Pending Review",
            value: stats.pending_review.toString(),
            sub: "Needs attention",
            icon: AlertCircle,
            color: "text-info",
          },
          {
            label: "Total Storage",
            value: formatFileSize(totalStorageBytes),
            sub: "Secure storage",
            icon: BookOpen,
            color: "text-primary",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
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

      <DataTable columns={columns} data={documents} searchKey="employee_name" />

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a compliance document for an employee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={uploadForm.employee_id}
                onValueChange={(value) => setUploadForm({ ...uploadForm, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value as DocumentType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File * (PDF, JPEG, PNG - Max 10MB)</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_name">Document Name *</Label>
              <Input
                id="document_name"
                value={uploadForm.document_name}
                onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                placeholder="e.g., Aadhar Card - Rahul Sharma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">Document Number</Label>
              <Input
                id="document_number"
                value={uploadForm.document_number}
                onChange={(e) => setUploadForm({ ...uploadForm, document_number: e.target.value })}
                placeholder="e.g., XXXX XXXX XXXX"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={uploadForm.issue_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                isSubmitting ||
                !selectedFile ||
                !uploadForm.employee_id ||
                !uploadForm.document_type ||
                !uploadForm.document_name
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify/Reject Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{actionType === "verify" ? "Verify Document" : "Reject Document"}</DialogTitle>
            <DialogDescription>
              {selectedDocument?.document_name} - {selectedDocument?.employee_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action_notes">{actionType === "verify" ? "Verification Notes" : "Rejection Reason *"}</Label>
              <Textarea
                id="action_notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={actionType === "verify" ? "Optional notes..." : "Reason for rejection..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting || (actionType === "reject" && !actionNotes.trim())}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "verify" ? "Verify" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

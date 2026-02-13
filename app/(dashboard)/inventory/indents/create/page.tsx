"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  XCircle,
  RefreshCw,
  Eye,
  Building,
  Package,
  Calendar,
  Trash2,
  X,
  ChevronRight
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  useIndents, 
  Indent, 
  IndentItem,
  INDENT_STATUS_CONFIG,
  INDENT_PRIORITY_CONFIG,
  formatCurrency,
  toPaise
} from "@/hooks/useIndents";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useEmployees } from "@/hooks/useEmployees";
import { useSocieties } from "@/hooks/useSocieties";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

// Line item for new indent form
interface NewIndentItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit: string;
  estimated_price: number; // In rupees for form
  notes: string;
}

export default function IndentManagementPage() {
  const { toast } = useToast();
  
  const { 
    indents, 
    items: indentItems,
    isLoading, 
    error,
    createIndent,
    addIndentItem,
    submitForApproval,
    approveIndent,
    rejectIndent,
    cancelIndent,
    fetchIndentItems,
    refresh
  } = useIndents();

  const { createPOFromIndent } = usePurchaseOrders();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers({ status: 'active' } as any);
  const { products, isLoading: productsLoading } = useProducts({ status: 'active' });
  const { employees, isLoading: employeesLoading, getEmployeeName } = useEmployees();
  const { societies, isLoading: societiesLoading } = useSocieties();

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCreatePODialog, setShowCreatePODialog] = useState(false);
  const [showNewIndentDialog, setShowNewIndentDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  
  const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
  const [detailItems, setDetailItems] = useState<IndentItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Form states
  const [approverNotes, setApproverNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // New Indent form state
  const [newIndentForm, setNewIndentForm] = useState({
    requester_id: "",
    department: "",
    society_id: "",
    title: "",
    purpose: "",
    required_date: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    notes: "",
  });
  const [newIndentItems, setNewIndentItems] = useState<NewIndentItem[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    product_id: "",
    quantity: 1,
    estimated_price: 0,
    notes: "",
  });

  // Calculate stats from real data
  const stats = useMemo(() => ({
    pendingApproval: indents.filter(i => i.status === "pending_approval").length,
    approved: indents.filter(i => i.status === "approved").length,
    drafts: indents.filter(i => i.status === "draft").length,
    poCreated: indents.filter(i => i.status === "po_created").length,
  }), [indents]);

  // Get active suppliers for dropdown
  const activeSuppliers = useMemo(() => 
    suppliers.filter(s => s.status === 'active' || s.is_active), 
    [suppliers]
  );

  // Reset new indent form
  const resetNewIndentForm = () => {
    setNewIndentForm({
      requester_id: "",
      department: "",
      society_id: "",
      title: "",
      purpose: "",
      required_date: "",
      priority: "normal",
      notes: "",
    });
    setNewIndentItems([]);
    setNewItemForm({ product_id: "", quantity: 1, estimated_price: 0, notes: "" });
    setAddingItem(false);
  };

  // Add item to new indent
  const handleAddItemToNewIndent = () => {
    if (!newItemForm.product_id) {
      toast({ title: "Select a product", variant: "destructive" });
      return;
    }
    
    const product = products.find(p => p.id === newItemForm.product_id);
    if (!product) return;
    
    const newItem: NewIndentItem = {
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.product_name,
      product_code: product.product_code,
      quantity: newItemForm.quantity,
      unit: product.unit_of_measurement || "pcs",
      estimated_price: newItemForm.estimated_price || (product.base_rate || 0),
      notes: newItemForm.notes,
    };
    
    setNewIndentItems([...newIndentItems, newItem]);
    setNewItemForm({ product_id: "", quantity: 1, estimated_price: 0, notes: "" });
    setAddingItem(false);
  };

  // Remove item from new indent
  const handleRemoveItemFromNewIndent = (itemId: string) => {
    setNewIndentItems(newIndentItems.filter(i => i.id !== itemId));
  };

  // Create new indent
  const handleCreateIndent = async () => {
    if (!newIndentForm.requester_id) {
      toast({ title: "Select a requester", variant: "destructive" });
      return;
    }
    if (newIndentItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    // Create the indent first
    const indent = await createIndent({
      requester_id: newIndentForm.requester_id,
      department: newIndentForm.department || undefined,
      society_id: newIndentForm.society_id || undefined,
      title: newIndentForm.title || undefined,
      purpose: newIndentForm.purpose || undefined,
      required_date: newIndentForm.required_date || undefined,
      priority: newIndentForm.priority,
      notes: newIndentForm.notes || undefined,
    });

    if (!indent) {
      setIsProcessing(false);
      toast({ title: "Failed to create indent", variant: "destructive" });
      return;
    }

    // Add items to the indent
    for (const item of newIndentItems) {
      await addIndentItem({
        indent_id: indent.id,
        product_id: item.product_id,
        item_description: item.product_name,
        requested_quantity: item.quantity,
        unit_of_measure: item.unit,
        estimated_unit_price: toPaise(item.estimated_price),
        notes: item.notes || undefined,
      });
    }

    setIsProcessing(false);
    setShowNewIndentDialog(false);
    resetNewIndentForm();
    toast({ 
      title: "Indent Created", 
      description: `${indent.indent_number} has been created as draft` 
    });
    refresh();
  };

  // Open detail sheet
  const openDetailSheet = async (indent: Indent) => {
    setSelectedIndent(indent);
    setDetailLoading(true);
    setShowDetailSheet(true);
    const items = await fetchIndentItems(indent.id);
    setDetailItems(items);
    setDetailLoading(false);
  };

  // Handlers
  const handleSubmitForApproval = async (indentId: string) => {
    setIsProcessing(true);
    const success = await submitForApproval(indentId);
    setIsProcessing(false);
    if (success) {
      toast({ title: "Indent Submitted", description: "Indent has been submitted for approval" });
      refresh();
    }
  };

  const handleApprove = async () => {
    if (!selectedIndent) return;
    setIsProcessing(true);
    const success = await approveIndent(selectedIndent.id, approverNotes || undefined);
    setIsProcessing(false);
    if (success) {
      setShowApproveDialog(false);
      setSelectedIndent(null);
      setApproverNotes("");
      toast({ title: "Indent Approved", description: "Indent has been approved and is ready for PO creation" });
    }
  };

  const handleReject = async () => {
    if (!selectedIndent || !rejectionReason.trim()) return;
    setIsProcessing(true);
    const success = await rejectIndent(selectedIndent.id, rejectionReason);
    setIsProcessing(false);
    if (success) {
      setShowRejectDialog(false);
      setSelectedIndent(null);
      setRejectionReason("");
      toast({ title: "Indent Rejected", description: "Indent has been rejected" });
    }
  };

  const handleCancel = async (indentId: string) => {
    setIsProcessing(true);
    const success = await cancelIndent(indentId);
    setIsProcessing(false);
    if (success) {
      toast({ title: "Indent Cancelled", description: "Indent has been cancelled" });
    }
  };

  // Create PO from approved indent
  const handleCreatePO = async () => {
    if (!selectedIndent || !selectedSupplierId) {
      toast({ title: "Select a supplier", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const po = await createPOFromIndent(selectedIndent.id, selectedSupplierId, {
      expected_delivery_date: expectedDeliveryDate || undefined,
      notes: poNotes || undefined,
      useSupplierRates: true, // Auto-populate rates from supplier contract
    });
    setIsProcessing(false);

    if (po) {
      setShowCreatePODialog(false);
      setSelectedIndent(null);
      setSelectedSupplierId("");
      setExpectedDeliveryDate("");
      setPONotes("");
      toast({ 
        title: "Purchase Order Created", 
        description: `PO ${po.po_number || po.id.slice(0, 8)} has been created from indent` 
      });
      refresh();
    }
  };

  // Open create PO dialog
  const openCreatePODialog = (indent: Indent) => {
    setSelectedIndent(indent);
    setShowCreatePODialog(true);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate item totals for new indent
  const newIndentTotal = useMemo(() => {
    return newIndentItems.reduce((sum, item) => sum + (item.quantity * item.estimated_price), 0);
  }, [newIndentItems]);

  const columns: ColumnDef<Indent>[] = [
    {
      accessorKey: "indent_number",
      header: "Indent Ref",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold font-mono">{row.getValue("indent_number")}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDate(row.original.created_at)}
            </span>
          </div>
        </div>
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
      accessorKey: "title",
      header: "Purpose",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.original.title || row.original.purpose || "—"}
        </span>
      ),
    },
    {
      accessorKey: "total_items",
      header: "Items",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium">
          {row.getValue("total_items") || 0} SKUs
        </Badge>
      ),
    },
    {
      accessorKey: "total_estimated_value",
      header: "Est. Budget",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-primary">
          {formatCurrency(row.getValue("total_estimated_value") as number || 0)}
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary"
              onClick={() => openDetailSheet(indent)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => openDetailSheet(indent)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
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
                      setSelectedIndent(indent);
                      setShowApproveDialog(true);
                    }} className="text-success">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setSelectedIndent(indent);
                      setShowRejectDialog(true);
                    }} className="text-critical">
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                
                {indent.status === "approved" && (
                  <DropdownMenuItem onClick={() => openCreatePODialog(indent)} className="text-primary font-bold">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Create Purchase Order
                  </DropdownMenuItem>
                )}
                
                {indent.status === "po_created" && indent.linked_po_id && (
                  <DropdownMenuItem className="text-info">
                    <FileText className="mr-2 h-4 w-4" />
                    View Linked PO
                  </DropdownMenuItem>
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
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
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
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button 
              onClick={() => setShowNewIndentDialog(true)} 
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> New Indent
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-warning">{stats.pendingApproval}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Awaiting Approval</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-success">{stats.approved}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ready for PO</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats.drafts}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Drafts</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{stats.poCreated}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">PO Created</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indents Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Indent Requests
          </CardTitle>
          <CardDescription>
            {indents.length} indent{indents.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {indents.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No indents found</CardDescription>
              <Button onClick={() => setShowNewIndentDialog(true)} variant="link" className="mt-2">
                Create your first indent
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={indents} searchKey="indent_number" />
          )}
        </CardContent>
      </Card>

      {/* New Indent Dialog */}
      <Dialog open={showNewIndentDialog} onOpenChange={setShowNewIndentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Indent</DialogTitle>
            <DialogDescription>
              Raise a material request. Add items and submit for approval.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requester">Requester *</Label>
                <Select 
                  value={newIndentForm.requester_id} 
                  onValueChange={(val) => setNewIndentForm({ ...newIndentForm, requester_id: val })}
                >
                  <SelectTrigger id="requester">
                    <SelectValue placeholder="Select requester" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesLoading ? (
                      <div className="p-2 text-center text-muted-foreground">Loading...</div>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.employee_code || emp.id.slice(0, 8)})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newIndentForm.department}
                  onChange={(e) => setNewIndentForm({ ...newIndentForm, department: e.target.value })}
                  placeholder="e.g., Operations, Security"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="society">Society / Location</Label>
                <Select 
                  value={newIndentForm.society_id} 
                  onValueChange={(val) => setNewIndentForm({ ...newIndentForm, society_id: val })}
                >
                  <SelectTrigger id="society">
                    <SelectValue placeholder="Select society (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Societies</SelectItem>
                    {societiesLoading ? (
                      <div className="p-2 text-center text-muted-foreground">Loading...</div>
                    ) : (
                      societies.map((soc) => (
                        <SelectItem key={soc.id} value={soc.id}>
                          {soc.society_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newIndentForm.priority} 
                  onValueChange={(val) => setNewIndentForm({ ...newIndentForm, priority: val as any })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title / Subject</Label>
                <Input
                  id="title"
                  value={newIndentForm.title}
                  onChange={(e) => setNewIndentForm({ ...newIndentForm, title: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="required_date">Required By</Label>
                <Input
                  id="required_date"
                  type="date"
                  value={newIndentForm.required_date}
                  onChange={(e) => setNewIndentForm({ ...newIndentForm, required_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose / Justification</Label>
              <Textarea
                id="purpose"
                value={newIndentForm.purpose}
                onChange={(e) => setNewIndentForm({ ...newIndentForm, purpose: e.target.value })}
                placeholder="Why is this material needed?"
                rows={2}
              />
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-bold">Line Items *</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAddingItem(true)}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              {/* Add Item Form */}
              {addingItem && (
                <div className="p-4 border rounded-lg bg-muted/20 mb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product *</Label>
                      <Select 
                        value={newItemForm.product_id} 
                        onValueChange={(val) => {
                          const product = products.find(p => p.id === val);
                          setNewItemForm({ 
                            ...newItemForm, 
                            product_id: val,
                            estimated_price: product?.base_rate || 0
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {productsLoading ? (
                            <div className="p-2 text-center text-muted-foreground">Loading...</div>
                          ) : (
                            products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.product_name} ({p.product_code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newItemForm.quantity}
                          onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Est. Price (Rs)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newItemForm.estimated_price}
                          onChange={(e) => setNewItemForm({ ...newItemForm, estimated_price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAddingItem(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddItemToNewIndent}>
                      Add to Indent
                    </Button>
                  </div>
                </div>
              )}

              {/* Items List */}
              {newIndentItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Est. Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newIndentItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{item.product_name}</span>
                              <span className="text-[10px] text-muted-foreground">{item.product_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right">Rs {item.estimated_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">
                            Rs {(item.quantity * item.estimated_price).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-critical"
                              onClick={() => handleRemoveItemFromNewIndent(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 bg-muted/30 border-t flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {newIndentItems.length} item{newIndentItems.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-bold">
                      Estimated Total: Rs {newIndentTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewIndentDialog(false); resetNewIndentForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateIndent} 
              disabled={isProcessing || !newIndentForm.requester_id || newIndentItems.length === 0}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Indent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={showCreatePODialog} onOpenChange={setShowCreatePODialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Convert approved indent {selectedIndent?.indent_number} into a Purchase Order.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedIndent && (
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{selectedIndent.indent_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedIndent.total_items} items | Est. {formatCurrency(selectedIndent.total_estimated_value)}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Approved
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="po_supplier">Supplier *</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger id="po_supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersLoading ? (
                    <div className="p-2 text-center text-muted-foreground">Loading...</div>
                  ) : activeSuppliers.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">No active suppliers</div>
                  ) : (
                    activeSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {supplier.supplier_name}
                          {supplier.tier === 1 && <Badge variant="outline" className="h-4 text-[8px] ml-1">Platinum</Badge>}
                          {supplier.tier === 2 && <Badge variant="outline" className="h-4 text-[8px] ml-1">Gold</Badge>}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Supplier rates will be auto-populated from contract if available
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="po_delivery_date">Expected Delivery Date</Label>
              <Input
                id="po_delivery_date"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="po_notes">Notes</Label>
              <Textarea
                id="po_notes"
                value={poNotes}
                onChange={(e) => setPONotes(e.target.value)}
                placeholder="Additional notes for the PO"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { 
              setShowCreatePODialog(false); 
              setSelectedIndent(null);
              setSelectedSupplierId("");
              setExpectedDeliveryDate("");
              setPONotes("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={isProcessing || !selectedSupplierId}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Indent</DialogTitle>
            <DialogDescription>
              Approve indent {selectedIndent?.indent_number}. Add optional notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <Button onClick={handleApprove} disabled={isProcessing} className="bg-success hover:bg-success/90">
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
              Please provide a reason for rejecting indent {selectedIndent?.indent_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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

      {/* Indent Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {selectedIndent?.indent_number}
            </SheetTitle>
            <SheetDescription>
              Indent Details
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedIndent && (
            <div className="mt-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-bold text-xs uppercase px-3 py-1",
                    INDENT_STATUS_CONFIG[selectedIndent.status]?.className
                  )}
                >
                  {INDENT_STATUS_CONFIG[selectedIndent.status]?.label}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-bold text-xs uppercase",
                    INDENT_PRIORITY_CONFIG[selectedIndent.priority]?.className
                  )}
                >
                  {selectedIndent.priority} Priority
                </Badge>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Requested By</span>
                  <p className="font-semibold text-sm mt-1">{selectedIndent.requester_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedIndent.department || "N/A"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Est. Value</span>
                  <p className="font-bold text-lg mt-1">
                    {formatCurrency(selectedIndent.total_estimated_value)}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {selectedIndent.title && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <span className="ml-2 font-medium">{selectedIndent.title}</span>
                  </div>
                )}
                {selectedIndent.purpose && (
                  <div>
                    <span className="text-muted-foreground">Purpose:</span>
                    <p className="mt-1 text-sm bg-muted/30 p-2 rounded">{selectedIndent.purpose}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedIndent.created_at)}</span>
                </div>
                {selectedIndent.required_date && (
                  <div>
                    <span className="text-muted-foreground">Required By:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedIndent.required_date)}</span>
                  </div>
                )}
                {selectedIndent.society_name && (
                  <div>
                    <span className="text-muted-foreground">Society:</span>
                    <span className="ml-2 font-medium">{selectedIndent.society_name}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Line Items ({detailItems.length})
                </h4>
                
                {detailItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No items</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Est. Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {item.product_name || item.item_description || "Unnamed"}
                                </span>
                                {item.product_code && (
                                  <span className="text-[10px] text-muted-foreground">{item.product_code}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.requested_quantity} {item.unit_of_measure}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {item.estimated_total ? formatCurrency(item.estimated_total) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedIndent.status === "approved" && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      setShowDetailSheet(false);
                      openCreatePODialog(selectedIndent);
                    }} 
                    className="w-full gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" /> Create Purchase Order
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

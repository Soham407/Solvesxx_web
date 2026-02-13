"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  FileText, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  ArrowUpRight,
  Filter,
  Loader2,
  RefreshCw,
  Building,
  PackageCheck,
  Eye,
  Calendar,
  MapPin,
  ClipboardList,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  ClipboardCheck,
  Undo2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  useGRN, 
  MaterialReceipt, 
  GRNItem, 
  GRNStatus, 
  GRN_STATUS_CONFIG,
  QUALITY_STATUS_CONFIG,
  QualityStatus
} from "@/hooks/useGRN";
import { formatCurrency } from "@/src/lib/utils/currency";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useToast } from "@/components/ui/use-toast";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function GRNPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const poIdFromQuery = searchParams.get("po_id");

  // Hooks
  const {
    materialReceipts,
    items,
    isLoading,
    error,
    fetchGRNs,
    fetchGRNItems,
    createGRNFromPO,
    updateGRN,
    deleteGRN,
    startInspection,
    completeQualityCheck,
    recordItemReceipt,
  } = useGRN();

  const { purchaseOrders, isLoading: posLoading } = usePurchaseOrders();
  const { warehouses } = useWarehouses();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<GRNStatus | "all">("all");
  const [selectedGRN, setSelectedGRN] = useState<MaterialReceipt | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inspectionMode, setInspectionMode] = useState(false);
  const [itemInspections, setItemInspections] = useState<Record<string, {
    received: number;
    accepted: number;
    rejected: number;
    quality_status: QualityStatus;
    rejection_reason?: string;
    batch_number?: string;
    expiry_date?: string;
  }>>({});

  // Memoized stats
  const stats = useMemo(() => {
    return {
      draft: materialReceipts.filter(r => r.status === "draft").length,
      inspecting: materialReceipts.filter(r => r.status === "inspecting").length,
      accepted: materialReceipts.filter(r => r.status === "accepted" || r.status === "partial_accepted").length,
      rejected: materialReceipts.filter(r => r.status === "rejected").length,
    };
  }, [materialReceipts]);

  // Handle PO ID from query
  useEffect(() => {
    if (poIdFromQuery && !isLoading && !createDialogOpen) {
      setCreateDialogOpen(true);
    }
  }, [poIdFromQuery, isLoading]);

  // Handle creating GRN from PO
  const handleCreateFromPO = async (poId: string) => {
    const grn = await createGRNFromPO(poId);
    if (grn) {
      toast({
        title: "GRN Created",
        description: `Material Receipt ${grn.grn_number} has been created in draft.`,
      });
      setCreateDialogOpen(false);
      // Clean up URL
      router.replace("/inventory/grn");
    } else {
      toast({
        title: "Error",
        description: "Failed to create GRN from Purchase Order.",
        variant: "destructive",
      });
    }
  };

  // Handle Detail View
  const handleViewDetails = async (grn: MaterialReceipt) => {
    setSelectedGRN(grn);
    await fetchGRNItems(grn.id);
    setDetailSheetOpen(true);
    setInspectionMode(false);
  };

  // Handle Inspection Start
  const handleStartInspection = async (grnId: string) => {
    const success = await startInspection(grnId);
    if (success) {
      toast({
        title: "Inspection Started",
        description: "The material receipt is now being inspected.",
      });
      setInspectionMode(true);
    }
  };

  // Handle Item Update during inspection
  const handleUpdateItemReceipt = async (item: GRNItem, data: any) => {
    const success = await recordItemReceipt(
      item.id,
      data.received,
      data.accepted,
      data.rejected,
      data.quality_status,
      data.rejection_reason,
      data.batch_number,
      data.expiry_date
    );
    if (!success) {
      toast({
        title: "Update Failed",
        description: "Could not update item receipt details.",
        variant: "destructive",
      });
    }
  };

  // Handle Inspection Completion
  const handleCompleteInspection = async () => {
    if (!selectedGRN) return;
    
    // Check if all items have been updated (simple check)
    // In a real app we'd validate more strictly
    const success = await completeQualityCheck(selectedGRN.id, "Current User"); // Replace with actual user name
    if (success) {
      toast({
        title: "Inspection Completed",
        description: "The quality check has been finalized.",
      });
      setDetailSheetOpen(false);
    }
  };

  // Table Columns
  const columns: ColumnDef<MaterialReceipt>[] = [
    {
      accessorKey: "grn_number",
      header: "GRN Number",
      cell: ({ row }) => <span className="font-bold">{row.original.grn_number}</span>,
    },
    {
      accessorKey: "po_number",
      header: "Source PO",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
          {row.original.po_number || "Direct"}
        </Badge>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: "Supplier",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.supplier_name}</div>
          <div className="text-[10px] text-muted-foreground uppercase">{row.original.supplier_code}</div>
        </div>
      ),
    },
    {
      accessorKey: "received_date",
      header: "Received Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {new Date(row.original.received_date).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = GRN_STATUS_CONFIG[row.original.status];
        return (
          <Badge variant="outline" className={cn("font-black text-[10px] uppercase h-5", config?.className)}>
            {config?.label}
          </Badge>
        );
      },
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
            <DropdownMenuItem onClick={() => handleViewDetails(row.original)} className="gap-2">
              <Eye className="h-3.5 w-3.5" /> View / Inspect
            </DropdownMenuItem>
            {row.original.status === "draft" && (
              <DropdownMenuItem onClick={() => deleteGRN(row.original.id)} className="gap-2 text-destructive">
                <Undo2 className="h-3.5 w-3.5" /> Delete Draft
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Filtering
  const filteredGRNs = useMemo(() => {
    let result = materialReceipts;
    if (statusFilter !== "all") {
      result = result.filter(r => r.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.grn_number.toLowerCase().includes(term) ||
        r.supplier_name?.toLowerCase().includes(term) ||
        r.po_number?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [materialReceipts, statusFilter, searchTerm]);

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Material Receipts (GRN)"
        description="Verify and record incoming goods from suppliers"
      >
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 premium-button">
          <Plus className="h-4 w-4" /> New Receipt
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Draft Receipts</p>
              <h3 className="text-2xl font-bold mt-1">{stats.draft}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-info">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">In Inspection</p>
              <h3 className="text-2xl font-bold mt-1 text-info">{stats.inspecting}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Accepted</p>
              <h3 className="text-2xl font-bold mt-1 text-success">{stats.accepted}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-critical">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Rejected</p>
              <h3 className="text-2xl font-bold mt-1 text-critical">{stats.rejected}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-critical/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-critical" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GRN, Supplier, PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/20 border-none ring-1 ring-border focus-visible:ring-primary"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
          <SelectTrigger className="w-[180px] bg-muted/20 border-none ring-1 ring-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Receipts</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="inspecting">Inspecting</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="partial_accepted">Partial Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => fetchGRNs()} className="rounded-lg">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredGRNs}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="sm:max-w-4xl overflow-y-auto">
          {selectedGRN && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between pr-8">
                  <div>
                    <SheetTitle className="text-2xl font-black uppercase tracking-tighter">
                      {selectedGRN.grn_number}
                    </SheetTitle>
                    <SheetDescription className="font-medium">
                      Source: PO {selectedGRN.po_number || "Direct Receipt"}
                    </SheetDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-black text-xs uppercase px-4 py-1 h-7",
                      GRN_STATUS_CONFIG[selectedGRN.status]?.className
                    )}
                  >
                    {GRN_STATUS_CONFIG[selectedGRN.status]?.label}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Supplier</p>
                  <p className="font-bold text-sm">{selectedGRN.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedGRN.supplier_code}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Warehouse</p>
                  <p className="font-bold text-sm">{selectedGRN.warehouse_name || "Not Assigned"}</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1">
                    <MapPin className="h-3 w-3" /> Delivery Point
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Dates</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">Received: {new Date(selectedGRN.received_date).toLocaleDateString()}</span>
                    </div>
                    {selectedGRN.quality_checked_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="font-medium">QC: {new Date(selectedGRN.quality_checked_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" /> 
                    Line Items ({items.length})
                  </h3>
                  {selectedGRN.status === "draft" && !inspectionMode && (
                    <Button size="sm" onClick={() => handleStartInspection(selectedGRN.id)} className="gap-2">
                      <ClipboardCheck className="h-4 w-4" /> Start Quality Check
                    </Button>
                  )}
                  {inspectionMode && (
                    <Button size="sm" variant="outline" onClick={handleCompleteInspection} className="gap-2 font-bold bg-success/10 text-success border-success/20 hover:bg-success/20">
                      <CheckCircle className="h-4 w-4" /> Finalize Receipt
                    </Button>
                  )}
                </div>

                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase">Product Details</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Ordered</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Received</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Accepted/Rejected</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Quality</TableHead>
                        {inspectionMode && <TableHead className="font-black text-[10px] uppercase">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isBeingEdited = inspectionMode;
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-bold text-sm tracking-tight">{item.product_name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] font-bold py-0 h-4">
                                    {item.product_code}
                                  </Badge>
                                  {item.batch_number && (
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                      <History className="h-2.5 w-2.5" /> Batch: {item.batch_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-muted-foreground">{item.ordered_quantity || 0}</TableCell>
                            <TableCell className="text-center font-black text-primary">
                              {inspectionMode ? (
                                <Input 
                                  type="number" 
                                  className="w-20 mx-auto h-8 text-center" 
                                  defaultValue={item.received_quantity}
                                  onBlur={(e) => handleUpdateItemReceipt(item, { received: parseInt(e.target.value) || 0 })}
                                />
                              ) : item.received_quantity}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-4">
                                <span className="text-success font-bold">{item.accepted_quantity || 0}</span>
                                <span className="text-critical font-bold">{item.rejected_quantity || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "font-bold text-[10px] uppercase h-5",
                                  QUALITY_STATUS_CONFIG[item.quality_status]?.className
                                )}
                              >
                                {QUALITY_STATUS_CONFIG[item.quality_status]?.label}
                              </Badge>
                            </TableCell>
                            {inspectionMode && (
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    // Open a localized sub-dialog for full line detail if needed
                                    // For now just toggle logic
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedGRN.notes && (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed text-sm italic text-muted-foreground">
                  <p className="font-bold text-[10px] uppercase tracking-widest mb-1 not-italic text-foreground">Header Notes</p>
                  {selectedGRN.notes}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create GRN Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-black flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Create Material Receipt
            </DialogTitle>
            <DialogDescription>
              Select an acknowledged Purchase Order to begin receiving goods.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest">Select Purchase Order</Label>
              <Select onValueChange={handleCreateFromPO}>
                <SelectTrigger className="h-12 border-2 focus:ring-primary">
                  <SelectValue placeholder="Search Acknowledged POs" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders
                    .filter(po => ["acknowledged", "partial_received"].includes(po.status || ""))
                    .map(po => (
                      <SelectItem key={po.id} value={po.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-bold">{po.po_number} - {po.supplier_name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{po.grand_total ? formatCurrency(po.grand_total) : ""}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                  {purchaseOrders.filter(po => ["acknowledged", "partial_received"].includes(po.status || "")).length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No active POs found ready for receipt.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Only Acknowledged or Partially Received POs can be selected. This ensures the supplier has confirmed the order before we record receipt.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GRNPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[450px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <GRNPageContent />
    </Suspense>
  );
}

// Small helper components
function Edit({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z"/></svg>;
}

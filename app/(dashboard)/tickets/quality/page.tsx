"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Box, 
  AlertTriangle, 
  FileWarning, 
  ArrowLeftRight, 
  Plus, 
  MoreHorizontal,
  FileSearch,
  Camera,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGRN, GRN_STATUS_CONFIG, QualityStatus } from "@/hooks/useGRN";
import { useEffect, useState } from "react";
import { useShortageNotes, SHORTAGE_STATUS_CONFIG } from "@/hooks/useShortageNotes";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { formatCurrency } from "@/src/lib/utils/currency";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

interface QualityTicket {
  id: string;
  grnId: string;
  poRef: string;
  vendor: string;
  item: string;
  issueType: "Shortage" | "Damaged" | "Expired" | "Wrong Item" | "Partial";
  recordedQty: string;
  expectedQty: string;
  status: "Under Review" | "Debit Note Raised" | "Returned" | "Resolved" | "Accepted";
  qualityStatus: QualityStatus;
}

interface QualityStats {
  shortageNotes: number;
  damagedGoods: number;
  returnPending: number;
  qualityAudit: number;
}

export default function QualityTicketsPage() {
  const [tickets, setTickets] = useState<QualityTicket[]>([]);
  const [stats, setStats] = useState<QualityStats>({
    shortageNotes: 0,
    damagedGoods: 0,
    returnPending: 0,
    qualityAudit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { materialReceipts, isLoading: grnLoading, error: grnError, fetchGRNItems } = useGRN();
  const { notes: shortageNotes, isLoading: shortageLoading, stats: shortageStats } = useShortageNotes();
  const { logs: auditLogs } = useAuditLogs();

  const [logDiscrepancyOpen, setLogDiscrepancyOpen] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [isSubmittingDiscrepancy, setIsSubmittingDiscrepancy] = useState(false);
  const [discrepancyForm, setDiscrepancyForm] = useState({
    item_description: "",
    issue_type: "Shortage" as QualityTicket["issueType"],
    expected_qty: "",
    actual_qty: "",
    vendor: "",
  });

  const handleLogDiscrepancy = async () => {
    if (!discrepancyForm.item_description) return;
    setIsSubmittingDiscrepancy(true);
    try {
      const { error } = await supabase.from("shortage_notes").insert({
        note_number: `SN-${Date.now()}`,
        po_number: "MANUAL",
        supplier_name: discrepancyForm.vendor || "Unknown",
        status: "open",
        total_shortage_value: 0,
        items: [{
          product_name: discrepancyForm.item_description,
          shortage_quantity: Math.max(0, (parseFloat(discrepancyForm.expected_qty) || 0) - (parseFloat(discrepancyForm.actual_qty) || 0)),
          unit: "units",
        }],
      });
      if (error) throw error;
      toast.success("Discrepancy logged successfully");
      setLogDiscrepancyOpen(false);
      setDiscrepancyForm({ item_description: "", issue_type: "Shortage", expected_qty: "", actual_qty: "", vendor: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to log discrepancy");
    } finally {
      setIsSubmittingDiscrepancy(false);
    }
  };

  const fetchQualityData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all GRNs
      const grnList = materialReceipts || [];
      
      // Fetch GRN items for all GRNs to check quality
      const allTickets: QualityTicket[] = [];
      
      for (const grn of grnList) {
        const items = await fetchGRNItems(grn.id);
        
        // Filter items with quality issues
        items.forEach((item, index) => {
          if (item.quality_status && item.quality_status !== "good" && item.quality_status !== "pending") {
            let issueType: QualityTicket["issueType"] = "Partial";
            if (item.quality_status === "damaged") issueType = "Damaged";
            else if (item.quality_status === "rejected") issueType = "Wrong Item";
            else if (item.rejected_quantity > 0) issueType = "Shortage";

            let status: QualityTicket["status"] = "Under Review";
            if (grn.status === "accepted") status = "Resolved";
            else if (grn.status === "partial_accepted") status = "Debit Note Raised";
            else if (grn.status === "rejected") status = "Returned";

            allTickets.push({
              id: `TKT-Q-${grn.grn_number}-${index}`,
              grnId: grn.id,
              poRef: grn.po_number || "N/A",
              vendor: grn.supplier_name || "Unknown",
              item: item.product_name || item.item_description || "Unknown Item",
              issueType,
              recordedQty: item.received_quantity?.toString() || "0",
              expectedQty: item.ordered_quantity?.toString() || "0",
              status,
              qualityStatus: item.quality_status,
            });
          }
        });
      }

      setTickets(allTickets);

      // Calculate stats
      const shortage = allTickets.filter(t => t.issueType === "Shortage" || t.qualityStatus === "partial").length;
      const damaged = allTickets.filter(t => t.issueType === "Damaged" || t.qualityStatus === "damaged").length;
      const pending = allTickets.filter(t => t.status === "Under Review" || t.status === "Debit Note Raised").length;
      const resolved = allTickets.filter(t => t.status === "Resolved").length;
      const total = allTickets.length || 1;

      setStats({
        shortageNotes: shortage,
        damagedGoods: damaged,
        returnPending: pending,
        qualityAudit: Math.round((resolved / total) * 100),
      });

    } catch (err) {
      console.error("Error fetching quality tickets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch quality tickets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!grnLoading) {
      fetchQualityData();
    }
  }, [grnLoading, materialReceipts]);

  const columns: ColumnDef<QualityTicket>[] = [
    {
      accessorKey: "item",
      header: "Material / Item",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-info/5 flex items-center justify-center">
            <Box className="h-4 w-4 text-info" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.item}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">REF: {row.original.poRef} • {row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Origin Supplier",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground/80">{row.getValue("vendor")}</span>,
    },
    {
      accessorKey: "issueType",
      header: "Discrepancy",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.original.issueType === "Shortage" ? "bg-warning/5 text-warning border-warning/20" : "bg-critical/5 text-critical border-critical/20"
        )}>
            {row.getValue("issueType")}
        </Badge>
      ),
    },
    {
      accessorKey: "recordedQty",
      header: "Verification",
      cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="text-xs font-bold text-critical">Actual: {row.original.recordedQty}</span>
            <span className="text-[10px] text-muted-foreground font-medium">Expected: {row.original.expectedQty}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Resolution Path",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "Under Review": "bg-warning/10 text-warning border-warning/20",
              "Debit Note Raised": "bg-primary/10 text-primary border-primary/20",
              "Returned": "bg-critical/10 text-critical border-critical/20",
              "Resolved": "bg-success/10 text-success border-success/20",
              "Accepted": "bg-success/10 text-success border-success/20"
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
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Camera className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  const displayError = error || grnError;
  const displayLoading = isLoading || grnLoading;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Quality & Quantity Tickets"
        description="Logging material discrepancies, damaged goods, and shortage notes post-delivery verification."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={fetchQualityData}
              disabled={displayLoading}
            >
              <RefreshCw className={cn("h-4 w-4", displayLoading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setAuditLogsOpen(true)}>
               <FileSearch className="h-4 w-4" /> Audit Logs
            </Button>
            <Button className="gap-2 shadow-sm" onClick={() => setLogDiscrepancyOpen(true)}>
               <Plus className="h-4 w-4" /> Log Discrepancy
            </Button>
          </div>
        }
      />

      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        {displayLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4 text-left">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          [
            { label: "Shortage Notes", value: stats.shortageNotes.toString(), icon: Layers, color: "text-warning" },
            { label: "Damaged Goods", value: stats.damagedGoods.toString(), icon: AlertTriangle, color: "text-critical" },
            { label: "Return Pending (RTV)", value: stats.returnPending.toString(), icon: ArrowLeftRight, color: "text-primary" },
            { label: "Quality Audit", value: `${stats.qualityAudit}%`, icon: CheckCircle2, color: "text-success" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4 text-left">
                <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="discrepancies" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
          <TabsTrigger value="discrepancies" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">
            Discrepancy Log
          </TabsTrigger>
          <TabsTrigger value="shortage-notes" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">
            Shortage Notes
            {shortageStats.open > 0 && (
              <span className="ml-1.5 h-4 min-w-[16px] rounded-full bg-warning text-white text-[9px] px-1 flex items-center justify-center font-bold">
                {shortageStats.open}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies" className="pt-6">
          {displayLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <DataTable columns={columns} data={tickets} searchKey="item" />
          )}
        </TabsContent>

        <TabsContent value="shortage-notes" className="pt-6">
          {shortageLoading ? (
            <div className="flex items-center justify-center py-20">
              <Layers className="h-8 w-8 animate-pulse text-primary" />
            </div>
          ) : shortageNotes.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No shortage notes raised yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shortageNotes.map((note) => {
                const statusCfg = SHORTAGE_STATUS_CONFIG[note.status];
                return (
                  <Card key={note.id} className="border-none shadow-card ring-1 ring-border p-4">
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono font-bold text-sm">{note.note_number}</p>
                          <p className="text-xs text-muted-foreground">{note.supplier_name} — PO: {note.po_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-critical">
                            {formatCurrency(note.total_shortage_value * 100)}
                          </span>
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold ${statusCfg.className}`}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                      {note.items && note.items.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {note.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs bg-muted/30 px-3 py-1.5 rounded">
                              <span className="font-medium">{item.product_name}</span>
                              <span className="text-critical font-bold">
                                Short: {item.shortage_quantity} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Discrepancy Dialog */}
      <Dialog open={logDiscrepancyOpen} onOpenChange={setLogDiscrepancyOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Log Discrepancy</DialogTitle>
            <DialogDescription>Record a quality or quantity issue for a received item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Item Description *</Label>
              <Input
                value={discrepancyForm.item_description}
                onChange={e => setDiscrepancyForm({ ...discrepancyForm, item_description: e.target.value })}
                placeholder="e.g., Cleaning Agent 5L"
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={discrepancyForm.issue_type} onValueChange={v => setDiscrepancyForm({ ...discrepancyForm, issue_type: v as QualityTicket["issueType"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Shortage", "Damaged", "Expired", "Wrong Item", "Partial"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Qty</Label>
                <Input type="number" value={discrepancyForm.expected_qty} onChange={e => setDiscrepancyForm({ ...discrepancyForm, expected_qty: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Actual Qty</Label>
                <Input type="number" value={discrepancyForm.actual_qty} onChange={e => setDiscrepancyForm({ ...discrepancyForm, actual_qty: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendor / Supplier</Label>
              <Input value={discrepancyForm.vendor} onChange={e => setDiscrepancyForm({ ...discrepancyForm, vendor: e.target.value })} placeholder="Supplier name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDiscrepancyOpen(false)}>Cancel</Button>
            <Button onClick={handleLogDiscrepancy} disabled={isSubmittingDiscrepancy || !discrepancyForm.item_description}>
              {isSubmittingDiscrepancy ? "Saving..." : "Log Discrepancy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Dialog */}
      <Dialog open={auditLogsOpen} onOpenChange={setAuditLogsOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Quality Audit Logs</DialogTitle>
            <DialogDescription>Recent system activity related to quality and inventory checks.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No audit logs found.</p>
            ) : auditLogs.slice(0, 50).map(log => (
              <div key={log.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 text-xs">
                <div>
                  <p className="font-bold">{log.entity_type} — <span className="text-primary">{log.action}</span></p>
                  <p className="text-muted-foreground">{log.actor_name || "System"}</p>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setAuditLogsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

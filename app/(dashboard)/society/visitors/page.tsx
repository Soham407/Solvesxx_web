"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  History,
  Car,
  MoreHorizontal,
  DoorOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Users,
  User,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useVisitors, Visitor } from "@/hooks/useVisitors";
import { VisitorRegistrationDialog } from "@/components/society/VisitorRegistrationDialog";
import { VisitorAvatar } from "@/components/society/VisitorAvatar";
import { FamilyDirectory } from "@/components/visitors/FamilyDirectory";

export default function VisitorManagementPage() {
  const { role } = useAuth();
  const {
    visitors,
    activeVisitors,
    dailyHelpers,
    stats,
    isLoading,
    error,
    checkOutVisitor,
    approveVisitor,
    issueVisitorPass,
    markAsFrequent,
    setFilters,
    refresh,
  } = useVisitors({ status: "all" });

  const vendorVisitors = visitors.filter(
    (v) => v.visitor_type === "vendor" || v.visitor_type === "contractor",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [printVisitor, setPrintVisitor] = useState<Visitor | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [denialReasonVisitor, setDenialReasonVisitor] = useState<Visitor | null>(null);
  const canManageFrequentVisitors =
    role === "admin" ||
    role === "super_admin" ||
    role === "society_manager" ||
    role === "security_supervisor";

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ searchTerm, status: "active" });
  };

  // Handle checkout
  const handleCheckOut = async (visitorId: string) => {
    await checkOutVisitor(visitorId);
  };

  // Format time for display
  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get visitor type badge
  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      guest: { label: "Guest", className: "bg-primary/10 text-primary" },
      vendor: { label: "Vendor", className: "bg-warning/10 text-warning" },
      contractor: { label: "Contractor", className: "bg-info/10 text-info" },
      service_staff: { label: "Service", className: "bg-success/10 text-success" },
      daily_helper: { label: "Daily Staff", className: "bg-muted text-muted-foreground" },
    };
    const config = typeMap[type] || typeMap.guest;
    return (
      <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-[8px] uppercase font-bold", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const columns: ColumnDef<Visitor>[] = [
    {
      accessorKey: "visitor_name",
      header: "Visitor Details",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <VisitorAvatar 
            photoUrl={row.original.photo_url} 
            name={row.original.visitor_name} 
            className="h-10 w-10 border shadow-sm"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.visitor_name}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              {getTypeBadge(row.original.visitor_type)}
              <span>{row.original.phone || "No phone"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "flat",
      header: "Destination",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground/90">
            {row.original.flat?.building?.building_name || "Unknown"} - {row.original.flat?.flat_number || "N/A"}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.original.purpose || "Visit"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "vehicle_number",
      header: "Vehicle",
      cell: ({ row }) =>
        !row.original.vehicle_number || row.original.vehicle_number === "None" ? (
          <span className="text-xs text-muted-foreground italic">Walk-in</span>
        ) : (
          <div className="flex items-center gap-2">
            <Car className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-bold bg-muted px-1.5 py-1 rounded">
              {row.original.vehicle_number}
            </span>
          </div>
        ),
    },
    {
      accessorKey: "entry_time",
      header: "Entry Time",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{formatTime(row.original.entry_time)}</span>
        </div>
      ),
    },
    {
      accessorKey: "approved_by_resident",
      header: "Status",
      cell: ({ row }) => {
        const isApproved = row.original.approved_by_resident;
        const isExited = !!row.original.exit_time;

        if (isExited) return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 italic">Checked Out</Badge>;
        
        if (isApproved === true) return <Badge variant="outline" className="bg-success/10 text-success border-success/20 animate-pulse-soft font-bold">● In Building</Badge>;
        if (isApproved === false) return <Badge variant="outline" className="bg-critical/10 text-critical border-critical/20 font-bold uppercase text-[9px]">Entry Denied</Badge>;
        
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 animate-pulse font-bold">Awaiting Approval</Badge>;
      },
    },
    {
      id: "resident_audit",
      header: "Resident Decision",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-semibold">
            {row.original.resident?.full_name || "Resident not linked"}
          </span>
          {row.original.approved_by_resident === null && (
            <span className="text-warning font-medium">Approval pending</span>
          )}
          {row.original.approved_by_resident === false && (
            <span className="text-critical font-medium">
              Denied{row.original.rejection_reason ? `: ${row.original.rejection_reason}` : ""}
            </span>
          )}
          {row.original.approved_by_resident === true && (
            <span className="text-success font-medium">
              Approved{row.original.visitor_pass_number ? ` • Pass ${row.original.visitor_pass_number}` : ""}
            </span>
          )}
          {row.original.bypass_reason && (
            <span className="text-muted-foreground">Bypass: {row.original.bypass_reason}</span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isExited = !!row.original.exit_time;
        return (
          <div className="flex items-center gap-2">
            {!isExited && row.original.approved_by_resident === true && !row.original.visitor_pass_number && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-primary shadow-glow font-bold uppercase transition-all hover:scale-105 active:scale-95"
                onClick={() => issueVisitorPass(row.original.id)}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Issue Pass
              </Button>
            )}
            {!isExited && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/5"
                onClick={() => handleCheckOut(row.original.id)}
              >
                <DoorOpen className="h-3.5 w-3.5" /> Out
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.original.rejection_reason && (
                  <DropdownMenuItem onClick={() => setDenialReasonVisitor(row.original)}>
                    <AlertCircle className="h-4 w-4 mr-2 text-critical" /> View Denial Reason
                  </DropdownMenuItem>
                )}
                {canManageFrequentVisitors && (
                  <DropdownMenuItem onClick={() => markAsFrequent(row.original.id, !row.original.is_frequent_visitor)}>
                    <Users className="h-4 w-4 mr-2" />
                    {row.original.is_frequent_visitor ? "Remove from Daily Helpers" : "Add to Daily Helpers"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setPrintVisitor(row.original)}>
                  <Printer className="h-4 w-4 mr-2" /> Print Pass
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedVisitor(row.original)}>
                   <User className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Visitor Management"
        description="Monitor real-time visitor movement and guest credentials for the society."
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={refresh}>
              <History className="h-4 w-4" /> Movement Logs
            </Button>
            <Button 
                className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20"
                onClick={() => setIsRegistrationOpen(true)}
            >
              <UserPlus className="h-4 w-4" /> Quick Entry
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Active Visitors", value: stats.activeVisitors.toString(), sub: "Currently in building", icon: DoorOpen, color: "text-primary" },
          { label: "Today Total", value: stats.todayTotal.toString(), sub: "Entries since midnight", icon: History, color: "text-info" },
          { label: "Pre-Approved", value: stats.preApproved.toString(), sub: "Daily helpers today", icon: CheckCircle2, color: "text-success" },
          { label: "Denied Entry", value: stats.deniedEntry.toString(), sub: "Not approved by resident", icon: XCircle, color: "text-critical" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
          <TabsTrigger
            value="active"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            In the Building ({activeVisitors.length})
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            Daily Helpers ({dailyHelpers.length})
          </TabsTrigger>
          <TabsTrigger
            value="vendors"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            Vendors & Contractors ({vendorVisitors.length})
          </TabsTrigger>
          <TabsTrigger
            value="residents"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            Family Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="pt-6">
          {activeVisitors.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <CardDescription>No active visitors in the building</CardDescription>
            </div>
          ) : (
            <DataTable columns={columns} data={activeVisitors} searchKey="visitor_name" />
          )}
        </TabsContent>

        <TabsContent value="daily" className="pt-6">
          {dailyHelpers.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <CardDescription>No daily helpers registered yet. Mark frequent visitors as "Daily Helpers" to see them here.</CardDescription>
            </div>
          ) : (
            <DataTable columns={columns} data={dailyHelpers} searchKey="visitor_name" />
          )}
        </TabsContent>

        <TabsContent value="vendors" className="pt-6">
          {vendorVisitors.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <CardDescription>No vendor or contractor visits logged yet. Log a visitor with type "Vendor" or "Contractor" to see them here.</CardDescription>
            </div>
          ) : (
            <DataTable columns={columns} data={vendorVisitors} searchKey="visitor_name" />
          )}
        </TabsContent>

        <TabsContent value="residents" className="pt-6">
          <FamilyDirectory />
        </TabsContent>
      </Tabs>

      <VisitorRegistrationDialog
        open={isRegistrationOpen}
        onOpenChange={setIsRegistrationOpen}
        onSuccess={refresh}
      />

      {/* Print Pass overlay — only rendered during window.print() */}
      {printVisitor && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:hidden">
            <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
              <h2 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" /> Visitor Pass Preview
              </h2>
              <div id="visitor-pass-print-area" className="border rounded-xl p-4 bg-white text-black space-y-2">
                <div className="text-center font-bold text-base">{printVisitor.visitor_name}</div>
                <div className="text-center text-xs text-gray-600">{printVisitor.visitor_type?.toUpperCase()}</div>
                <hr />
                <div className="text-xs space-y-1">
                  <div><span className="font-bold">Flat:</span> {printVisitor.flat?.building?.building_name || "—"} - {printVisitor.flat?.flat_number || "N/A"}</div>
                  <div><span className="font-bold">Purpose:</span> {printVisitor.purpose || "Visit"}</div>
                  <div><span className="font-bold">Entry:</span> {new Date(printVisitor.entry_time).toLocaleString("en-IN")}</div>
                  {printVisitor.visitor_pass_number && (
                    <div><span className="font-bold">Pass #:</span> {printVisitor.visitor_pass_number}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => {
                  const el = document.getElementById("visitor-pass-print-area");
                  if (!el) return;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(`<html><head><title>Visitor Pass</title><style>body{font-family:sans-serif;padding:20px;max-width:300px}</style></head><body>${el.innerHTML}</body></html>`);
                  win.document.close();
                  win.print();
                  win.close();
                }}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="outline" onClick={() => setPrintVisitor(null)}>Close</Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(selectedVisitor)} onOpenChange={(open) => !open && setSelectedVisitor(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Visitor Details</DialogTitle>
          </DialogHeader>
          {selectedVisitor ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <VisitorAvatar photoUrl={selectedVisitor.photo_url} name={selectedVisitor.visitor_name} className="h-14 w-14 border" />
                <div>
                  <div className="font-bold text-base">{selectedVisitor.visitor_name}</div>
                  <div className="text-muted-foreground">{selectedVisitor.phone || "Phone not provided"}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destination</div>
                  <div className="mt-1 font-medium">
                    {selectedVisitor.flat?.building?.building_name || "Unknown"} - {selectedVisitor.flat?.flat_number || "N/A"}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purpose</div>
                  <div className="mt-1 font-medium">{selectedVisitor.purpose || "Visit"}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resident Decision</div>
                  <div className="mt-1 font-medium">
                    {selectedVisitor.approved_by_resident === true
                      ? "Approved"
                      : selectedVisitor.approved_by_resident === false
                        ? "Denied"
                        : "Pending approval"}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entry Time</div>
                  <div className="mt-1 font-medium">{new Date(selectedVisitor.entry_time).toLocaleString("en-IN")}</div>
                </div>
              </div>
              {selectedVisitor.visitor_pass_number ? (
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visitor Pass</div>
                  <div className="mt-1 font-medium">{selectedVisitor.visitor_pass_number}</div>
                </div>
              ) : null}
              {selectedVisitor.photo_url ? (
                <div className="rounded-xl border p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Photo</div>
                  <img src={selectedVisitor.photo_url} alt={selectedVisitor.visitor_name} className="mt-3 max-h-[360px] w-full rounded-lg border object-contain bg-muted/30" />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(denialReasonVisitor)} onOpenChange={(open) => !open && setDenialReasonVisitor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resident Denial Reason</DialogTitle>
          </DialogHeader>
          {denialReasonVisitor ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{denialReasonVisitor.visitor_name}</p>
              <div className="rounded-xl border p-3 text-muted-foreground">
                {denialReasonVisitor.rejection_reason || "No denial reason was captured."}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

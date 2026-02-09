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
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVisitors, Visitor } from "@/hooks/useVisitors";

export default function VisitorManagementPage() {
  const {
    activeVisitors,
    dailyHelpers,
    stats,
    isLoading,
    error,
    checkOutVisitor,
    markAsFrequent,
    setFilters,
    refresh,
  } = useVisitors({ status: "active" });

  const [searchTerm, setSearchTerm] = useState("");

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
          <Avatar className="h-10 w-10 border shadow-sm">
            <AvatarImage src={row.original.photo_url || undefined} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {row.original.visitor_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            row.original.approved_by_resident
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20",
            "animate-pulse-soft"
          )}
        >
          ● {row.original.exit_time ? "Completed" : row.original.approved_by_resident ? "In Building" : "Pending Approval"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {!row.original.exit_time && (
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
              <DropdownMenuItem onClick={() => markAsFrequent(row.original.id, !row.original.is_frequent_visitor)}>
                {row.original.is_frequent_visitor ? "Remove from Daily Helpers" : "Add to Daily Helpers"}
              </DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Print Pass</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
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
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={refresh}>
              <History className="h-4 w-4" /> Movement Logs
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
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

        <TabsContent value="residents" className="pt-6">
          <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <CardDescription>Society Family Database for guard-side verification. Coming soon.</CardDescription>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

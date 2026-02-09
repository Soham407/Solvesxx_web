"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Battery,
  Smartphone,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  Signal,
  Navigation,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useSecurityGuards, SecurityGuard, GuardGrade } from "@/hooks/useSecurityGuards";

export default function SecurityCommandPage() {
  const {
    guards,
    activeGuards,
    guardLocations,
    stats,
    isLoading,
    error,
    getGuardStatus,
    getBatteryStatus,
    filters,
    setFilters,
    refresh,
    refreshLocations,
  } = useSecurityGuards();

  const [selectedGuard, setSelectedGuard] = useState<SecurityGuard | null>(null);

  // Format time for display
  const formatTime = (isoDate: string | null) => {
    if (!isoDate) return "N/A";
    return new Date(isoDate).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get grade badge color
  const getGradeBadge = (grade: GuardGrade) => {
    const colors: Record<GuardGrade, string> = {
      A: "bg-success/10 text-success border-success/20",
      B: "bg-primary/10 text-primary border-primary/20",
      C: "bg-warning/10 text-warning border-warning/20",
      D: "bg-muted text-muted-foreground border-muted",
    };
    return colors[grade] || colors.D;
  };

  // Table columns
  const columns: ColumnDef<SecurityGuard>[] = [
    {
      accessorKey: "employee",
      header: "Guard Details",
      cell: ({ row }) => {
        const guard = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border shadow-sm">
              <AvatarImage src={guard.employee?.photo_url || undefined} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {guard.employee?.first_name?.[0]}{guard.employee?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {guard.employee?.first_name} {guard.employee?.last_name}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
                <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-[8px]", getGradeBadge(guard.grade))}>
                  Grade {guard.grade}
                </Badge>
                <span>{guard.guard_code}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "assigned_location",
      header: "Assigned Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            {row.original.assigned_location?.location_name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "attendance",
      header: "Shift Status",
      cell: ({ row }) => {
        const guard = row.original;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">
                In: {formatTime(guard.attendance?.check_in_time || null)}
              </span>
            </div>
            {guard.attendance?.check_out_time && (
              <span className="text-xs text-muted-foreground">
                Out: {formatTime(guard.attendance.check_out_time)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = getGuardStatus(row.original);
        return (
          <Badge variant="outline" className={cn("font-bold", status.color)}>
            ● {status.label}
          </Badge>
        );
      },
    },
    {
      id: "battery",
      header: "Device",
      cell: ({ row }) => {
        const battery = getBatteryStatus(row.original);
        const location = guardLocations.get(row.original.employee_id);
        
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Battery className={cn("h-4 w-4", battery.color)} />
              <span className={cn("text-xs font-bold", battery.color)}>
                {battery.level !== null ? `${battery.level}%` : "N/A"}
              </span>
            </div>
            {location && (
              <div className="flex items-center gap-1">
                <Signal className="h-3.5 w-3.5 text-success" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedGuard(row.original)}>
              View on Map
            </DropdownMenuItem>
            <DropdownMenuItem>Contact Guard</DropdownMenuItem>
            <DropdownMenuItem>View Patrol Log</DropdownMenuItem>
            <DropdownMenuItem>View Checklist Status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Security Command Center"
        description="Real-time monitoring of security personnel, GPS tracking, and patrol management."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshLocations} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh GPS
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Shield className="h-4 w-4" /> Dispatch Guard
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats.totalGuards}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Guards</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-success">{stats.activeOnDuty}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active On Duty</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-warning">{stats.inactiveAlerts}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Inactivity Alerts</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-critical">{stats.geoFenceBreaches}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Geo-fence Breaches</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-critical/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-critical" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-card ring-1 ring-border h-[400px] relative overflow-hidden">
            <CardHeader className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background to-transparent pb-8">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" /> Live Guard Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-full">
              {/* Map Placeholder - Shows guard positions */}
              <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/60" />
              
              {/* Guard markers on map */}
              <div className="absolute inset-0 flex items-center justify-center">
                {activeGuards.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 text-center p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl max-w-xs ring-1 ring-border">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold">No Active Guards</h3>
                    <p className="text-xs text-muted-foreground">
                      No guards are currently on duty. GPS positions will appear here when guards check in.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl max-w-md ring-1 ring-border">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-success" />
                    </div>
                    <h3 className="font-bold">{activeGuards.length} Guards Tracking</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {activeGuards.slice(0, 5).map((guard) => {
                        const location = guardLocations.get(guard.employee_id);
                        const status = getGuardStatus(guard);
                        return (
                          <Badge 
                            key={guard.id} 
                            variant="outline" 
                            className={cn("gap-1", status.color)}
                          >
                            <User className="h-3 w-3" />
                            {guard.employee?.first_name} {guard.employee?.last_name?.[0]}.
                            {location && (
                              <Signal className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        );
                      })}
                      {activeGuards.length > 5 && (
                        <Badge variant="outline">+{activeGuards.length - 5} more</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Full map integration with Leaflet/Google Maps coming soon. Currently tracking via GPS table.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* Filters */}
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                value={filters.grade || "all"} 
                onValueChange={(val) => setFilters({ ...filters, grade: val === "all" ? undefined : val as GuardGrade })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">Grade A (Premium)</SelectItem>
                  <SelectItem value="B">Grade B (Corporate)</SelectItem>
                  <SelectItem value="C">Grade C (Standard)</SelectItem>
                  <SelectItem value="D">Grade D (Basic)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Active Guards Quick List */}
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase flex items-center justify-between">
                <span>Active Guards</span>
                <Badge variant="outline" className="text-success bg-success/10">
                  {activeGuards.length} Online
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {activeGuards.length === 0 ? (
                  <div className="p-6 text-center">
                    <CardDescription>No guards currently on duty</CardDescription>
                  </div>
                ) : (
                  activeGuards.slice(0, 6).map((guard) => {
                    const status = getGuardStatus(guard);
                    const battery = getBatteryStatus(guard);
                    return (
                      <div key={guard.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={guard.employee?.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {guard.employee?.first_name?.[0]}{guard.employee?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {guard.employee?.first_name} {guard.employee?.last_name?.[0]}.
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {guard.assigned_location?.location_name || "Unassigned"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold", battery.color)}>
                            {battery.level !== null ? `${battery.level}%` : ""}
                          </span>
                          <div className={cn("h-2 w-2 rounded-full", 
                            status.label === "Active" ? "bg-success" : 
                            status.label === "Inactive" ? "bg-critical animate-pulse" : "bg-warning"
                          )} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Guard Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> All Security Personnel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable columns={columns} data={guards} searchKey="guard_code" />
        </CardContent>
      </Card>
    </div>
  );
}

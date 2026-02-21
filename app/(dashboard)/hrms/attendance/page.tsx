"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  UserCheck, 
  MapPin, 
  Camera, 
  Clock, 
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Navigation,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LiveMap } from "@/components/shared/LiveMap";
import { supabase } from "@/src/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManualAdjustmentDialog } from "@/components/dialogs/ManualAdjustmentDialog";

// Site location for geo-fencing (Bangalore example - replace with actual company coordinates)
const SITE_LOCATION = { lat: 12.9716, lng: 77.5946 };
const MAX_DISTANCE_METERS = 500; // 500m radius

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

interface AttendanceRecord {
  id: string;
  employee: string;
  employeeId: string;
  shift: string;
  checkIn: string;
  checkOut?: string;
  location: string;
  verification: "Selfie + GPS" | "GPS Only" | "Remote" | "Remote + Selfie" | "Manual" | "Failed" | "Pending";
  status: "Present" | "Late" | "On Leave" | "Absent";
  latitude?: number;
  longitude?: number;
}

interface AttendanceStats {
  onDuty: number;
  absent: number;
  avgPunchIn: string;
  lateArrivals: number;
}

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    onDuty: 0,
    absent: 0,
    avgPunchIn: "--:--",
    lateArrivals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];

      // Fetch today's attendance with employee details
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_logs")
        .select(`
          id,
          employee_id,
          check_in_time,
          check_out_time,
          check_in_latitude,
          check_in_longitude,
          check_in_selfie_url,
          status,
          employees:employee_id (
            first_name,
            last_name,
            employee_code
          )
        `)
        .eq("log_date", today)
        .order("check_in_time", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch shift assignments for employees
      const employeeIds = attendanceData?.map((a: any) => a.employee_id) || [];
      let shiftMap: Record<string, string> = {};

      if (employeeIds.length > 0) {
        const { data: shiftData, error: shiftError } = await supabase
          .from("employee_shift_assignments")
          .select(`
            employee_id,
            shifts (
              shift_name,
              start_time,
              end_time
            )
          `)
          .eq("is_active", true)
          .in("employee_id", employeeIds);

        if (!shiftError && shiftData) {
          shiftData.forEach((s: any) => {
            const shift = Array.isArray(s.shifts) ? s.shifts[0] : s.shifts;
            if (shift) {
              shiftMap[s.employee_id] = `${shift.shift_name} (${shift.start_time?.substring(0, 5)}-${shift.end_time?.substring(0, 5)})`;
            }
          });
        }
      }

      // Fetch site location
      const { data: locationData } = await supabase
        .from('company_locations')
        .select('latitude, longitude')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      const currentSiteLat = locationData?.latitude ? Number(locationData.latitude) : SITE_LOCATION.lat;
      const currentSiteLng = locationData?.longitude ? Number(locationData.longitude) : SITE_LOCATION.lng;

      // Transform data
      const records: AttendanceRecord[] = (attendanceData || []).map((log: any) => {
        const emp = log.employees || {};
        const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unknown";
        
        let status: AttendanceRecord["status"] = "Present";
        if (log.status === "absent") status = "Absent";
        else if (log.status === "late") status = "Late";
        else if (log.status === "on_leave") status = "On Leave";

        // Calculate distance from site for geo-fencing
        let location = "Manual Entry";
        let verification: AttendanceRecord["verification"] = "Pending";
        
        if (log.check_in_latitude && log.check_in_longitude) {
          const distance = haversineDistance(
            log.check_in_latitude,
            log.check_in_longitude,
            currentSiteLat,
            currentSiteLng
          );
          
          if (distance > MAX_DISTANCE_METERS) {
            location = `Off-Site (${Math.round(distance)}m away)`;
            verification = log.check_in_selfie_url ? "Remote + Selfie" : "Remote";
          } else {
            location = "GPS Verified";
            verification = log.check_in_selfie_url ? "Selfie + GPS" : "GPS Only";
          }
        } else if (log.check_in_time) {
          verification = "Manual";
        }

        return {
          id: log.employee_code || log.employee_id?.substring(0, 8),
          employee: fullName,
          employeeId: log.employee_id,
          shift: shiftMap[log.employee_id] || "General Shift",
          checkIn: log.check_in_time 
            ? new Date(log.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "-",
          checkOut: log.check_out_time
            ? new Date(log.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : undefined,
          location,
          verification,
          status,
          latitude: log.check_in_latitude,
          longitude: log.check_in_longitude,
        };
      });

      setData(records);

      // Calculate stats
      const onDuty = records.filter(r => r.status === "Present" && !r.checkOut).length;
      const absent = records.filter(r => r.status === "Absent").length;
      const late = records.filter(r => r.status === "Late").length;

      // Calculate average punch-in time
      const punchInTimes = records
        .filter(r => r.checkIn !== "-")
        .map(r => {
          const [hours, minutes] = r.checkIn.split(":").map(Number);
          return hours * 60 + minutes;
        });

      const avgPunchIn = punchInTimes.length > 0
        ? Math.round(punchInTimes.reduce((a, b) => a + b, 0) / punchInTimes.length)
        : null;

      const avgPunchInStr = avgPunchIn
        ? `${String(Math.floor(avgPunchIn / 60)).padStart(2, "0")}:${String(avgPunchIn % 60).padStart(2, "0")}`
        : "--:--";

      setStats({
        onDuty,
        absent,
        avgPunchIn: avgPunchInStr,
        lateArrivals: late,
      });

    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "employee",
      header: "Employee / Personnel",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {row.original.employee.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.employee}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.shift}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "checkIn",
      header: "Check-In",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("text-xs font-bold", row.original.status === "Late" ? "text-warning" : "text-foreground")}>
            {row.getValue("checkIn")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Geo-Fence Point",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{row.getValue("location")}</span>
        </div>
      ),
    },
    {
      accessorKey: "verification",
      header: "Verification",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.verification === "Selfie + GPS" ? (
            <>
              <div className="flex -space-x-1">
                <div className="h-5 w-5 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <Camera className="h-2.5 w-2.5 text-success" />
                </div>
                <div className="h-5 w-5 rounded-full bg-info/10 border border-info/20 flex items-center justify-center">
                  <Navigation className="h-2.5 w-2.5 text-info" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{row.getValue("verification")}</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-critical uppercase">{row.getValue("verification")}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Daily Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        const variants: Record<string, string> = {
          "Present": "bg-success/10 text-success border-success/20",
          "Late": "bg-warning/10 text-warning border-warning/20",
          "Absent": "bg-critical/10 text-critical border-critical/20",
          "On Leave": "bg-info/10 text-info border-info/20"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Entry</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Prepare map markers from real data
  const mapMarkers = data
    .filter(r => r.latitude && r.longitude)
    .map(r => ({
      id: r.employeeId,
      label: r.employee,
      lat: r.latitude!,
      lng: r.longitude!,
      status: r.status === "Present" ? "active" as const : "warning" as const,
    }));

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Smart Attendance"
        description="Verify personnel identity and geo-fence compliance using Selfie + GPS mapping."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={fetchAttendanceData}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Export Monthly
            </Button>
            <ManualAdjustmentDialog>
              <Button className="gap-2 shadow-sm">
                <UserCheck className="h-4 w-4" /> Manual Adjustment
              </Button>
            </ManualAdjustmentDialog>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <LiveMap 
        className="mb-8"
        markers={mapMarkers}
      />

      <div className="grid gap-6 md:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4">
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
            { label: "On Duty Now", value: stats.onDuty.toString(), sub: "Currently checked in", icon: ShieldCheck, color: "text-primary" },
            { label: "Absent Today", value: stats.absent.toString(), sub: "Personnel missing", icon: AlertCircle, color: "text-critical" },
            { label: "Avg. Punch-In", value: stats.avgPunchIn, sub: "Time compliance", icon: Clock, color: "text-info" },
            { label: "Late Arrivals", value: stats.lateArrivals.toString(), sub: "Past grace period", icon: Navigation, color: "text-warning" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
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
          ))
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data} searchKey="employee" />
      )}
    </div>
  );
}

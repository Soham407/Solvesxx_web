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
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManualAdjustmentDialog } from "@/components/dialogs/ManualAdjustmentDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";

// Roles that get the full admin attendance management view
const ATTENDANCE_MANAGER_ROLES = new Set([
  "admin",
  "super_admin",
  "company_hod",
  "society_manager",
  "hr_manager",
]);

// Haversine formula to calculate distance between two coordinates
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface AttendanceRecord {
  id: string;
  employee: string;
  employeeId: string;
  shift: string;
  checkIn: string;
  checkOut?: string;
  location: string;
  verification:
    | "Selfie + GPS"
    | "GPS Only"
    | "Remote"
    | "Remote + Selfie"
    | "Manual"
    | "Failed"
    | "Pending"
    | "Location Not Configured";
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

// ─── Personal (guard/employee) view ────────────────────────────────────────

interface PersonalRecord {
  id: string;
  rawDate: string; // YYYY-MM-DD for filtering
  logDate: string;
  checkIn: string;
  checkOut: string;
  shift: string;
  status: "Present" | "Late" | "On Leave" | "Absent";
  verification: string;
  hoursWorked: string;
}

interface PersonalStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePct: number;
}

function MyAttendanceView({ employeeId }: { employeeId: string }) {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [stats, setStats] = useState<PersonalStats>({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    attendancePct: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchMyAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Last 30 days
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().split("T")[0];

      const { data, error: fetchError } = await supabase
        .from("attendance_logs")
        .select(`
          id,
          log_date,
          check_in_time,
          check_out_time,
          check_in_selfie_url,
          check_in_latitude,
          check_in_longitude,
          check_in_location_id,
          status
        `)
        .eq("employee_id", employeeId)
        .gte("log_date", sinceStr)
        .order("log_date", { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch shift for this employee
      const { data: shiftData } = await supabase
        .from("employee_shift_assignments")
        .select(`shifts ( shift_name, start_time, end_time )`)
        .eq("employee_id", employeeId)
        .eq("is_active", true)
        .limit(1)
        .single();

      const shiftLabel = (() => {
        const s = shiftData?.shifts;
        if (!s) return "General Shift";
        const shift = Array.isArray(s) ? s[0] : s;
        if (!shift) return "General Shift";
        return `${shift.shift_name} (${shift.start_time?.substring(0, 5)}–${shift.end_time?.substring(0, 5)})`;
      })();

      const mapped: PersonalRecord[] = (data || []).map((log: any) => {
        let status: PersonalRecord["status"] = "Present";
        if (log.status === "absent") status = "Absent";
        else if (log.status === "late") status = "Late";
        else if (log.status === "on_leave") status = "On Leave";

        const hasSelfie = !!log.check_in_selfie_url;
        const hasGPS = !!(log.check_in_latitude && log.check_in_longitude);
        const verification = hasSelfie && hasGPS
          ? "Selfie + GPS"
          : hasSelfie
          ? "Selfie Only"
          : hasGPS
          ? "GPS Only"
          : log.check_in_time
          ? "Manual"
          : "–";

        let hoursWorked = "–";
        if (log.check_in_time && log.check_out_time) {
          const ms =
            new Date(log.check_out_time).getTime() -
            new Date(log.check_in_time).getTime();
          const hrs = Math.floor(ms / 3600000);
          const mins = Math.floor((ms % 3600000) / 60000);
          hoursWorked = `${hrs}h ${mins}m`;
        }

        return {
          id: log.id,
          rawDate: log.log_date, // keep YYYY-MM-DD for range filtering
          logDate: new Date(log.log_date).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          checkIn: log.check_in_time
            ? new Date(log.check_in_time).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "–",
          checkOut: log.check_out_time
            ? new Date(log.check_out_time).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "–",
          shift: shiftLabel,
          status,
          verification,
          hoursWorked,
        };
      });

      setRecords(mapped);

      const total = mapped.length;
      const present = mapped.filter(
        (r) => r.status === "Present" || r.status === "Late"
      ).length;
      const absent = mapped.filter((r) => r.status === "Absent").length;
      const late = mapped.filter((r) => r.status === "Late").length;

      setStats({
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attendance"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, [employeeId]);

  const columns: ColumnDef<PersonalRecord>[] = [
    {
      accessorKey: "logDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.getValue("logDate")}</span>
      ),
    },
    {
      accessorKey: "shift",
      header: "Shift",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue("shift")}
        </span>
      ),
    },
    {
      accessorKey: "checkIn",
      header: "Clock In",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span
            className={cn(
              "text-xs font-bold",
              row.original.status === "Late"
                ? "text-warning"
                : "text-foreground"
            )}
          >
            {row.getValue("checkIn")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "checkOut",
      header: "Clock Out",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {row.getValue("checkOut")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => (
        <span className="text-xs font-bold">{row.getValue("hoursWorked")}</span>
      ),
    },
    {
      accessorKey: "verification",
      header: "Verification",
      cell: ({ row }) => (
        <span className="text-[10px] font-bold uppercase text-muted-foreground">
          {row.getValue("verification")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        const variants: Record<string, string> = {
          Present: "bg-success/10 text-success border-success/20",
          Late: "bg-warning/10 text-warning border-warning/20",
          Absent: "bg-critical/10 text-critical border-critical/20",
          "On Leave": "bg-info/10 text-info border-info/20",
        };
        return (
          <Badge
            variant="outline"
            className={cn(
              "font-bold text-[10px] uppercase h-5",
              variants[val] || ""
            )}
          >
            {val}
          </Badge>
        );
      },
    },
  ];

  const statCards = [
    {
      label: "Days Present",
      value: stats.presentDays,
      sub: "Last 30 days",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Days Absent",
      value: stats.absentDays,
      sub: "Last 30 days",
      icon: XCircle,
      color: "text-critical",
    },
    {
      label: "Late Arrivals",
      value: stats.lateDays,
      sub: "Last 30 days",
      icon: Timer,
      color: "text-warning",
    },
    {
      label: "Attendance Rate",
      value: `${stats.attendancePct}%`,
      sub: "Monthly compliance",
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="My Attendance"
        description="Your personal attendance history for the last 30 days."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={fetchMyAttendance}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        {isLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Card
                  key={i}
                  className="border-none shadow-card ring-1 ring-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))
          : statCards.map((stat, i) => (
              <Card
                key={i}
                className="border-none shadow-card ring-1 ring-border p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center",
                      stat.color
                    )}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                      {stat.label}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">From</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
          />
        </div>
        {(filterFrom || filterTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => { setFilterFrom(""); setFilterTo(""); }}
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (() => {
        const filtered = records.filter((r) => {
          const raw = r.rawDate;
          if (filterFrom && raw < filterFrom) return false;
          if (filterTo && raw > filterTo) return false;
          return true;
        });
        return filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No attendance records found{filterFrom || filterTo ? " for the selected date range" : " for the last 30 days"}.
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        );
      })()}
    </div>
  );
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminAttendanceView() {
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
          check_in_location_id,
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

      const { data: allLocations } = await supabase
        .from("company_locations")
        .select("id, latitude, longitude, geo_fence_radius")
        .eq("is_active", true);

      const locationsMap: Record<
        string,
        { lat: number; lng: number; radiusMeters: number }
      > = {};
      (allLocations || []).forEach((loc: any) => {
        if (loc.latitude && loc.longitude) {
          locationsMap[loc.id] = {
            lat: Number(loc.latitude),
            lng: Number(loc.longitude),
            radiusMeters: Number(loc.geo_fence_radius) || 50,
          };
        }
      });

      const records: AttendanceRecord[] = (attendanceData || []).map(
        (log: any) => {
          const emp = log.employees || {};
          const fullName =
            `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
            "Unknown";

          let status: AttendanceRecord["status"] = "Present";
          if (log.status === "absent") status = "Absent";
          else if (log.status === "late") status = "Late";
          else if (log.status === "on_leave") status = "On Leave";

          const siteCoords = log.check_in_location_id
            ? locationsMap[log.check_in_location_id]
            : null;

          let location = "Manual Entry";
          let verification: AttendanceRecord["verification"] = "Pending";

          if (!siteCoords && (log.check_in_latitude || log.check_in_longitude)) {
            location = "GPS Captured";
            verification = "Location Not Configured";
          } else if (
            log.check_in_latitude &&
            log.check_in_longitude &&
            siteCoords
          ) {
            const distance = haversineDistance(
              log.check_in_latitude,
              log.check_in_longitude,
              siteCoords.lat,
              siteCoords.lng
            );
            if (distance > siteCoords.radiusMeters) {
              location = `Off-Site (${Math.round(distance)}m away)`;
              verification = log.check_in_selfie_url
                ? "Remote + Selfie"
                : "Remote";
            } else {
              location = "GPS Verified";
              verification = log.check_in_selfie_url
                ? "Selfie + GPS"
                : "GPS Only";
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
              ? new Date(log.check_in_time).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            checkOut: log.check_out_time
              ? new Date(log.check_out_time).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : undefined,
            location,
            verification,
            status,
            latitude: log.check_in_latitude,
            longitude: log.check_in_longitude,
          };
        }
      );

      setData(records);

      const onDuty = records.filter(
        (r) => r.status === "Present" && !r.checkOut
      ).length;
      const absent = records.filter((r) => r.status === "Absent").length;
      const late = records.filter((r) => r.status === "Late").length;

      const punchInTimes = records
        .filter((r) => r.checkIn !== "-")
        .map((r) => {
          const [hours, minutes] = r.checkIn.split(":").map(Number);
          return hours * 60 + minutes;
        });

      const avgPunchIn =
        punchInTimes.length > 0
          ? Math.round(
              punchInTimes.reduce((a, b) => a + b, 0) / punchInTimes.length
            )
          : null;

      const avgPunchInStr = avgPunchIn
        ? `${String(Math.floor(avgPunchIn / 60)).padStart(2, "0")}:${String(
            avgPunchIn % 60
          ).padStart(2, "0")}`
        : "--:--";

      setStats({ onDuty, absent, avgPunchIn: avgPunchInStr, lateArrivals: late });
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch attendance data"
      );
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
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.shift}
            </span>
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
          <span
            className={cn(
              "text-xs font-bold",
              row.original.status === "Late"
                ? "text-warning"
                : "text-foreground"
            )}
          >
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
          {row.original.verification === "Location Not Configured" ? (
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold bg-warning/10 text-warning border-warning/20"
            >
              Location Not Configured
            </Badge>
          ) : row.original.verification === "Selfie + GPS" ? (
            <>
              <div className="flex -space-x-1">
                <div className="h-5 w-5 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <Camera className="h-2.5 w-2.5 text-success" />
                </div>
                <div className="h-5 w-5 rounded-full bg-info/10 border border-info/20 flex items-center justify-center">
                  <Navigation className="h-2.5 w-2.5 text-info" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                {row.getValue("verification")}
              </span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-critical uppercase">
              {row.getValue("verification")}
            </span>
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
          Present: "bg-success/10 text-success border-success/20",
          Late: "bg-warning/10 text-warning border-warning/20",
          Absent: "bg-critical/10 text-critical border-critical/20",
          "On Leave": "bg-info/10 text-info border-info/20",
        };
        return (
          <Badge
            variant="outline"
            className={cn(
              "font-bold text-[10px] uppercase h-5",
              variants[val] || ""
            )}
          >
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
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
              Refresh
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

      <div className="grid gap-6 md:grid-cols-4">
        {isLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Card
                  key={i}
                  className="border-none shadow-card ring-1 ring-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))
          : [
              {
                label: "On Duty Now",
                value: stats.onDuty.toString(),
                sub: "Currently checked in",
                icon: ShieldCheck,
                color: "text-primary",
              },
              {
                label: "Absent Today",
                value: stats.absent.toString(),
                sub: "Personnel missing",
                icon: AlertCircle,
                color: "text-critical",
              },
              {
                label: "Avg. Punch-In",
                value: stats.avgPunchIn,
                sub: "Time compliance",
                icon: Clock,
                color: "text-info",
              },
              {
                label: "Late Arrivals",
                value: stats.lateArrivals.toString(),
                sub: "Past grace period",
                icon: Navigation,
                color: "text-warning",
              },
            ].map((stat, i) => (
              <Card
                key={i}
                className="border-none shadow-card ring-1 ring-border p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center",
                      stat.color
                    )}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                      {stat.label}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
          <TabsTrigger
            value="log"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            Attendance Log
          </TabsTrigger>
          <TabsTrigger
            value="shift-compliance"
            className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest"
          >
            Shift Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <DataTable columns={columns} data={data} searchKey="employee" />
          )}
        </TabsContent>

        <TabsContent value="shift-compliance" className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {data.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No attendance data for shift compliance analysis.
                </div>
              ) : (
                data.map((record: any) => {
                  const shiftStart = "09:00";
                  const punchIn = record.punch_in || record.checkIn || null;
                  let lateMinutes = 0;
                  let onTime = true;

                  if (punchIn) {
                    const [sh, sm] = shiftStart.split(":").map(Number);
                    const punchDate = new Date(punchIn);
                    const punchHour = punchDate.getHours();
                    const punchMin = punchDate.getMinutes();
                    lateMinutes = Math.max(
                      0,
                      punchHour * 60 + punchMin - (sh * 60 + sm)
                    );
                    onTime = lateMinutes <= 15;
                  }

                  const compliancePct =
                    record.status === "Absent"
                      ? 0
                      : onTime
                      ? 100
                      : Math.max(0, 100 - lateMinutes);

                  return (
                    <Card
                      key={record.id}
                      className="border-none shadow-card ring-1 ring-border p-4"
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-sm">
                              {record.employee}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {punchIn
                                ? `Punch-in: ${new Date(punchIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : "Not checked in"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {lateMinutes > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-bold bg-warning/10 text-warning border-warning/20"
                              >
                                {lateMinutes}m late
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                record.status === "Absent"
                                  ? "bg-critical/10 text-critical border-critical/20"
                                  : onTime
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-warning/10 text-warning border-warning/20"
                              )}
                            >
                              {record.status === "Absent"
                                ? "Absent"
                                : onTime
                                ? "On Time"
                                : "Late"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={compliancePct}
                            className="flex-1 h-1.5"
                          />
                          <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">
                            {compliancePct}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Page entry point ────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { role, isLoading: isAuthLoading } = useAuth();
  const { employeeId, isLoading: isProfileLoading } = useEmployeeProfile();

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="animate-fade-in space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (role && ATTENDANCE_MANAGER_ROLES.has(role)) {
    return <AdminAttendanceView />;
  }

  if (employeeId) {
    return <MyAttendanceView employeeId={employeeId} />;
  }

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Attendance"
        description="Your attendance records."
      />
      <div className="text-center py-20 text-muted-foreground text-sm">
        No employee profile found. Please contact your administrator.
      </div>
    </div>
  );
}

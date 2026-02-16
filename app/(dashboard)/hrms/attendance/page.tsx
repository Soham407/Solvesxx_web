"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  UserCheck, 
  MapPin, 
  Camera, 
  Clock, 
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Navigation,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LiveMap } from "@/components/shared/LiveMap";

interface AttendanceRecord {
  id: string;
  employee: string;
  avatar?: string;
  shift: string;
  checkIn: string;
  checkOut?: string;
  location: string;
  verification: "Selfie + GPS" | "Manual" | "Failed";
  status: "Present" | "Late" | "On Leave" | "Absent";
}

const data: AttendanceRecord[] = [
  { id: "EMP-001", employee: "Rajesh Kumar", shift: "Morning (8AM-8PM)", checkIn: "07:55 AM", location: "Main Gate - Gate 1", verification: "Selfie + GPS", status: "Present" },
  { id: "EMP-004", employee: "Sunita Rao", shift: "Morning (8AM-8PM)", checkIn: "08:15 AM", location: "Tower A Reception", verification: "Selfie + GPS", status: "Late" },
  { id: "EMP-002", employee: "Amit Sharma", shift: "General (9AM-6PM)", checkIn: "08:58 AM", location: "Administration HQ", verification: "Selfie + GPS", status: "Present" },
  { id: "EMP-005", employee: "Rahul Verma", shift: "Night (8PM-8AM)", checkIn: "-", location: "-", verification: "Failed", status: "Absent" },
];

export default function AttendancePage() {
  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "employee",
      header: "Employee / Personnel",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{row.original.employee.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.employee}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.shift}</span>
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
                        <div className="h-5 w-5 rounded-full bg-success/10 border border-success/20 flex items-center justify-center"><Camera className="h-2.5 w-2.5 text-success" /></div>
                        <div className="h-5 w-5 rounded-full bg-info/10 border border-info/20 flex items-center justify-center"><Navigation className="h-2.5 w-2.5 text-info" /></div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{row.getValue("verification")}</span>
                </>
            ) : <span className="text-[10px] font-bold text-critical uppercase">{row.getValue("verification")}</span>}
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
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
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
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Export Monthly
            </Button>
            <Button className="gap-2 shadow-sm">
              <UserCheck className="h-4 w-4" /> Manual Adjustment
            </Button>
          </div>
        }
      />

      <LiveMap 
        className="mb-8"
        markers={data.map(r => ({
            id: r.id,
            label: r.employee,
            lat: Math.random() * 100, // Simulated lat
            lng: Math.random() * 100, // Simulated lng
            status: r.status === "Present" ? "active" : "warning"
        }))}
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "On Duty Now", value: "86", sub: "Currently checked in", icon: ShieldCheck, color: "text-primary" },
          { label: "Absent Today", value: "4", sub: "Personnel missing", icon: AlertCircle, color: "text-critical" },
          { label: "Avg. Punch-In", value: "08:04", sub: "Time compliance", icon: Clock, color: "text-info" },
          { label: "Late Arrivals", value: "7", sub: "Past grace period", icon: Navigation, color: "text-warning" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold ">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={data} searchKey="employee" />
    </div>
  );
}

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

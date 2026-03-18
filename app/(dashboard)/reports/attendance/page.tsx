"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MapPin, 
  Download, 
  Filter, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  BarChart4
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { AnalyticsChart } from "@/components/shared/AnalyticsChart";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCSV } from "@/lib/utils/csvExport";
import { toast } from "sonner";

interface AttendanceReport {
  department: string;
  total_present: number;
  total_absent: number;
  attendance_rate: number;
  avg_late_minutes: number;
}

export default function AttendanceAnalyticsPage() {
  const { data, isLoading } = useAnalyticsData("attendance");

  const columns: ColumnDef<AttendanceReport>[] = [
    {
      accessorKey: "department",
      header: "Department Cluster",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("department")}</span>,
    },
    {
      accessorKey: "total_present",
      header: "Active Present",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("total_present")}</span>,
    },
    {
      accessorKey: "attendance_rate",
      header: "Shift Compliance",
      cell: ({ row }) => (
        <Badge variant="outline" className={`${Number(row.getValue("attendance_rate")) > 90 ? "bg-success/5 text-success border-success/20" : "bg-warning/5 text-warning border-warning/20"} font-bold`}>
            {row.getValue("attendance_rate")}%
        </Badge>
      ),
    },
    {
      accessorKey: "avg_late_minutes",
      header: "Avg. Latency",
      cell: ({ row }) => (
        <span className={Number(row.getValue("avg_late_minutes")) > 15 ? "text-critical font-medium" : "text-muted-foreground"}>
          {row.getValue("avg_late_minutes")}m
        </span>
      ),
    },
  ];

  const avgAttendance = data.length > 0 ? (data.reduce((acc, curr) => acc + Number(curr.attendance_rate), 0) / data.length).toFixed(1) : "0.0";
  const totalPresent = data.reduce((acc, curr) => acc + Number(curr.total_present), 0);
  const avgLateTime = data.length > 0 ? (data.reduce((acc, curr) => acc + Number(curr.avg_late_minutes), 0) / data.length).toFixed(1) : "0";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Attendance Performance Analysis"
        description="Deep dive into staff punctuality, absenteeism heatmaps, and department-wise shift compliance."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Trend View", { description: "Chart already shows trend data above." })}>
               <TrendingUp className="h-4 w-4" /> Trend View
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => { if (data.length === 0) { toast.error("No data to export"); return; } downloadCSV("attendance_report", data); toast.success("Report downloaded"); }}>
               <Download className="h-4 w-4" /> Download Report
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-primary/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Present</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{totalPresent}</span>
                <span className="text-[10px] text-success font-medium mt-1">+4 from yesterday</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-success/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Avg Compliance</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{avgAttendance}%</span>
                <span className="text-[10px] text-success font-medium mt-1">Above target</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-warning/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Late Pct.</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{avgLateTime}m</span>
                <span className="text-[10px] text-warning font-medium mt-1">Avg delay per head</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-critical/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-critical/10 text-critical flex items-center justify-center">
                    <AlertCircle className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Absent Alerts</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{data.reduce((acc, curr) => acc + Number(curr.total_absent || 0), 0)}</span>
                <span className="text-[10px] text-critical font-medium mt-1">Unexplained absences</span>
             </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Attendance Heatmap</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold text-left">Department Density</span>
                  </div>
                  <BarChart4 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-4">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="bar" 
                        data={data} 
                        index="department" 
                        categories={["attendance_rate"]} 
                        height={250}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Late Entry Drivers</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold text-left">Punctuality Gap (Minutes)</span>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-4">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={data} 
                        index="department" 
                        categories={["avg_late_minutes"]} 
                        height={250}
                        colors={["#f59e0b"]}
                      />
                  )}
              </CardContent>
          </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="department" 
        isLoading={isLoading} 
      />
    </div>
  );
}

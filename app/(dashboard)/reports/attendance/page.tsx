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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { downloadCSV } from "@/lib/utils/csvExport";
import { toast } from "sonner";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { useState } from "react";

interface AttendanceReport {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export default function AttendanceAnalyticsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, isLoading, error } = useAnalyticsData("attendance", selectedDate);

  const columns: ColumnDef<AttendanceReport>[] = [
    {
      accessorKey: "date",
      header: "Day",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("date")}</span>,
    },
    {
      accessorKey: "present",
      header: "Present",
      cell: ({ row }) => <span className="text-sm font-medium text-success">{row.getValue("present")}</span>,
    },
    {
      accessorKey: "absent",
      header: "Absent",
      cell: ({ row }) => <span className="text-sm font-medium text-critical">{row.getValue("absent")}</span>,
    },
    {
      accessorKey: "late",
      header: "Late",
      cell: ({ row }) => <span className="text-sm font-medium text-warning">{row.getValue("late")}</span>,
    },
  ];

  const totalPresent = data.reduce((acc, curr) => acc + Number(curr.present || 0), 0);
  const totalAbsent = data.reduce((acc, curr) => acc + Number(curr.absent || 0), 0);
  const totalLate = data.reduce((acc, curr) => acc + Number(curr.late || 0), 0);
  const avgAttendance = data.length > 0 ? ((totalPresent / (totalPresent + totalAbsent || 1)) * 100).toFixed(1) : "0.0";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Attendance Performance Analysis"
        description="Daily trend analysis of staff punctuality, absenteeism, and shift compliance for the selected month."
        actions={
          <div className="flex items-center gap-4">
            <MonthPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <div className="flex gap-2 border-l pl-4 ml-2">
              <Button variant="outline" className="gap-2" onClick={() => toast.info("Trend View", { description: "Chart already shows trend data above." })}>
                 <TrendingUp className="h-4 w-4" /> Trend View
              </Button>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => { if (data.length === 0) { toast.error("No data to export"); return; } downloadCSV("attendance_report", data); toast.success("Report downloaded"); }}>
                 <Download className="h-4 w-4" /> Download Report
              </Button>
            </div>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching attendance data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                <span className="text-[10px] text-muted-foreground font-medium mt-1">Monthly Cumulative</span>
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
                <span className="text-[10px] text-success font-medium mt-1">Monthly Average</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-warning/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Late Counts</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{totalLate}</span>
                <span className="text-[10px] text-warning font-medium mt-1">Total delays this month</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-critical/5 to-transparent">
             <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-lg bg-critical/10 text-critical flex items-center justify-center">
                    <AlertCircle className="h-4 w-4" />
                 </div>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Absent Count</span>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">{totalAbsent}</span>
                <span className="text-[10px] text-critical font-medium mt-1">Total absences this month</span>
             </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Attendance Timeline</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold text-left">Daily Volume</span>
                  </div>
                  <BarChart4 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-4">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="bar" 
                        data={data} 
                        index="date" 
                        categories={["present", "absent"]} 
                        height={250}
                        colors={["#22c55e", "#ef4444"]}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Late Entry Trends</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold text-left">Daily Punctuality Gap</span>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-4">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={data} 
                        index="date" 
                        categories={["late"]} 
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
        searchKey="date" 
        isLoading={isLoading} 
      />
    </div>
  );
}

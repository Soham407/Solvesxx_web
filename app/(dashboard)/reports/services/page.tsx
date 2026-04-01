"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Download, 
  Clock, 
  Zap,
  Star,
  UserCheck,
  TrendingUp,
  Award,
  AlertCircle
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

interface ServiceReport {
  service_category: string;
  total_jobs: number;
  avg_response: number;
  resolution_rate: number;
}

export default function ServiceAnalyticsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, trends, isLoading, error } = useAnalyticsData("services", selectedDate);

  const columns: ColumnDef<ServiceReport>[] = [
    {
      accessorKey: "service_category",
      header: "Service Vertical",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("service_category")}</span>,
    },
    {
      accessorKey: "total_jobs",
      header: "Job Volume",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("total_jobs")}</span>,
    },
    {
      accessorKey: "avg_response",
      header: "Avg Resolution",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("avg_response")}h</span>,
    },
    {
      accessorKey: "resolution_rate",
      header: "Completion Rate",
      cell: ({ row }) => (
        <Badge variant="outline" className={`${Number(row.getValue("resolution_rate")) > 90 ? "bg-success/5 text-success border-success/20" : "bg-warning/5 text-warning border-warning/20"} font-bold`}>
            {row.getValue("resolution_rate")}%
        </Badge>
      ),
    },
  ];

  const avgTAT = data.length > 0 ? (data.reduce((acc, curr) => acc + Number(curr.avg_response || 0), 0) / data.length).toFixed(1) : "0";
  const totalJobs = data.reduce((acc, curr) => acc + Number(curr.total_jobs || 0), 0);
  const avgResolutionRate = data.length > 0 ? (data.reduce((acc, curr) => acc + Number(curr.resolution_rate || 0), 0) / data.length).toFixed(1) : "0";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Service Excellence Analytics"
        description="Monitoring resolution SLMs, technician efficiency scores, and resident satisfaction across all facility services."
        actions={
          <div className="flex items-center gap-4">
            <MonthPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <div className="flex gap-2 border-l pl-4 ml-2">
              <Button variant="outline" className="gap-2" onClick={() => toast.info("KPI Trends", { description: "Trend charts are displayed in the dashboard below." })}>
                 <TrendingUp className="h-4 w-4" /> KPI Trends
              </Button>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => { if (data.length === 0) { toast.error("No data to export"); return; } downloadCSV("service_analytics", data); toast.success("Report downloaded"); }}>
                 <Download className="h-4 w-4" /> Download Report
              </Button>
            </div>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching service data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Avg Resolution", value: `${avgTAT}h`, icon: Clock, color: "text-primary", sub: "Global TAT" },
          { label: "Avg Completion", value: `${avgResolutionRate}%`, icon: Zap, color: "text-success", sub: "Resolution Rate" },
          { label: "Total Jobs", value: totalJobs.toString(), icon: UserCheck, color: "text-info", sub: "Monthly Volume" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4 bg-linear-to-br from-muted/5 to-transparent">
               <div className="flex flex-col gap-3 text-left">
                    <div className="flex items-center justify-between">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
                    <div>
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <div className="flex items-center mt-1 text-[10px] font-medium text-muted-foreground italic">
                            {stat.sub}
                        </div>
                    </div>
                </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Service Volume by Category</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Allocated Resources</span>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="bar" 
                        data={data} 
                        index="service_category" 
                        categories={["total_jobs"]} 
                        height={250}
                        colors={["#6366f1"]}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Monthly Job Trend</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Volume over time</span>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={trends} 
                        index="month" 
                        categories={["jobs", "completed"]} 
                        height={250}
                        colors={["#6366f1", "#22c55e"]}
                      />
                  )}
              </CardContent>
          </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="service_category" 
        isLoading={isLoading} 
      />
    </div>
  );
}

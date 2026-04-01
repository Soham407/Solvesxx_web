"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  TrendingDown, 
  Download, 
  AlertTriangle,
  Flame,
  LayoutGrid,
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

interface InventoryReport {
  item_name: string;
  received: number;
  issued: number;
}

export default function InventoryAnalysisPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, trends, summary, isLoading, error } = useAnalyticsData("inventory", selectedDate);

  const columns: ColumnDef<InventoryReport>[] = [
    {
      accessorKey: "item_name",
      header: "Consumable Item",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("item_name")}</span>,
    },
    {
      accessorKey: "received",
      header: "Units Received",
      cell: ({ row }) => <span className="text-sm font-medium text-success">+{row.getValue("received")}</span>,
    },
    {
      accessorKey: "issued",
      header: "Units Issued",
      cell: ({ row }) => <span className="text-sm font-medium text-critical">-{row.getValue("issued")}</span>,
    },
    {
      id: "net",
      header: "Net Movement",
      cell: ({ row }) => {
        const net = Number(row.getValue("received")) - Number(row.getValue("issued"));
        return (
          <Badge variant="outline" className={`${net >= 0 ? "bg-success/5 text-success border-success/20" : "bg-critical/5 text-critical border-critical/20"} font-bold`}>
              {net > 0 ? "+" : ""}{net} units
          </Badge>
        );
      },
    },
  ];

  const totalReceived = data.reduce((acc, curr) => acc + Number(curr.received || 0), 0);
  const totalIssued = data.reduce((acc, curr) => acc + Number(curr.issued || 0), 0);
  const fastMovingItem = data.length > 0 ? [...data].sort((a, b) => b.issued - a.issued)[0]?.item_name : "None";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Inventory Consumption Analytics"
        description="Detailed tracking of material inflows and outflows, category burn rates, and reorder patterns for the selected month."
        actions={
          <div className="flex items-center gap-4">
            <MonthPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <div className="flex gap-2 border-l pl-4 ml-2">
               <Button variant="outline" className="gap-2 relative" onClick={() => {
                 if (summary?.low_stock_count > 0) {
                   toast.warning(`${summary.low_stock_count} items are below reorder level`, {
                     description: "Check inventory management for details."
                   });
                 } else {
                   toast.success("All items are above reorder level");
                 }
               }}>
                 <AlertTriangle className={`h-4 w-4 ${summary?.low_stock_count > 0 ? "text-critical animate-pulse" : ""}`} /> 
                 Stock Alerts
                 {summary?.low_stock_count > 0 && (
                   <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                     {summary.low_stock_count}
                   </Badge>
                 )}
              </Button>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => { if (data.length === 0) { toast.error("No data to export"); return; } downloadCSV("inventory_movement", data); toast.success("Movement report downloaded"); }}>
                 <Download className="h-4 w-4" /> Download Report
              </Button>
            </div>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching inventory data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-primary/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Package className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-success border-success/20 bg-success/5 font-bold">Inflow</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Received</span>
                <span className="text-2xl font-bold  text-primary mt-1">{totalReceived} Units</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-critical/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
                    <Flame className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-critical border-critical/20 bg-critical/5 font-bold">Outflow</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Issued</span>
                <span className="text-2xl font-bold  text-critical mt-1">{totalIssued} Units</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-warning/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                    <TrendingDown className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-warning border-warning/20 bg-warning/5 font-bold">Fast Moving</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Highest Burn Item</span>
                <span className="text-2xl font-bold  text-warning mt-1 truncate">{fastMovingItem}</span>
             </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Movement Comparison</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Received vs Issued</span>
                  </div>
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="bar" 
                        data={data} 
                        index="item_name" 
                        categories={["received", "issued"]} 
                        height={250}
                        colors={["#22c55e", "#ef4444"]}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Monthly Movement Trend</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Received vs Issued</span>
                  </div>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={trends} 
                        index="month" 
                        categories={["received", "issued"]} 
                        height={250}
                        colors={["#22c55e", "#ef4444"]}
                      />
                  )}
              </CardContent>
          </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="item_name" 
        isLoading={isLoading} 
      />
    </div>
  );
}

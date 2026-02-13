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
  LayoutGrid
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { AnalyticsChart } from "@/components/shared/AnalyticsChart";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryReport {
  product_id: string;
  item_name: string;
  category: string;
  stock_level: number;
  consumption_rate: number;
  days_to_stockout: number;
}

export default function InventoryAnalysisPage() {
  const { data, isLoading } = useAnalyticsData("inventory");

  const columns: ColumnDef<InventoryReport>[] = [
    {
      accessorKey: "item_name",
      header: "Consumable Item",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("item_name")}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground uppercase">{row.getValue("category")}</span>,
    },
    {
      accessorKey: "stock_level",
      header: "Stock Level",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("stock_level")} units</span>,
    },
    {
      accessorKey: "consumption_rate",
      header: "Monthly Burn",
      cell: ({ row }) => <span className="text-sm font-semibold text-critical">-{row.getValue("consumption_rate")}/mo</span>,
    },
    {
      accessorKey: "days_to_stockout",
      header: "Forecast",
      cell: ({ row }) => (
        <Badge variant="outline" className={`${Number(row.getValue("days_to_stockout")) < 7 ? "bg-critical/5 text-critical border-critical/20" : "bg-success/5 text-success border-success/20"} font-bold`}>
            {row.getValue("days_to_stockout")} days left
        </Badge>
      ),
    },
  ];

  const criticalItems = data.filter(item => item.days_to_stockout < 7).length;
  const avgBurnRate = data.length > 0 ? (data.reduce((acc, curr) => acc + Number(curr.consumption_rate), 0) / data.length).toFixed(1) : "0";
  const stockOutRisk = data.filter(item => item.stock_level === 0).length;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Inventory Consumption Analytics"
        description="Predictive stock-out modeling, category burn rates, and automated reorder forecasting."
        actions={
          <div className="flex gap-2">
             <Button variant="outline" className="gap-2">
               <AlertTriangle className="h-4 w-4" /> Stock Alerts
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Download className="h-4 w-4" /> PO Manifest (XL)
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-primary/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Package className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-critical border-critical/20 bg-critical/5 font-bold">{criticalItems} Critical</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total SKU Count</span>
                <span className="text-2xl font-bold  text-primary mt-1">{data.length} Items</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-critical/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
                    <Flame className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-critical border-critical/20 bg-critical/5 font-bold">Fast Moving</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Avg. Monthly Burn</span>
                <span className="text-2xl font-bold  text-critical mt-1">{avgBurnRate} items/mo</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-warning/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                    <TrendingDown className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-warning border-warning/20 bg-warning/5 font-bold">Risk Zone</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Stock Out Risk</span>
                <span className="text-2xl font-bold  text-warning mt-1">{stockOutRisk} SKUs</span>
             </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Category Burn Chart</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Consumption Intensity</span>
                  </div>
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="bar" 
                        data={data} 
                        index="item_name" 
                        categories={["consumption_rate"]} 
                        height={250}
                        colors={["#ef4444"]}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1 text-left">
                    <CardTitle className="text-sm font-bold">Reorder Heatmap</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Days to Depletion</span>
                  </div>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center pt-6">
                   {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={data} 
                        index="item_name" 
                        categories={["days_to_stockout"]} 
                        height={250}
                        colors={["#3b82f6"]}
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

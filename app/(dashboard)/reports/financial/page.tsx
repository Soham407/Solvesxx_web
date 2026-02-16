"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  BarChart4,
  TrendingDown, 
  TrendingUp, 
  Download, 
  Wallet,
  PieChart as PieChartIcon
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { AnalyticsChart } from "@/components/shared/AnalyticsChart";
import { Skeleton } from "@/components/ui/skeleton";

interface LedgerSummary {
  category: string;
  revenue: number;
}

export default function FinancialAnalyticsPage() {
  const { data, trends, summary, isLoading } = useAnalyticsData("financial");

  const columns: ColumnDef<LedgerSummary>[] = [
    {
      accessorKey: "category",
      header: "Business Line",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("category")}</span>,
    },
    {
      accessorKey: "revenue",
      header: "Collection (AR)",
      cell: ({ row }) => <span className="text-sm font-medium text-success">₹{(row.getValue("revenue") as number).toLocaleString()}</span>,
    },
    {
      id: "netMargin",
      header: "P&L Impact",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
            +₹{(row.getValue("revenue") as number).toLocaleString()}
        </Badge>
      ),
    },
  ];

  const totalCollection = summary?.total_collected_ytd || 0;
  const outstanding = summary?.total_outstanding || 412000; // Fallback to mock if null
  const totalExpense = trends.reduce((acc, curr) => acc + Number(curr.expense || 0), 0);
  const profitRetention = totalCollection > 0 ? (((totalCollection - totalExpense) / totalCollection) * 100).toFixed(1) : "0.0";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Financial Health Dashboard"
        description="Consolidated AR/AP reporting, collection trends, and revenue leakage analysis across all society operations."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <TrendingUp className="h-4 w-4" /> Tax Summary
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Download className="h-4 w-4" /> Audit Pack (PDF)
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-indigo-500/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Wallet className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-success border-success/20 bg-success/5 font-bold">+14.2%</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Collection (YTD)</span>
                <span className="text-2xl font-bold  text-primary mt-1">₹{totalCollection.toLocaleString()}</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-critical/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
                    <TrendingDown className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-critical border-critical/20 bg-critical/5 font-bold">+2%</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Outstanding (Aged)</span>
                <span className="text-2xl font-bold  text-critical mt-1">₹{outstanding.toLocaleString()}</span>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-success/5 to-transparent">
             <div className="flex items-center justify-between mb-4">
                 <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <BarChart4 className="h-5 w-5" />
                 </div>
                 <Badge variant="outline" className="text-success border-success/20 bg-success/5 font-bold">Healthy</Badge>
             </div>
             <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Profit Retention</span>
                <span className="text-2xl font-bold  text-success mt-1">{profitRetention}%</span>
             </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Revenue Distribution</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">By Category</span>
                  </div>
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="pie" 
                        data={data} 
                        index="category" 
                        categories={["revenue"]} 
                        height={250}
                      />
                  )}
              </CardContent>
          </Card>
          <Card className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-bold">Monthly Profitability</CardTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Collection vs Payouts</span>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="min-h-[250px] flex items-center justify-center">
                  {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                      <AnalyticsChart 
                        type="area" 
                        data={trends} 
                        index="month" 
                        categories={["revenue", "expense"]} 
                        height={250}
                      />
                  )}
              </CardContent>
          </Card>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="category" 
        isLoading={isLoading} 
      />
    </div>
  );
}

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
  PieChart as PieChartIcon,
  Percent,
  AlertCircle,
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
import { formatCurrency } from "@/src/lib/utils/currency";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { useState } from "react";

interface LedgerSummary {
  category: string;
  revenue: number;
}

export default function FinancialAnalyticsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, trends, summary, isLoading, error } = useAnalyticsData("financial", selectedDate);
  
  const formatViewCurrency = (amountInRupees: number) => formatCurrency(Math.round(amountInRupees * 100));
  const chartCurrencyFormatter = (val: any) => formatCurrency(Math.round(Number(val) * 100));

  const columns: ColumnDef<LedgerSummary>[] = [
    {
      accessorKey: "category",
      header: "Business Line",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("category")}</span>,
    },
    {
      accessorKey: "revenue",
      header: "Collection (AR)",
      cell: ({ row }) => <span className="text-sm font-medium text-success">{formatViewCurrency(Number(row.getValue("revenue") || 0))}</span>,
    },
    {
      id: "revenueContribution",
      header: "Collection Contribution %",
      cell: ({ row }) => {
        const rev = Number(row.getValue("revenue") || 0);
        const percent = totalCollectionRupees > 0 ? ((rev / totalCollectionRupees) * 100).toFixed(1) : "0.0";
        return (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
            {percent}%
          </Badge>
        );
      },
    },
  ];

  const totalCollection = Number(summary?.total_collected_month || 0);
  const outstanding = Number(summary?.total_outstanding || 0);
  const totalCollectionRupees = totalCollection / 100;
  const totalExpenseRupees = Number(summary?.total_expense || 0) / 100;

  // Month-over-month collection change
  const lastTwoMonths = trends.slice(-2);
  const momCollectionChange = lastTwoMonths.length === 2 && Number(lastTwoMonths[0].revenue || 0) > 0
    ? (((Number(lastTwoMonths[1].revenue || 0) - Number(lastTwoMonths[0].revenue || 0)) / Number(lastTwoMonths[0].revenue || 0)) * 100).toFixed(1)
    : null;
  const momExpenseChange = lastTwoMonths.length === 2 && Number(lastTwoMonths[0].expense || 0) > 0
    ? (((Number(lastTwoMonths[1].expense || 0) - Number(lastTwoMonths[0].expense || 0)) / Number(lastTwoMonths[0].expense || 0)) * 100).toFixed(1)
    : null;
  const profitRetention = totalCollectionRupees > 0
    ? (((totalCollectionRupees - totalExpenseRupees) / totalCollectionRupees) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Financial Health Dashboard"
        description="Consolidated AR/AP reporting, collection trends, and revenue leakage analysis across all society operations."
        actions={
          <div className="flex items-center gap-4">
            <MonthPicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
            <div className="flex gap-2 border-l pl-4 ml-2">
              <Button variant="outline" className="gap-2" onClick={() => { if (data.length === 0) { toast.error("No data to export"); return; } downloadCSV("tax_summary", data); toast.success("Tax summary downloaded"); }}>
                <TrendingUp className="h-4 w-4" /> Tax Summary
              </Button>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Audit Pack (PDF)
              </Button>
            </div>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching financial data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-success border-success/20 bg-success/5 font-bold">{momCollectionChange ? `${Number(momCollectionChange) >= 0 ? "+" : ""}${momCollectionChange}%` : "Monthly"}</Badge>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Collection (Month)</span>
            <span className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalCollection)}</span>
          </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-critical/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-critical border-critical/20 bg-critical/5 font-bold">{momExpenseChange ? `${Number(momExpenseChange) >= 0 ? "+" : ""}${momExpenseChange}%` : "Aged"}</Badge>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Outstanding (Aged)</span>
            <span className="text-2xl font-bold text-critical mt-1">{formatCurrency(outstanding)}</span>
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
            <span className="text-2xl font-bold text-success mt-1">{profitRetention}%</span>
          </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-6 bg-linear-to-br from-info/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Percent className="h-5 w-5" />
            </div>
            <Badge variant="outline" className="text-info border-info/20 bg-info/5 font-bold">Net</Badge>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Monthly Profit (Net)</span>
            <span className="text-2xl font-bold text-info mt-1">
              {formatCurrency(totalCollection - Number(summary?.total_expense || 0))}
            </span>
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
                valueFormatter={chartCurrencyFormatter}
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
                categories={["revenue", "expense", "net_margin"]}
                height={250}
                valueFormatter={chartCurrencyFormatter}
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

"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Wallet, 
  AlertTriangle, 
  TrendingUp, 
  PieChart, 
  BarChart,
  Calendar,
  History
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useBudgets, Budget, BudgetStatus } from "@/hooks/useBudgets";
import { formatCurrency, toRupees } from "@/src/lib/utils/currency";
import { useState } from "react";

export default function BudgetingPage() {
  const { budgets, isLoading, error, createBudget } = useBudgets();
  
  const columns: ColumnDef<Budget>[] = [
    {
      accessorKey: "budget_code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.getValue("budget_code")}</span>,
    },
    {
      accessorKey: "name",
      header: "Budget Name",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.department} | {row.original.category}</span>
        </div>
      ),
    },
    {
      accessorKey: "period_name",
      header: "Period",
      cell: ({ row }) => <Badge variant="outline" className="font-medium">{row.original.period_name}</Badge>,
    },
    {
      accessorKey: "allocated_amount",
      header: "Allocated",
      cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.allocated_amount)}</span>,
    },
    {
      accessorKey: "used_amount",
      header: "Utilization",
      cell: ({ row }) => {
        const percent = (row.original.used_amount / row.original.allocated_amount) * 100;
        const color = percent > 90 ? "bg-critical" : percent > 75 ? "bg-warning" : "bg-success";
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>{Math.round(percent)}% Used</span>
              <span>{formatCurrency(row.original.used_amount)}</span>
            </div>
            <Progress value={percent} className={cn("h-1.5", color === "bg-critical" ? "animate-pulse" : "")} />
          </div>
        );
      },
    },
    {
      accessorKey: "remaining_amount",
      header: "Available",
      cell: ({ row }) => (
        <span className={cn(
          "font-bold",
          row.original.remaining_amount < 0 ? "text-critical" : "text-success"
        )}>
          {formatCurrency(row.original.remaining_amount)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as BudgetStatus;
        const variants: Record<BudgetStatus, string> = {
          draft: "bg-muted text-muted-foreground",
          active: "bg-success/10 text-success border-success/20",
          exhausted: "bg-critical/10 text-critical border-critical/20 animate-pulse-soft",
          expired: "bg-warning/10 text-warning border-warning/20",
        };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[status])}>
            {status}
          </Badge>
        );
      },
    },
  ];

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated_amount, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + b.used_amount, 0);
  const overallUtilization = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Budget Control Center"
        description="Monitor and manage departmental budgets, track real-time utilization, and set financial guardrails."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" /> History
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Create Budget
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Total Budget", value: formatCurrency(totalAllocated), extra: "+12% from last period", icon: Wallet, color: "text-primary" },
          { label: "Current Burn", value: formatCurrency(totalUsed), extra: `${Math.round(overallUtilization)}% overall utilization`, icon: TrendingUp, color: "text-info" },
          { label: "Critical Alerts", value: budgets.filter(b => (b.used_amount/b.allocated_amount) > 0.9).length.toString(), extra: "Requires reallocation", icon: AlertTriangle, color: "text-critical" },
          { label: "Active Periods", value: "2", extra: "Q1 2026, Feb 2026", icon: Calendar, color: "text-success" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4 bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold">{stat.value}</span>
                <span className="text-[10px] font-medium text-muted-foreground mt-1">{stat.extra}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-card ring-1 ring-border bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Departmental Allocations</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 gap-2 uppercase text-[10px] font-bold">
              <BarChart className="h-3 w-3" /> Allocation View
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={budgets} 
            isLoading={isLoading}
            searchKey="name" 
          />
        </CardContent>
      </Card>
    </div>
  );
}

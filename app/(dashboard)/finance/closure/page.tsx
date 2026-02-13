"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck,
  CalendarCheck,
  ShieldAlert
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFinancialClosure, FinancialPeriod, FinancialPeriodStatus } from "@/hooks/useFinancialClosure";
import { format } from "date-fns";
import { useState } from "react";

export default function FinancialClosurePage() {
  const { periods, currentPeriod, isLoading, closePeriod } = useFinancialClosure();
  
  const columns: ColumnDef<FinancialPeriod>[] = [
    {
      accessorKey: "period_name",
      header: "Period",
      cell: ({ row }) => <span className="font-bold">{row.getValue("period_name")}</span>,
    },
    {
      accessorKey: "period_type",
      header: "Type",
      cell: ({ row }) => <Badge variant="secondary" className="uppercase text-[10px]">{row.getValue("period_type")}</Badge>,
    },
    {
      accessorKey: "date_range",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-medium">
          {format(new Date(row.original.start_date), "MMM d, yyyy")} - {format(new Date(row.original.end_date), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as FinancialPeriodStatus;
        const variants: Record<FinancialPeriodStatus, { label: string; className: string; icon: any }> = {
          open: { label: "Open", className: "bg-success/10 text-success border-success/20", icon: Unlock },
          closing: { label: "Closing", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
          closed: { label: "Closed", className: "bg-critical/10 text-critical border-critical/20", icon: Lock },
        };
        const config = variants[status];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5 gap-1.5", config.className)}>
            <config.icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "closed_at",
      header: "Closing Date",
      cell: ({ row }) => row.original.closed_at ? format(new Date(row.original.closed_at), "MMM d, HH:mm") : "-",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-[10px] font-bold uppercase gap-2"
          disabled={row.original.status === 'closed'}
          onClick={() => closePeriod(row.original.id, "Standard monthly closing process completed.")}
        >
          {row.original.status === 'closed' ? <CheckCircle2 className="h-3.3 w-3.3" /> : <Lock className="h-3.3 w-3.3" />}
          {row.original.status === 'closed' ? "Closed" : "Run Closure"}
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Financial Closure Management"
        description="Securely close accounting periods to freeze financial data and generate final statements."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FileCheck className="h-4 w-4" /> Compliance Audit
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <CalendarCheck className="h-4 w-4" /> New Period
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-card ring-1 ring-border bg-background/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Current Active Period</CardTitle>
                <CardDescription>All accounting entries are currently being posted to this period.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 animate-pulse-soft font-bold">LIVE</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {currentPeriod ? (
              <div className="flex items-center justify-between p-6 rounded-xl bg-muted/30 border border-dashed border-border">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarCheck className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold">{currentPeriod.period_name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      Started {format(new Date(currentPeriod.start_date), "MMMM d")} • Ends in 12 days
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-end px-6 border-r border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
                    <span className="text-sm font-bold text-success uppercase">Open for entries</span>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold px-6">
                    <Lock className="h-4 w-4" /> Start Closing Workflow
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-muted/30 border border-dashed border-border text-muted-foreground">
                No active financial period found. Please initialize a new period.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border bg-critical/5 border-critical/10">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-critical flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Closure Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Closed periods are cryptographically sealed. No new invoices, bills, or ledger entries can be posted to a closed period without administrative reopening.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span>Database Protection</span>
                <span className="text-success">Active</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span>Closure Integrity</span>
                <span className="text-success">Verified</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Period History & Archive</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={periods} 
            isLoading={isLoading}
            searchKey="period_name" 
          />
        </CardContent>
      </Card>
    </div>
  );
}

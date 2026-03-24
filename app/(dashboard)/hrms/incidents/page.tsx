"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useBehaviorTickets, BehaviorTicket } from "@/hooks/useBehaviorTickets";
import { useRouter } from "next/navigation";

export default function HRIncidentsPage() {
  const router = useRouter();
  const { tickets, isLoading, stats } = useBehaviorTickets();

  const columns: ColumnDef<BehaviorTicket>[] = [
    {
      accessorKey: "ticket_number",
      header: "Incident ID",
      cell: ({ row }) => (
        <span className="font-bold text-xs">#{row.original.ticket_number}</span>
      ),
    },
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm">
            {row.original.employee?.first_name} {row.original.employee?.last_name}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {row.original.employee?.employee_code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-[10px] font-bold">
          {row.original.category.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.original.severity;
        return (
          <Badge
            variant="outline"
            className={cn(
              "uppercase text-[9px] font-black tracking-tighter h-5",
              severity === "high"
                ? "bg-critical/10 text-critical border-critical/20"
                : severity === "medium"
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-info/10 text-info border-info/20"
            )}
          >
            {severity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const config: Record<string, { label: string; className: string }> = {
          open: { label: "Open", className: "bg-warning/10 text-warning" },
          under_review: { label: "Reviewing", className: "bg-info/10 text-info" },
          resolved_warning: { label: "Warned", className: "bg-success/10 text-success" },
          resolved_action: { label: "Actioned", className: "bg-primary/10 text-primary" },
          dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground" },
        };
        const s = config[status] || { label: status, className: "" };
        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] font-bold uppercase", s.className)}
          >
            {s.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Reported On",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="HR Incidents"
        description="Track and manage employee conduct incidents, disciplinary events, and HR-reported behavior issues."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push("/tickets/behavior")}
          >
            <ExternalLink className="h-4 w-4" /> Open Behavior Tickets
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Open Incidents",
            value: stats.active.toString(),
            sub: "Requires attention",
            icon: AlertTriangle,
            color: "text-critical",
          },
          {
            label: "Under Review",
            value: stats.underReview.toString(),
            sub: "Investigation ongoing",
            icon: Clock,
            color: "text-warning",
          },
          {
            label: "Resolved (30d)",
            value: stats.resolved.toString(),
            sub: "Successfully closed",
            icon: CheckCircle2,
            color: "text-success",
          },
          {
            label: "Repeat Offenders",
            value: stats.repeatOffenders.toString(),
            sub: "Multiple violations",
            icon: ShieldAlert,
            color: "text-warning",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center",
                  stat.color
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  {stat.label}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Incidents Table */}
      {tickets.length === 0 ? (
        <Card className="border-none shadow-card ring-1 ring-border p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
          <p className="font-bold text-base">No incidents recorded</p>
          <p className="text-sm text-muted-foreground mt-1">
            All employee conduct is in good standing.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => router.push("/tickets/behavior")}
          >
            <ExternalLink className="h-4 w-4" /> Go to Behavior Tickets
          </Button>
        </Card>
      ) : (
        <DataTable columns={columns} data={tickets} searchKey="ticket_number" />
      )}
    </div>
  );
}

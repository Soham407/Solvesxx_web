"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { VisitorAvatar } from "@/components/society/VisitorAvatar";
import { cn } from "@/lib/utils";
import type { Visitor } from "@/hooks/useVisitors";

export interface ResidentVisitorsSectionProps {
  visitors: Visitor[];
  isLoading: boolean;
  onRefresh: () => void;
}

function formatDate(isoString: string | null) {
  if (!isoString) return "Pending";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getVisitorTypeBadge(type: string | null) {
  switch (type) {
    case "guest":
      return "bg-info/10 text-info border-info/20";
    case "vendor":
      return "bg-warning/10 text-warning border-warning/20";
    case "contractor":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "service_staff":
    case "daily_helper":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function ResidentVisitorsSection({
  visitors,
  isLoading,
  onRefresh,
}: ResidentVisitorsSectionProps) {
  const visitorColumns: ColumnDef<Visitor>[] = useMemo(
    () => [
      {
        accessorKey: "visitor_name",
        header: "Visitor",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <VisitorAvatar
              photoUrl={row.original.photo_url}
              name={row.original.visitor_name}
              className="h-8 w-8"
            />
            <span className="font-bold">{row.original.visitor_name}</span>
          </div>
        ),
      },
      {
        accessorKey: "visitor_type",
        header: "Type",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn("text-[10px] font-bold uppercase", getVisitorTypeBadge(row.original.visitor_type))}
          >
            {row.original.visitor_type?.replace("_", " ") || "Guest"}
          </Badge>
        ),
      },
      {
        accessorKey: "entry_time",
        header: "Entry Time",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.entry_time)}</span>,
      },
      {
        accessorKey: "vehicle_number",
        header: "Vehicle",
        cell: ({ row }) => <span className="text-xs">{row.original.vehicle_number || "—"}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const v = row.original;
          if (v.exit_time) return <Badge variant="outline" className="text-[10px] bg-muted font-bold">EXITED</Badge>;
          if (v.entry_time && v.approved_by_resident === true) return <Badge variant="success" className="text-[10px] font-bold">INSIDE</Badge>;
          if (v.entry_time && v.approved_by_resident === false) return <Badge variant="destructive" className="text-[10px] font-bold">DENIED</Badge>;
          return <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 font-bold">PRE-APPROVED</Badge>;
        }
      }
    ],
    []
  );

  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase">
            My Visitors
          </CardTitle>
          <CardDescription className="text-xs">Recent visitor activity for your unit</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading} className="h-8">
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <DataTable
          columns={visitorColumns}
          data={visitors.slice(0, 10)}
          isLoading={isLoading}
          searchKey="visitor_name"
        />
      </CardContent>
    </Card>
  );
}

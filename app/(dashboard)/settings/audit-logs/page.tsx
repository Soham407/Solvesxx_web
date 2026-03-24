"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

import { usePlatformAuditLogs } from "@/hooks/usePlatformAuditLogs";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";

type AuditRow = {
  id: string;
  searchText: string;
  action: string;
  entityType: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
  metadataText: string;
};

export default function PlatformAuditLogsPage() {
  const { logs, summary, isLoading } = usePlatformAuditLogs();
  const [query, setQuery] = useState("");

  const rows = useMemo<AuditRow[]>(
    () =>
      logs
        .map((log) => ({
          id: log.id,
          searchText: [
            log.action,
            log.entityType,
            log.actorName ?? "",
            log.actorRole ?? "",
            JSON.stringify(log.metadata ?? {}),
          ]
            .join(" ")
            .toLowerCase(),
          action: log.action,
          entityType: log.entityType,
          actorName: log.actorName ?? "System",
          actorRole: log.actorRole ?? "system",
          createdAt: log.createdAt,
          metadataText:
            typeof log.metadata === "object" && log.metadata !== null
              ? Object.entries(log.metadata as Record<string, unknown>)
                  .slice(0, 3)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(" · ")
              : "No extra metadata",
        }))
        .filter((row) => row.searchText.includes(query.toLowerCase())),
    [logs, query]
  );

  const columns: ColumnDef<AuditRow>[] = [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.original.action}</p>
          <p className="text-xs text-muted-foreground">{row.original.metadataText}</p>
        </div>
      ),
    },
    {
      accessorKey: "entityType",
      header: "Entity",
      cell: ({ row }) => <Badge variant="secondary">{row.original.entityType}</Badge>,
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.actorName}</p>
          <p className="text-xs text-muted-foreground">{row.original.actorRole}</p>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.createdAt), "PPp")}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Platform-level activity history for admin accounts, permissions, and configuration."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            Total Events
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            Last 24 Hours
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{summary.recent}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKey="searchText"
        onSearch={setQuery}
        isLoading={isLoading}
      />
    </div>
  );
}

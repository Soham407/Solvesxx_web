"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, RefreshCw, X } from "lucide-react";

import { type AuditLog, useAuditLogs } from "@/hooks/useAuditLogs";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuditLogTableRow = {
  id: string;
  timestamp: string;
  user: string;
  userMeta: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: string;
  searchText: string;
};

const ACTION_STYLES: Record<string, string> = {
  created: "border-success/20 bg-success/10 text-success",
  approved: "border-success/20 bg-success/10 text-success",
  updated: "border-info/20 bg-info/10 text-info",
  deleted: "border-destructive/20 bg-destructive/10 text-destructive",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  exported: "border-primary/20 bg-primary/10 text-primary",
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildChangeDiff(oldData: unknown, newData: unknown) {
  const oldRecord = isObjectRecord(oldData) ? oldData : null;
  const newRecord = isObjectRecord(newData) ? newData : null;

  if (!oldRecord && !newRecord) {
    if (oldData == null && newData == null) {
      return { message: "No field diff captured" };
    }

    return {
      before: oldData ?? null,
      after: newData ?? null,
    };
  }

  const keys = Array.from(
    new Set([
      ...Object.keys(oldRecord ?? {}),
      ...Object.keys(newRecord ?? {}),
    ])
  ).sort();

  const diff = keys.reduce<Record<string, { before: unknown; after: unknown }>>(
    (accumulator, key) => {
      const before = oldRecord?.[key] ?? null;
      const after = newRecord?.[key] ?? null;

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        accumulator[key] = { before, after };
      }

      return accumulator;
    },
    {}
  );

  if (Object.keys(diff).length > 0) {
    return diff;
  }

  return {
    before: oldData ?? null,
    after: newData ?? null,
  };
}

function stringifyChangeDiff(log: AuditLog) {
  return JSON.stringify(buildChangeDiff(log.old_data, log.new_data), null, 2);
}

export default function AdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [tableNameFilter, setTableNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredUserFilter = useDeferredValue(userFilter);
  const deferredActionFilter = useDeferredValue(actionFilter);
  const deferredTableNameFilter = useDeferredValue(tableNameFilter);

  const { logs, isLoading, error, refresh } = useAuditLogs({
    user: deferredUserFilter,
    action: deferredActionFilter,
    table_name: deferredTableNameFilter,
    date_from: dateFrom,
    date_to: dateTo,
    limit: 1000,
  });

  const rows = useMemo<AuditLogTableRow[]>(
    () =>
      logs
        .map((log) => {
          const user = log.actor_name ?? "System";
          const userMeta =
            log.actor_email ??
            (log.actor_role ? log.actor_role.replace(/_/g, " ") : "system");
          const recordId = log.record_id ?? "-";
          const changes = stringifyChangeDiff(log);
          const searchText = [
            user,
            userMeta,
            log.action,
            log.table_name,
            recordId,
            changes,
          ]
            .join(" ")
            .toLowerCase();

          return {
            id: log.id,
            timestamp: log.created_at,
            user,
            userMeta,
            action: log.action,
            table_name: log.table_name,
            record_id: recordId,
            changes,
            searchText,
          };
        })
        .filter((row) =>
          deferredSearchQuery
            ? row.searchText.includes(deferredSearchQuery.toLowerCase())
            : true
        ),
    [deferredSearchQuery, logs]
  );

  const hasActiveFilter = Boolean(
    userFilter || actionFilter || tableNameFilter || dateFrom || dateTo
  );

  const columns: ColumnDef<AuditLogTableRow>[] = useMemo(
    () => [
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-muted-foreground">
            {format(new Date(row.original.timestamp), "PPp")}
          </span>
        ),
      },
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{row.original.user}</p>
            <p className="text-xs text-muted-foreground">{row.original.userMeta}</p>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              ACTION_STYLES[row.original.action] ??
              "border-border bg-muted/40 text-muted-foreground"
            }
          >
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: "table_name",
        header: "Table Name",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {row.original.table_name}
          </Badge>
        ),
      },
      {
        accessorKey: "record_id",
        header: "Record ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.record_id}
          </span>
        ),
      },
      {
        accessorKey: "changes",
        header: "Changes",
        cell: ({ row }) => (
          <pre className="max-h-36 max-w-[26rem] overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-3 font-mono text-[10px] leading-5 text-foreground/90">
            {row.original.changes}
          </pre>
        ),
      },
    ],
    []
  );

  const clearFilters = () => {
    setUserFilter("");
    setActionFilter("");
    setTableNameFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const filterPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Audit Filters</span>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-user-filter">User</Label>
        <Input
          id="audit-user-filter"
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
          placeholder="Name, email, role, or actor ID"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-action-filter">Action</Label>
        <Input
          id="audit-action-filter"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="created, updated, deleted..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-table-filter">Table Name</Label>
        <Input
          id="audit-table-filter"
          value={tableNameFilter}
          onChange={(event) => setTableNameFilter(event.target.value)}
          placeholder="users, roles, system_config..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-date-from">Date From</Label>
        <input
          id="audit-date-from"
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-date-to">Date To</Label>
        <input
          id="audit-date-to"
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Read-only audit trail for admin activity, with filters for user, action, table, and date range."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={rows}
        searchKey="audit logs"
        onSearch={setSearchQuery}
        isLoading={isLoading}
        filterContent={filterPanel}
        filterActive={hasActiveFilter}
      />
    </div>
  );
}

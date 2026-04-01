"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Check, Loader2, RefreshCw, X } from "lucide-react";

import {
  WAITLIST_STATUS_CONFIG,
  type WaitlistEntry,
  type WaitlistStatus,
  useWaitlist,
} from "@/hooks/useWaitlist";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_FILTER_OPTIONS: Array<{
  value: WaitlistStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminWaitlistPage() {
  const {
    entries,
    stats,
    isLoading,
    error,
    refresh,
    updateWaitlistStatus,
    isUpdatingStatus,
  } = useWaitlist();
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "all">("all");
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    status: WaitlistStatus;
  } | null>(null);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") {
      return entries;
    }

    return entries.filter((entry) => entry.status === statusFilter);
  }, [entries, statusFilter]);

  const handleStatusChange = useCallback(
    async (id: string, status: WaitlistStatus) => {
      setPendingAction({ id, status });

      try {
        await updateWaitlistStatus({ id, status });
      } finally {
        setPendingAction((current) => (current?.id === id ? null : current));
      }
    },
    [updateWaitlistStatus]
  );

  const columns: ColumnDef<WaitlistEntry>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.name || "Not provided"}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-foreground/80">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.company || "Not provided"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.created_at
              ? format(new Date(row.original.created_at), "PPp")
              : "Unknown"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const config = WAITLIST_STATUS_CONFIG[row.original.status];

          return (
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const { id, status } = row.original;
          const isPendingForRow = pendingAction?.id === id;
          const isApproving =
            isPendingForRow && pendingAction?.status === "approved" && isUpdatingStatus;
          const isRejecting =
            isPendingForRow && pendingAction?.status === "rejected" && isUpdatingStatus;

          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant={status === "approved" ? "default" : "outline"}
                className={
                  status === "approved"
                    ? ""
                    : "border-success/30 text-success hover:bg-success/10 hover:text-success"
                }
                disabled={isUpdatingStatus || status === "approved"}
                onClick={() => handleStatusChange(id, "approved")}
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-1">Approve</span>
              </Button>
              <Button
                size="sm"
                variant={status === "rejected" ? "destructive" : "outline"}
                className={
                  status === "rejected"
                    ? ""
                    : "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                }
                disabled={isUpdatingStatus || status === "rejected"}
                onClick={() => handleStatusChange(id, "rejected")}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                <span className="ml-1">Reject</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [handleStatusChange, isUpdatingStatus, pendingAction]
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Waitlist"
        description="Review landing-page sign-ups and manage their approval status."
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

      <div className="grid gap-4 md:grid-cols-4">
        <WaitlistStatCard label="Total" value={stats.total} />
        <WaitlistStatCard label="Pending" value={stats.pending} />
        <WaitlistStatCard label="Approved" value={stats.approved} />
        <WaitlistStatCard label="Rejected" value={stats.rejected} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={filteredEntries}
        searchKey="email"
        isLoading={isLoading}
        filterActive={statusFilter !== "all"}
        filterContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="waitlist-status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as WaitlistStatus | "all")
                }
              >
                <SelectTrigger id="waitlist-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStatusFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}

function WaitlistStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

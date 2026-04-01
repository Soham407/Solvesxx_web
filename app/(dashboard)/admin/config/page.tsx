"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertCircle, RefreshCw, RotateCcw, Save } from "lucide-react";

import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import {
  SYSTEM_CONFIG_DEFAULTS,
  SYSTEM_CONFIG_METADATA,
} from "@/src/lib/platform/system-config";
import type { SystemConfigEntry, SystemConfigKey } from "@/src/types/platform";

type SystemConfigTableRow = SystemConfigEntry & {
  label: string;
  searchText: string;
};

export default function AdminSystemConfigPage() {
  const {
    entries,
    isLoading,
    error,
    refresh,
    updateEntry,
    isSaving,
    canManage,
  } = useSystemConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] =
    useState<Record<SystemConfigKey, string>>(SYSTEM_CONFIG_DEFAULTS);
  const [pendingKey, setPendingKey] = useState<SystemConfigKey | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
    }));
  }, [entries]);

  const rows = useMemo<SystemConfigTableRow[]>(
    () =>
      entries
        .map((entry) => ({
          ...entry,
          label: SYSTEM_CONFIG_METADATA[entry.key].label,
          searchText: [
            entry.key,
            SYSTEM_CONFIG_METADATA[entry.key].label,
            entry.description ?? "",
            entry.value,
          ]
            .join(" ")
            .toLowerCase(),
        }))
        .filter((row) =>
          deferredSearchQuery
            ? row.searchText.includes(deferredSearchQuery.toLowerCase())
            : true
        ),
    [deferredSearchQuery, entries]
  );

  const columns: ColumnDef<SystemConfigTableRow>[] = useMemo(
    () => [
      {
        accessorKey: "label",
        header: "Setting",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{row.original.label}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.description}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {row.original.key}
          </Badge>
        ),
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => {
          const metadata = SYSTEM_CONFIG_METADATA[row.original.key];

          return (
            <Input
              type="number"
              min={metadata.min}
              max={metadata.max}
              step={metadata.step ?? 1}
              value={drafts[row.original.key] ?? row.original.value}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [row.original.key]: event.target.value,
                }))
              }
              className="min-w-32"
            />
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {row.original.updatedAt
                ? format(new Date(row.original.updatedAt), "PPp")
                : "Never"}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.updatedBy ?? "System"}
            </p>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const draftValue = drafts[row.original.key] ?? row.original.value;
          const isDirty = draftValue.trim() !== row.original.value;
          const isPending = pendingKey === row.original.key;

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                disabled={!isDirty || isSaving}
                onClick={async () => {
                  setPendingKey(row.original.key);
                  try {
                    await updateEntry({
                      key: row.original.key,
                      value: draftValue,
                    });
                  } finally {
                    setPendingKey((current) =>
                      current === row.original.key ? null : current
                    );
                  }
                }}
              >
                <Save className="h-3.5 w-3.5" />
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!isDirty || isPending}
                onClick={() =>
                  setDrafts((current) => ({
                    ...current,
                    [row.original.key]: row.original.value,
                  }))
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          );
        },
      },
    ],
    [drafts, isSaving, pendingKey, updateEntry]
  );

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <PageHeader
        title="System Configuration"
        description="Manage runtime key-value settings stored in `system_config` without leaving the admin workspace."
        actions={
          canManage ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          ) : null
        }
      />

      {!canManage && !isLoading ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only users with the `admin` role can view or update system
            configuration entries.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DataTable
            columns={columns}
            data={rows}
            searchKey="configuration"
            onSearch={setSearchQuery}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import {
  History,
  ShieldCheck,
  Table as TableIcon,
  Eye,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";

const ACTION_STYLES: Record<string, string> = {
  created: "bg-success/10 text-success border-success/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-critical/10 text-critical border-critical/20",
  deleted: "bg-critical/10 text-critical border-critical/20",
  updated: "bg-info/10 text-info border-info/20",
  exported: "bg-primary/10 text-primary border-primary/20",
  dismissed: "bg-warning/10 text-warning border-warning/20",
};

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "created_at",
    header: "Timestamp",
    cell: ({ row }) => (
      <span className="text-xs font-mono">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "entity_type",
    header: "Module",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TableIcon className="h-3 w-3 text-muted-foreground" />
        <span className="font-bold uppercase text-[10px] tracking-tight">
          {row.original.entity_type.replace(/_/g, " ")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const val = row.original.action;
      return (
        <Badge
          variant="outline"
          className={ACTION_STYLES[val] || "bg-muted/10 text-muted-foreground border-border"}
        >
          {val}
        </Badge>
      );
    },
  },
  {
    accessorKey: "actor_name",
    header: "Actor",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground capitalize">
        {row.original.actor_name || "System"}
      </span>
    ),
  },
  {
    id: "view",
    header: "Evidence",
    cell: ({ row }) => (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px]">
            <Eye className="h-3 w-3" /> Inspect Change
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Audit Payload:{" "}
              {row.original.entity_type} — {row.original.action}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground">
                Before Change
              </h4>
              <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-auto max-h-96">
                {row.original.old_data
                  ? JSON.stringify(row.original.old_data, null, 2)
                  : "—"}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-success">
                After Change
              </h4>
              <pre className="p-3 bg-success/5 border border-success/10 rounded-lg text-[10px] overflow-auto max-h-96">
                {row.original.new_data
                  ? JSON.stringify(row.original.new_data, null, 2)
                  : "—"}
              </pre>
            </div>
          </div>
          {row.original.metadata && (
            <div className="mt-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2">
                Metadata
              </h4>
              <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-auto max-h-40">
                {JSON.stringify(row.original.metadata, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    ),
  },
];

export default function AuditLogsPage() {
  const { logs, isLoading, refresh } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Accessing secure audit vault...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Financial Audit Trail"
        description="Immutable record of all financial state changes. Ensuring operational, fulfillment, and financial truth."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-black uppercase">
              <ShieldCheck className="h-3 w-3" /> System Integrity Verified
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={refresh}>
              <History className="h-3 w-3" /> Refresh
            </Button>
          </div>
        }
      />

      <DataTable columns={columns} data={logs} searchKey="entity_type" />
    </div>
  );
}

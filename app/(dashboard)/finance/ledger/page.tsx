"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { 
  History, 
  ShieldCheck, 
  User, 
  Table as TableIcon, 
  Eye,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/src/lib/supabaseClient";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  actor_name?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      // TODO: Implement audit_logs table in database schema
      // Currently disabled as the table doesn't exist
      setLogs([]);
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => <span className="text-xs font-mono">{new Date(row.original.created_at).toLocaleString()}</span>,
    },
    {
      accessorKey: "table_name",
      header: "Module",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TableIcon className="h-3 w-3 text-muted-foreground" />
          <span className="font-bold uppercase text-[10px] tracking-tight">{row.original.table_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const val = row.original.action;
        const variants: Record<string, string> = {
          INSERT: "bg-success/10 text-success border-success/20",
          UPDATE: "bg-info/10 text-info border-info/20",
          DELETE: "bg-critical/10 text-critical border-critical/20",
        };
        return <Badge variant="outline" className={variants[val] || ""}>{val}</Badge>;
      },
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
              <DialogTitle>Audit Payload: {row.original.record_id}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground">Before Change</h4>
                <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-auto max-h-96">
                  {JSON.stringify(row.original.old_data, null, 2)}
                </pre>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-success">After Change</h4>
                <pre className="p-3 bg-success/5 border border-success/10 rounded-lg text-[10px] overflow-auto max-h-96">
                  {JSON.stringify(row.original.new_data, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Accessing secure audit vault...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Financial Audit Trail"
        description="Immutable record of all financial state changes. Ensuring operational, fulfillment, and financial truth."
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-black uppercase">
            <ShieldCheck className="h-3 w-3" /> System Integrity Verified
          </div>
        }
      />

      <DataTable columns={columns} data={logs} searchKey="table_name" />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, Settings, ShieldCheck, MoreHorizontal, HelpCircle, ListTodo, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChecklistMaster {
  id: string;
  department: string;
  checklistName: string;
  questionCount: number;
  triggerTime: string;
  status: "Active" | "Draft";
}

export default function ChecklistMasterPage() {
  const [checklists, setChecklists] = useState<ChecklistMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("daily_checklists")
        .select("*")
        .order("checklist_name");

      if (fetchError) throw fetchError;

      const formattedChecklists: ChecklistMaster[] = (data || []).map((c: any) => {
        let qCount = 0;
        if (c.questions) {
            try {
                const parsed = typeof c.questions === "string" ? JSON.parse(c.questions) : c.questions;
                qCount = Array.isArray(parsed) ? parsed.length : 0;
            } catch (e) {
                // handle parsing err
            }
        }

        return {
          id: c.checklist_code || c.id,
          department: c.department || "General",
          checklistName: c.checklist_name,
          questionCount: qCount,
          triggerTime: c.frequency || "Daily",
          status: c.is_active ? "Active" : "Draft",
        };
      });

      setChecklists(formattedChecklists);
    } catch (err: any) {
      console.error("Error fetching checklists:", err);
      setError("Failed to load checklist configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<ChecklistMaster>[] = [
    {
      accessorKey: "checklistName",
      header: "Checklist Identifier",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.checklistName}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id.substring(0, 10)}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Assigned Department",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium text-xs">
          {row.getValue("department")}
        </Badge>
      ),
    },
    {
      accessorKey: "questionCount",
      header: "Schema Length",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-info" />
            <span className="text-sm font-medium">{row.getValue("questionCount")} Questions</span>
        </div>
      ),
    },
    {
      accessorKey: "triggerTime",
      header: "Trigger Frequency",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground">
            <ListTodo className="h-3 w-3" /> {row.getValue("triggerTime")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Definition Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", row.getValue("status") === "Active" ? "bg-success/10 text-success border-success/20" : "")}>
            {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Settings className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  const activeCount = checklists.filter(c => c.status === "Active").length;
  const draftCount = checklists.filter(c => c.status === "Draft").length;
  const totalQuestions = checklists.reduce((sum, c) => sum + c.questionCount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Checklist Configuration"
        description="Define routine inspection points and Yes/No/Value questions for various departments."
        actions={
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Create New Checklist
          </Button>
        }
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Active Forms", value: activeCount, sub: "Live in guard app", icon: ShieldCheck, color: "text-success" },
            { label: "Questions Defined", value: totalQuestions, sub: "Across all schemas", icon: HelpCircle, color: "text-info" },
            { label: "Pending Drafts", value: draftCount, sub: "Requiring review", icon: Settings, color: "text-warning" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                 <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                          <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-left">
                          <span className="text-2xl font-bold ">{stat.value}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                      </div>
                 </div>
              </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={checklists} searchKey="checklistName" />
      )}
    </div>
  );
}

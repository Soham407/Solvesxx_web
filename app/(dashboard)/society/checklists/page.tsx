"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus,
  ClipboardList, 
  CheckCircle2, 
  Lock, 
  Image as ImageIcon,
  MoreHorizontal,
  Calendar,
  Filter,
  ArrowUpRight,
  Droplet,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChecklistItem {
  id: string;
  task: string;
  category: "Security" | "Utilities" | "Facilities";
  assignedTo: string;
  shiftDate: string;
  completedAt?: string;
  status: "Completed" | "Pending" | "Missed";
  hasEvidence: boolean;
  evidenceUrl: string | null;
  requiresEvidence: boolean;
  responseDate: string;
}

interface ChecklistDefinition {
  id: string;
  checklist_name: string;
  department: string | null;
  questions?: Array<{ id: string; question: string; required?: boolean; category?: string }> | null;
}

interface ChecklistTaskDefinition {
  id: string;
  checklist_id: string;
  task_name: string;
  description: string | null;
  requires_photo: boolean;
  priority: number;
}

interface ChecklistResponseRow {
  checklist_id: string;
  employee_id: string;
  response_date: string;
  submitted_at?: string | null;
  responses: Record<string, unknown>[] | Record<string, unknown> | null;
  is_complete: boolean | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

interface ChecklistStats {
  completionRate: number;
  pendingTasks: number;
  missingEvidence: number;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function parseStorageRef(value: string | null) {
  if (!value || isHttpUrl(value)) {
    return null;
  }

  const normalized = value.replace(/^storage:\/\//, "");
  const slashIndex = normalized.indexOf("/");

  if (slashIndex <= 0) {
    return null;
  }

  return {
    bucket: normalized.slice(0, slashIndex),
    path: normalized.slice(slashIndex + 1),
  };
}

export default function ChecklistsPage() {
  const [data, setData] = useState<ChecklistItem[]>([]);
  const [stats, setStats] = useState<ChecklistStats>({
    completionRate: 0,
    pendingTasks: 0,
    missingEvidence: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<{ task: string; url: string } | null>(null);

  const fetchChecklistData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];

      // Fetch all checklists
      const { data: checklists, error: checklistError } = await supabase
        .from("daily_checklists")
        .select("id, checklist_name, department, questions")
        .eq("is_active", true);

      if (checklistError) throw checklistError;

      const { data: checklistTasks, error: checklistTasksError } = await supabase
        .from("daily_checklist_items")
        .select("id, checklist_id, task_name, description, requires_photo, priority")
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      if (checklistTasksError) throw checklistTasksError;

      // Fetch today's responses
      const { data: responses, error: responseError } = await supabase
        .from("checklist_responses")
        .select(`
          id,
          checklist_id,
          employee_id,
          response_date,
          submitted_at,
          responses,
          is_complete,
          employees:employee_id (
            first_name,
            last_name
          )
        `)
        .eq("response_date", today);

      if (responseError) throw responseError;

      // Transform data into checklist items
      const items: ChecklistItem[] = [];

      const tasksByChecklist = new Map<string, ChecklistTaskDefinition[]>();
      ((checklistTasks || []) as ChecklistTaskDefinition[]).forEach((task) => {
        const existing = tasksByChecklist.get(task.checklist_id) || [];
        existing.push(task);
        tasksByChecklist.set(task.checklist_id, existing);
      });

      const buildCategory = (checklist: ChecklistDefinition, taskText: string) => {
        if (checklist.department === "security") return "Security" as const;
        if (
          checklist.department === "utilities" ||
          taskText.toLowerCase().includes("water") ||
          taskText.toLowerCase().includes("light")
        ) {
          return "Utilities" as const;
        }
        return "Facilities" as const;
      };

      const responseRows = ((responses || []) as ChecklistResponseRow[]);

      ((checklists || []) as ChecklistDefinition[]).forEach((checklist) => {
        const normalizedTasks =
          (tasksByChecklist.get(checklist.id) || []).map((task) => ({
            id: task.id,
            task: task.task_name,
            required: task.requires_photo,
          })) ||
          [];

        const fallbackQuestions =
          (checklist.questions || []).map((question) => ({
            id: question.id,
            task: question.question,
            required: Boolean(question.required),
          })) || [];

        const taskDefinitions = normalizedTasks.length > 0 ? normalizedTasks : fallbackQuestions;
        const checklistResponses = responseRows.filter((row) => row.checklist_id === checklist.id);

        const rowsToRender = checklistResponses;

        rowsToRender.forEach((response) => {
          const employeeName = response.employees
            ? `${response.employees.first_name || ""} ${response.employees.last_name || ""}`.trim()
            : "Unassigned";

          const legacyMap =
            response.responses && !Array.isArray(response.responses)
              ? (response.responses as Record<string, { completed?: boolean; completedAt?: string; photos?: unknown[] }>)
              : {};

          const mobileMap = new Map<string, Record<string, unknown>>();
          if (Array.isArray(response.responses)) {
            response.responses.forEach((item) => {
              const masterItemId =
                typeof item?.master_item_id === "string" ? item.master_item_id : null;
              if (masterItemId) {
                mobileMap.set(masterItemId, item);
              }
            });
          }

          taskDefinitions.forEach((taskDef) => {
            const legacyResponse = legacyMap[taskDef.id];
            const mobileResponse = mobileMap.get(taskDef.id);
            const isCompleted = Boolean(
              mobileResponse ||
              legacyResponse?.completed,
            );
            const hasEvidence = Boolean(
              (typeof mobileResponse?.evidence_url === "string" && mobileResponse.evidence_url) ||
              (legacyResponse?.photos && legacyResponse.photos.length > 0),
            );
            const evidenceUrl =
              typeof mobileResponse?.evidence_url === "string" && mobileResponse.evidence_url
                ? mobileResponse.evidence_url
                : null;
            const completedAtRaw =
              typeof legacyResponse?.completedAt === "string"
                ? legacyResponse.completedAt
                : typeof response.submitted_at === "string"
                  ? response.submitted_at
                  : null;

            items.push({
              id: `${checklist.id}-${response.employee_id || "unassigned"}-${taskDef.id}`,
              task: taskDef.task,
              category: buildCategory(checklist, taskDef.task),
              assignedTo: employeeName || "Unassigned",
              shiftDate: response.response_date
                ? new Date(response.response_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "--",
              completedAt: completedAtRaw
                ? new Date(completedAtRaw).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                : undefined,
              status: isCompleted ? "Completed" : "Pending",
              hasEvidence,
              evidenceUrl,
              requiresEvidence: taskDef.required,
              responseDate: response.response_date || today,
            });
          });
        });
      });

      setData(items);

      // Calculate stats
      const completed = items.filter(i => i.status === "Completed").length;
      const total = items.length || 1;
      const pending = items.filter(i => i.status === "Pending").length;
      
      const missingEvidence = items.filter((item) => item.requiresEvidence && item.status === "Completed" && !item.hasEvidence).length;

      setStats({
        completionRate: Math.round((completed / total) * 100),
        pendingTasks: pending,
        missingEvidence,
      });

    } catch (err) {
      console.error("Error fetching checklists:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch checklist data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklistData();
  }, []);

  const openEvidenceDialog = async (item: ChecklistItem) => {
    if (!item.evidenceUrl) return;

    const storageRef = parseStorageRef(item.evidenceUrl);
    let resolvedUrl = item.evidenceUrl;

    if (storageRef) {
      const { data, error } = await supabase.storage.from(storageRef.bucket).createSignedUrl(storageRef.path, 60 * 60);
      if (error || !data?.signedUrl) {
        setError(error?.message || "Evidence image could not be loaded.");
        return;
      }
      resolvedUrl = data.signedUrl;
    }

    setSelectedEvidence({ task: item.task, url: resolvedUrl });
    setEvidenceDialogOpen(true);
  };

  const columns: ColumnDef<ChecklistItem>[] = [
    {
      accessorKey: "task",
      header: "Operational Task",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            row.original.category === "Security" ? "bg-primary/5 text-primary" :
            row.original.category === "Utilities" ? "bg-warning/5 text-warning" : "bg-info/5 text-info"
          )}>
            {row.original.category === "Security" ? <Lock className="h-4 w-4" /> :
             row.original.category === "Utilities" ? <Droplet className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.task}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.category}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "assignedTo",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">{row.getValue("assignedTo")}</span>
      ),
    },
    {
      accessorKey: "shiftDate",
      header: "Shift Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-bold">{row.getValue("shiftDate")}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const val = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={cn(
            "font-bold text-[10px] uppercase h-5",
            val === "Completed" ? "bg-success/10 text-success border-success/20" :
            val === "Pending" ? "bg-warning/10 text-warning border-warning/20" : "bg-critical/10 text-critical border-critical/20"
          )}>
            {val}
          </Badge>
        );
      },
    },
    {
      accessorKey: "evidence",
      header: "Evidence",
      cell: ({ row }) => (
        row.original.hasEvidence ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[10px] font-bold text-primary"
            onClick={() => void openEvidenceDialog(row.original)}
          >
            <ImageIcon className="h-3 w-3" /> View Photo
          </Button>
        ) : <span className="text-[10px] text-muted-foreground italic pl-3">-</span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Daily Operational Checklists"
        description="Monitor verification tasks, utility logs, and facility maintenance routines."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={fetchChecklistData}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-5">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-1.5 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </Card>
          ))
        ) : (
          [
            { label: "Completion Rate", value: `${stats.completionRate}%`, detail: "Based on submitted responses today", progress: stats.completionRate, color: "bg-success" },
            { label: "Pending Tasks", value: stats.pendingTasks.toString(), detail: "Recorded responses still incomplete", progress: Math.min(stats.pendingTasks * 5, 100), color: "bg-warning" },
            { label: "Missing Evidence", value: stats.missingEvidence.toString(), detail: "Completed tasks missing required proof", progress: Math.min(stats.missingEvidence * 10, 100), color: "bg-critical" },
          ].map((kpi, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-5">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{kpi.label}</span>
                    <span className="text-2xl font-bold">{kpi.value}</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", kpi.color)} style={{ width: `${Math.min(kpi.progress, 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{kpi.detail}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data} searchKey="task" />
      )}

      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvidence?.task || "Checklist Evidence"}</DialogTitle>
          </DialogHeader>
          {selectedEvidence ? (
            <img
              src={selectedEvidence.url}
              alt={selectedEvidence.task}
              className="max-h-[520px] w-full rounded-lg border object-contain bg-muted/30"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

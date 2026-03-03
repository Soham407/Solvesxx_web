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
  scheduledTime: string;
  completedAt?: string;
  status: "Completed" | "Pending" | "Missed";
  hasEvidence: boolean;
  responseDate: string;
}

interface ChecklistStats {
  completionRate: number;
  pendingTasks: number;
  criticalFailures: number;
}

export default function ChecklistsPage() {
  const [data, setData] = useState<ChecklistItem[]>([]);
  const [stats, setStats] = useState<ChecklistStats>({
    completionRate: 0,
    pendingTasks: 0,
    criticalFailures: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch today's responses
      const { data: responses, error: responseError } = await supabase
        .from("checklist_responses")
        .select(`
          id,
          checklist_id,
          employee_id,
          response_date,
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
      
      (checklists || []).forEach((checklist: any) => {
        const questions = (checklist.questions as Array<{ id: string; question: string; required?: boolean; category?: string }>) || [];
        
        // Find response for this checklist
        const response = (responses || []).find((r: any) => r.checklist_id === checklist.id);
        const responseData = response?.responses as Record<string, { completed: boolean; completedAt?: string; photos?: any[] }> || {};
        const employeeName = response?.employees 
          ? `${response.employees.first_name || ""} ${response.employees.last_name || ""}`.trim()
          : "Unassigned";

        questions.forEach((q, index) => {
          const taskResponse = responseData[q.id];
          const isCompleted = taskResponse?.completed || false;
          const hasPhotos = taskResponse?.photos && taskResponse.photos.length > 0;
          
          // Determine category based on department or question content
          let category: ChecklistItem["category"] = "Facilities";
          if (checklist.department === "security") category = "Security";
          else if (checklist.department === "utilities" || q.question?.toLowerCase().includes("water") || q.question?.toLowerCase().includes("light")) {
            category = "Utilities";
          }

          items.push({
            id: `${checklist.id}-${q.id}`,
            task: q.question,
            category,
            assignedTo: employeeName,
            scheduledTime: response?.response_date 
              ? new Date(response.response_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : "--:--",
            completedAt: taskResponse?.completedAt
              ? new Date(taskResponse.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : undefined,
            status: isCompleted ? "Completed" : "Pending",
            hasEvidence: hasPhotos,
            responseDate: response?.response_date || today,
          });
        });
      });

      setData(items);

      // Calculate stats
      const completed = items.filter(i => i.status === "Completed").length;
      const total = items.length || 1;
      const pending = items.filter(i => i.status === "Pending").length;
      
      // Count missed tasks (pending for more than 2 hours past scheduled time)
      const now = new Date();
      const missed = items.filter(i => {
        if (i.status !== "Pending") return false;
        const scheduled = new Date(`${today}T${i.scheduledTime}`);
        const hoursDiff = (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 2;
      }).length;

      setStats({
        completionRate: Math.round((completed / total) * 100),
        pendingTasks: pending,
        criticalFailures: missed,
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
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.category} • {row.original.id}</span>
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
      accessorKey: "scheduledTime",
      header: "Schedule",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-bold">{row.getValue("scheduledTime")}</span>
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
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[10px] font-bold text-primary">
            <ImageIcon className="h-3 w-3" /> View Photo
          </Button>
        ) : <span className="text-[10px] text-muted-foreground italic pl-3">-</span>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Guard Notes</DropdownMenuItem>
            <DropdownMenuItem>Reschedule Task</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filter Logs
            </Button>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Create Schema
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
            { label: "Completion Rate", value: `${stats.completionRate}%`, detail: "Avg. last 7 days", progress: stats.completionRate, color: "bg-success" },
            { label: "Pending Tasks", value: stats.pendingTasks.toString(), detail: "Requiring attention", progress: Math.min(stats.pendingTasks * 5, 100), color: "bg-warning" },
            { label: "Critical Failure", value: stats.criticalFailures.toString(), detail: "Alerts generated", progress: Math.min(stats.criticalFailures * 10, 100), color: "bg-critical" },
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
    </div>
  );
}

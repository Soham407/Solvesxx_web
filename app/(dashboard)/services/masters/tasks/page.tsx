"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, Wrench, Clock, MoreHorizontal, Settings, Activity, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobTask {
  id: string;
  taskTitle: string;
  category: string;
  estimatedDuration: string;
  priority: "High" | "Standard";
  status: "Active" | "Archived";
}

export default function WorkTasksPage() {
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("service_tasks")
        .select("*")
        .order("task_name");

      if (fetchError) throw fetchError;

      const formattedTasks: JobTask[] = (data || []).map((t: any) => ({
        id: t.id,
        taskTitle: t.task_name,
        category: t.service_type || "General",
        // estimatedDuration and priority are not in standard schema; mocking for UI
        estimatedDuration: t.description || "30 Mins",
        priority: "Standard",
        status: t.is_active ? "Active" : "Archived",
      }));

      setTasks(formattedTasks);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load work master tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<JobTask>[] = [
    {
      accessorKey: "taskTitle",
      header: "Operation / Job Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-info/5 flex items-center justify-center">
            <Activity className="h-4 w-4 text-info" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.taskTitle}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id.substring(0, 8)}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Service Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium text-xs">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "estimatedDuration",
      header: "Standard TAT",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{row.getValue("estimatedDuration")}</span>
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Job Priority",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "font-bold text-[10px] uppercase h-5 px-2",
            row.getValue("priority") === "High" ? "bg-critical/5 text-critical border-critical/20" : "bg-info/5 text-info border-info/20"
        )}>
            {row.getValue("priority")}
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

  const activeCount = tasks.filter(t => t.status === "Active").length;
  const archivedCount = tasks.filter(t => t.status === "Archived").length;
  const highPriorityCount = tasks.filter(t => t.priority === "High").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Work Master"
        description="Comprehensive library of all possible technical tasks and operational job types across the organization."
        actions={
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Add Job Type
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
            { label: "Defined Jobs", value: activeCount + archivedCount, icon: ListTodo, sub: "Across all domains" },
            { label: "High Priority", value: highPriorityCount, icon: Activity, sub: "Urgent response tasks" },
            { label: "Archived", value: archivedCount, icon: Settings, sub: "Historical operations" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                  <div className="flex items-center justify-between mb-2">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
                          <stat.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                  </div>
                  <div className="flex flex-col text-left">
                      <span className="text-2xl font-bold ">{stat.value}</span>
                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
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
        <DataTable columns={columns} data={tasks} searchKey="taskTitle" />
      )}
    </div>
  );
}

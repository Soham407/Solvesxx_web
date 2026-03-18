"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, Wrench, Clock, MoreHorizontal, Settings, Activity, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkMaster, WorkMaster } from "@/hooks/useWorkMaster";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";

const EMPTY_FORM = { work_name: "", skill_level_required: "", standard_time_minutes: "", priority: "medium", description: "" };

export default function WorkTasksPage() {
  const { workItems, isLoading, error, createWorkItem, refresh } = useWorkMaster();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkMaster | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: WorkMaster) => {
    setEditTarget(item);
    setForm({
      work_name: item.work_name,
      skill_level_required: item.skill_level_required || "",
      standard_time_minutes: item.standard_time_minutes?.toString() || "",
      priority: (item as any).priority || "medium",
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.work_name) return;
    setIsSubmitting(true);
    try {
      if (editTarget) {
        const { error } = await supabase.from("work_master").update({
          work_name: form.work_name,
          skill_level_required: form.skill_level_required || null,
          standard_time_minutes: form.standard_time_minutes ? parseInt(form.standard_time_minutes) : null,
          priority: form.priority,
          description: form.description || null,
        }).eq("id", editTarget.id);
        if (error) throw error;
        toast.success("Task updated");
        refresh();
      } else {
        await createWorkItem({
          work_code: `WM-${Date.now()}`,
          work_name: form.work_name,
          skill_level_required: form.skill_level_required || null,
          standard_time_minutes: form.standard_time_minutes ? parseInt(form.standard_time_minutes) : null,
          description: form.description || null,
          is_active: true,
        });
        toast.success("Task created");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("work_master").update({ is_active: false }).eq("id", id);
      if (error) throw error;
      toast.success("Task archived");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive task");
    }
  };

  const columns: ColumnDef<WorkMaster>[] = [
    {
      accessorKey: "work_name",
      header: "Operation / Job Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-info/5 flex items-center justify-center">
            <Activity className="h-4 w-4 text-info" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.work_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.work_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "skill_level_required",
      header: "Service Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium text-xs">
          {row.getValue("skill_level_required") || "General"}
        </Badge>
      ),
    },
    {
      accessorKey: "standard_time_minutes",
      header: "Standard TAT",
      cell: ({ row }) => {
        const mins = row.getValue("standard_time_minutes") as number | null;
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{mins ? `${mins} min` : "—"}</span>
          </div>
        );
      },
    },
    {
      id: "priority",
      header: "Job Priority",
      cell: ({ row }) => {
        const priority = (row.original as any).priority || "medium";
        const variants: Record<string, string> = {
          high: "bg-critical/5 text-critical border-critical/20",
          medium: "bg-info/5 text-info border-info/20",
          low: "bg-muted text-muted-foreground",
        };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5 px-2", variants[priority])}>
            {priority}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(row.original)}>
            <Settings className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit Task</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original.id)}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const highPriorityCount = workItems.filter(t => (t as any).priority === "high").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Work Master"
        description="Comprehensive library of all possible technical tasks and operational job types across the organization."
        actions={
          <Button className="gap-2 shadow-sm" onClick={openCreate}>
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
            { label: "Defined Jobs", value: workItems.length, icon: ListTodo, sub: "Across all domains" },
            { label: "High Priority", value: highPriorityCount, icon: Activity, sub: "Urgent response tasks" },
            { label: "With Time Estimates", value: workItems.filter(t => t.standard_time_minutes).length, icon: Clock, sub: "TAT defined" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DataTable columns={columns} data={workItems} searchKey="work_name" isLoading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Job Type" : "Add Job Type"}</DialogTitle>
            <DialogDescription>Define a task in the Work Master library.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Task Name *</Label>
              <Input value={form.work_name} onChange={e => setForm({ ...form, work_name: e.target.value })} placeholder="e.g., Deep Cleaning" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skill Level</Label>
                <Input value={form.skill_level_required} onChange={e => setForm({ ...form, skill_level_required: e.target.value })} placeholder="e.g., Basic, Trained" />
              </div>
              <div className="space-y-2">
                <Label>Estimated Duration (min)</Label>
                <Input type="number" value={form.standard_time_minutes} onChange={e => setForm({ ...form, standard_time_minutes: e.target.value })} placeholder="30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !form.work_name}>
              {isSubmitting ? "Saving..." : editTarget ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

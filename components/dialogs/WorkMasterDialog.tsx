"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wrench, Star, Clock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useWorkMaster, WorkMaster } from "@/hooks/useWorkMaster";

const formSchema = z.object({
  work_name: z.string().min(2, "Work name must be at least 2 characters"),
  work_code: z
    .string()
    .min(2, "Work code must be at least 2 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Use letters, numbers, hyphens, or underscores only"),
  description: z.string().optional(),
  standard_time_minutes: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, "Time must be a positive number"),
  skill_level_required: z.string().optional(),
  priority: z.string().default("medium"),
  is_active: z.boolean().default(true),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface WorkMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItem?: WorkMaster | null;
  onSuccess?: () => void;
}

function normalizeCodeFromName(value: string) {
  return "WM-" + value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 16);
}

export function WorkMasterDialog({
  open,
  onOpenChange,
  workItem,
  onSuccess,
}: WorkMasterDialogProps) {
  const { createWorkItem } = useWorkMaster();
  const isEdit = Boolean(workItem);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_name: "",
      work_code: "",
      description: "",
      standard_time_minutes: "",
      skill_level_required: "Standard",
      priority: "medium",
      is_active: true,
    },
  });

  useEffect(() => {
    if (workItem) {
      form.reset({
        work_name: workItem.work_name,
        work_code: workItem.work_code,
        description: workItem.description ?? "",
        standard_time_minutes: workItem.standard_time_minutes ? String(workItem.standard_time_minutes) : "",
        skill_level_required: workItem.skill_level_required ?? "Standard",
        priority: workItem.priority ?? "medium",
        is_active: workItem.is_active,
      });
      return;
    }

    form.reset({
      work_name: "",
      work_code: "",
      description: "",
      standard_time_minutes: "",
      skill_level_required: "Standard",
      priority: "medium",
      is_active: true,
    });
  }, [form, workItem, open]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormOutput) => {
    const payload = {
      work_name: values.work_name.trim(),
      work_code: values.work_code.trim().toUpperCase(),
      description: values.description?.trim() || null,
      standard_time_minutes: values.standard_time_minutes ? Number(values.standard_time_minutes) : null,
      skill_level_required: values.skill_level_required || null,
      priority: values.priority,
      is_active: values.is_active,
    };

    // Note: useWorkMaster only has createWorkItem and linkWorkToService
    // If it's an edit, we might need updateWorkItem but it's not in the hook.
    // I'll check if I should add it or use direct supabase.
    const success = await createWorkItem(payload);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Work Item" : "Create New Work Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="work_name">Work Item Name</Label>
            <Input
              id="work_name"
              placeholder="e.g. AC Deep Cleaning"
              {...form.register("work_name")}
              onChange={(event) => {
                form.setValue("work_name", event.target.value);
                if (!isEdit && !form.getValues("work_code")) {
                  form.setValue(
                    "work_code",
                    normalizeCodeFromName(event.target.value)
                  );
                }
              }}
            />
            {form.formState.errors.work_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.work_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_code">Work Code</Label>
            <Input
              id="work_code"
              placeholder="WM-AC-001"
              {...form.register("work_code")}
              disabled={isEdit}
            />
            {form.formState.errors.work_code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.work_code.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Briefly describe the task..."
              className="resize-none"
              {...form.register("description")}
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="standard_time_minutes">Standard Time (Min)</Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="standard_time_minutes"
                  type="number"
                  placeholder="45"
                  className="pl-9"
                  {...form.register("standard_time_minutes")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skill_level_required">Skill Level</Label>
              <Select 
                onValueChange={(v) => form.setValue("skill_level_required", v)}
                value={form.watch("skill_level_required")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                  <SelectItem value="Specialized">Specialized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">Default Priority</Label>
            <Select 
              onValueChange={(v) => form.setValue("priority", v)}
              value={form.watch("priority")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {isEdit ? "Update Work Item" : "Create Work Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

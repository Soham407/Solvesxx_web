"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ClipboardCheck, Plus, Trash2, HelpCircle } from "lucide-react";

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
import { useChecklists, Checklist } from "@/hooks/useChecklists";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const questionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, "Question is required"),
  type: z.enum(["yes_no", "value"]),
  required: z.boolean().default(true),
});

const formSchema = z.object({
  checklist_name: z.string().min(2, "Checklist name must be at least 2 characters"),
  checklist_code: z
    .string()
    .min(2, "Checklist code must be at least 2 characters")
    .regex(/^[A-Za-z0-9-_]+$/, "Use letters, numbers, hyphens, or underscores only"),
  department: z.string().min(1, "Department is required"),
  description: z.string().optional(),
  frequency: z.string().default("daily"),
  is_active: z.boolean().default(true),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface ChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist?: Checklist | null;
  onSuccess?: () => void;
}

function normalizeCodeFromName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "")
    .slice(0, 19);
}

export function ChecklistDialog({
  open,
  onOpenChange,
  checklist,
  onSuccess,
}: ChecklistDialogProps) {
  const { createChecklist, updateChecklist } = useChecklists();
  const isEdit = Boolean(checklist);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      checklist_name: "",
      checklist_code: "",
      department: "Security",
      description: "",
      frequency: "daily",
      is_active: true,
      questions: [{ id: crypto.randomUUID(), question: "", type: "yes_no", required: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  useEffect(() => {
    if (checklist) {
      form.reset({
        checklist_name: checklist.checklist_name,
        checklist_code: checklist.checklist_code,
        department: checklist.department,
        description: checklist.description ?? "",
        frequency: checklist.frequency,
        is_active: checklist.is_active,
        questions: checklist.questions,
      });
      return;
    }

    form.reset({
      checklist_name: "",
      checklist_code: "",
      department: "Security",
      description: "",
      frequency: "daily",
      is_active: true,
      questions: [{ id: crypto.randomUUID(), question: "", type: "yes_no", required: true }],
    });
  }, [form, checklist, open]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormOutput) => {
    const payload = {
      ...values,
      checklist_name: values.checklist_name.trim(),
      checklist_code: values.checklist_code.trim().toUpperCase(),
    };

    const result = isEdit && checklist
      ? await updateChecklist(checklist.id, payload)
      : await createChecklist(payload);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Checklist Configuration" : "New Checklist Configuration"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="checklist_name">Checklist Name</Label>
                  <Input
                    id="checklist_name"
                    placeholder="E.g., Night Patrol Checklist"
                    {...form.register("checklist_name")}
                    onChange={(event) => {
                      form.setValue("checklist_name", event.target.value);
                      if (!isEdit && !form.getValues("checklist_code")) {
                        form.setValue(
                          "checklist_code",
                          normalizeCodeFromName(event.target.value)
                        );
                      }
                    }}
                  />
                  {form.formState.errors.checklist_name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.checklist_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checklist_code">Checklist Code</Label>
                  <Input
                    id="checklist_code"
                    placeholder="E.g., CHK-SEC-001"
                    {...form.register("checklist_code")}
                    disabled={isEdit}
                  />
                  {form.formState.errors.checklist_code && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.checklist_code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department">Assigned Department</Label>
                  <Select 
                    onValueChange={(v) => form.setValue("department", v)}
                    defaultValue={form.getValues("department")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Pest Control">Pest Control</SelectItem>
                      <SelectItem value="Plantation">Plantation</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.department && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.department.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="frequency">Trigger Frequency</Label>
                  <Select 
                    onValueChange={(v) => form.setValue("frequency", v)}
                    defaultValue={form.getValues("frequency")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="What is this checklist used for?"
                  className="resize-none"
                  {...form.register("description")}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Question Schema</Label>
                    <Badge variant="secondary" className="font-mono">{fields.length}</Badge>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({ id: crypto.randomUUID(), question: "", type: "yes_no", required: true })}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 rounded-lg border bg-muted/30 space-y-3 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid gap-3 sm:grid-cols-4 items-end">
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label>Question Text</Label>
                          <Input 
                            placeholder="E.g., Are all fire extinguishers checked?"
                            {...form.register(`questions.${index}.question`)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Response Type</Label>
                          <Select 
                            onValueChange={(v) => form.setValue(`questions.${index}.type` as any, v)}
                            defaultValue={field.type}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes_no">Yes / No</SelectItem>
                              <SelectItem value="value">Text Value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center h-10">
                          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              {...form.register(`questions.${index}.required`)}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      {form.formState.errors.questions?.[index]?.question && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.questions[index]?.question?.message}
                        </p>
                      )}
                    </div>
                  ))}
                  {form.formState.errors.questions?.message && (
                    <p className="text-sm text-destructive font-medium">
                      {form.formState.errors.questions.message}
                    </p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...form.register("is_active")}
                />
                Checklist is active and available in mobile app
              </label>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              {isEdit ? "Update Checklist" : "Create Checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

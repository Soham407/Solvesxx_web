"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Link2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useWorkMaster, WorkMaster } from "@/hooks/useWorkMaster";
import { SERVICE_TYPE_OPTIONS } from "@/hooks/useServiceDeploymentMasters";

const formSchema = z.object({
  service_type: z.string().min(1, "Service type is required"),
  work_id: z.string().min(1, "Work item is required"),
});

type FormInput = z.input<typeof formSchema>;

interface LinkWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItem?: WorkMaster | null;
  onSuccess?: () => void;
}

export function LinkWorkDialog({
  open,
  onOpenChange,
  workItem,
  onSuccess,
}: LinkWorkDialogProps) {
  const { linkWorkToService, workItems, isLoading } = useWorkMaster();

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_type: "",
      work_id: workItem?.id || "",
    },
  });

  // Update work_id when workItem changes
  if (workItem && form.getValues("work_id") !== workItem.id) {
    form.setValue("work_id", workItem.id);
  }

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormInput) => {
    const success = await linkWorkToService(values.service_type, values.work_id);

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
            <Link2 className="h-5 w-5 text-primary" />
            Link Work to Service
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="work_id">Work Item</Label>
            <Select 
              onValueChange={(v) => form.setValue("work_id", v)}
              value={form.watch("work_id")}
              disabled={Boolean(workItem) || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select work item" />
              </SelectTrigger>
              <SelectContent>
                {workItems.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.work_name} ({w.work_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service_type">Service Category</Label>
            <Select 
              onValueChange={(v) => form.setValue("service_type", v)}
              value={form.watch("service_type")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service category" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.service_type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.service_type.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Create Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

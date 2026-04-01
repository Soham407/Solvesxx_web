"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Briefcase } from "lucide-react";
import { useDesignations } from "@/hooks/useDesignations";
import { Designation } from "@/src/types/company";
import { useEffect } from "react";

const formSchema = z.object({
  designation_name: z.string().min(2, "Name must be at least 2 characters"),
  designation_code: z.string().min(2, "Code must be at least 2 characters"),
  department: z.string().optional(),
  level: z.enum(["junior", "senior", "lead", "head"]),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface DesignationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designation?: Designation; // If provided, we're in edit mode
  onSuccess?: () => void;
}

export function DesignationDialog({
  open,
  onOpenChange,
  designation,
  onSuccess,
}: DesignationDialogProps) {
  const { createDesignation, updateDesignation } = useDesignations();
  const isEdit = !!designation;

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      designation_name: "",
      designation_code: "",
      department: "",
      level: "junior",
      description: "",
      is_active: true,
    },
  });

  // Update form values when designation changes (for edit mode)
  useEffect(() => {
    if (designation) {
      form.reset({
        designation_name: designation.designation_name,
        designation_code: designation.designation_code,
        department: designation.department || "",
        level: (designation.level as any) || "junior",
        description: designation.description || "",
        is_active: designation.is_active ?? true,
      });
    } else {
      form.reset({
        designation_name: "",
        designation_code: "",
        department: "",
        level: "junior",
        description: "",
        is_active: true,
      });
    }
  }, [designation, form, open]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormOutput) => {
    let result;
    if (isEdit && designation) {
      result = await updateDesignation({
        id: designation.id,
        payload: values,
      });
    } else {
      result = await createDesignation(values);
    }

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Designation" : "Add New Designation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Name (Required)</Label>
                <Input 
                  placeholder="Senior Manager" 
                  {...form.register("designation_name")} 
                  onChange={(e) => {
                    form.setValue("designation_name", e.target.value);
                    if (!isEdit && !form.getValues("designation_code")) {
                      // Auto-generate code from name
                      const code = e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^A-Z0-9-]/g, "");
                      if (code) form.setValue("designation_code", `DESG-${code}`);
                    }
                  }}
                />
                {form.formState.errors.designation_name && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{form.formState.errors.designation_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Code (Unique)</Label>
                <Input placeholder="DESG-SM" {...form.register("designation_code")} disabled={isEdit} />
                {form.formState.errors.designation_code && (
                  <p className="text-[10px] text-destructive font-medium uppercase">{form.formState.errors.designation_code.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Department</Label>
                <Input placeholder="Operations" {...form.register("department")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Level</Label>
                <Select
                  value={form.watch("level")}
                  onValueChange={(val: any) => form.setValue("level", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="head">Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase">Description</Label>
              <Textarea
                placeholder="Brief description of the role..."
                className="resize-none"
                rows={2}
                {...form.register("description")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                {...form.register("is_active")}
              />
              <Label htmlFor="is_active" className="text-sm cursor-pointer font-medium">Active Designation</Label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Designation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Wrench, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/src/lib/supabaseClient";
import type { Database } from "@/src/types/supabase";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  location: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  estimatedHours: z.coerce.number().min(0.5, "Must be at least 0.5 hours").max(24, "Cannot exceed 24 hours").optional().or(z.literal("")),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

interface NewJobOrderDialogProps {
  children: React.ReactNode;
  serviceType?: string;
  onSuccess?: () => void;
}

export function NewJobOrderDialog({ children, serviceType = "Service", onSuccess }: NewJobOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      priority: "normal",
      category: "",
      estimatedHours: "",
    },
  });

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen]);

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: FormValues) => {
    try {
      type ServiceRequestInsert = Database["public"]["Tables"]["service_requests"]["Insert"];
      const requestNumber = `SR-${Date.now().toString(36).toUpperCase()}`;
      const description = values.location
        ? `${values.description}\n\nLocation: ${values.location}`
        : values.description;
      const payload: ServiceRequestInsert = {
        request_number: requestNumber,
        description,
        type: values.category || serviceType,
        priority: values.priority as ServiceRequestInsert["priority"],
        status: "open",
        created_at: new Date().toISOString(),
        title: values.title,
        estimated_duration_minutes: values.estimatedHours ? Math.round(Number(values.estimatedHours) * 60) : null,
      };
      const { error } = await supabase.from("service_requests").insert(payload);

      if (error) throw error;

      toast({
        title: "Job Order Created",
        description: "New job order has been created successfully.",
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: "Failed to create job order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            New {serviceType} Job Order
          </DialogTitle>
          <DialogDescription>
            Create a new job order for technical services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input placeholder="Enter job title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                  <Select
                  value={form.watch("priority")}
                  onValueChange={(value) => form.setValue("priority", value as FormInput["priority"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="Enter work location" {...form.register("location")} />
            </div>

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="Estimated time required"
                {...form.register("estimatedHours")}
              />
              {form.formState.errors.estimatedHours && (
                <p className="text-xs text-destructive">{form.formState.errors.estimatedHours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Detailed description of the work required..."
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Job Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

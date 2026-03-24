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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Loader2, Clock, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const supabase = supabaseTyped as any;

const formSchema = z.object({
  adjustmentType: z.string().min(1, "Adjustment type required"),
  time: z.string().min(1, "Time is required").regex(/^\d{2}:\d{2}$/, "Enter a valid time"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().min(10, "Notes must be at least 10 characters").or(z.literal("")).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualAdjustmentDialogProps {
  children: React.ReactNode;
  employeeId?: string;
  employeeName?: string;
}

export function ManualAdjustmentDialog({
  children,
  employeeId,
  employeeName
}: ManualAdjustmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      adjustmentType: "checkin",
      time: "",
      reason: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setDate(new Date());
    }
  }, [isOpen]);

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: FormValues) => {
    if (!employeeId) {
      toast({ title: "Missing Information", description: "No employee selected.", variant: "destructive" });
      return;
    }

    try {
      const today = date.toISOString().split("T")[0];

      const { data: existingLog } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("log_date", today)
        .single();

      const updateData: any = {};
      if (values.adjustmentType === "checkin") {
        updateData.check_in_time = `${today}T${values.time}:00`;
        updateData.status = "present";
      } else {
        updateData.check_out_time = `${today}T${values.time}:00`;
      }

      if (existingLog) {
        await supabase
          .from("attendance_logs")
          .update({
            ...updateData,
            is_manual_adjustment: true,
            adjustment_reason: values.reason,
            adjustment_notes: values.notes || null,
          })
          .eq("id", existingLog.id);
      } else {
        await supabase.from("attendance_logs").insert({
          employee_id: employeeId,
          log_date: today,
          ...updateData,
          status: "present",
          is_manual_adjustment: true,
          adjustment_reason: values.reason,
          adjustment_notes: values.notes || null,
        } as any);
      }

      toast({
        title: "Attendance Adjusted",
        description: `Manual ${values.adjustmentType} recorded for ${employeeName || "employee"}.`,
      });

      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to record adjustment. Please try again.",
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
            <UserCheck className="h-5 w-5" />
            Manual Attendance Adjustment
          </DialogTitle>
          <DialogDescription>
            Record manual check-in or check-out for attendance correction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select
                  value={form.watch("adjustmentType")}
                  onValueChange={(value) => form.setValue("adjustmentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkin">Check-In</SelectItem>
                    <SelectItem value="checkout">Check-Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input type="time" {...form.register("time")} />
              {form.formState.errors.time && (
                <p className="text-xs text-destructive">{form.formState.errors.time.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Reason for Adjustment
              </Label>
              <Select
                value={form.watch("reason")}
                onValueChange={(value) => form.setValue("reason", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forgot_checkin">Forgot to Check In</SelectItem>
                  <SelectItem value="forgot_checkout">Forgot to Check Out</SelectItem>
                  <SelectItem value="system_error">System Error</SelectItem>
                  <SelectItem value="device_issue">Device Issue</SelectItem>
                  <SelectItem value="manager_approval">Manager Approval</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Enter any additional details (min 10 characters)..."
                {...form.register("notes")}
              />
              {form.formState.errors.notes && (
                <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
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
                  Recording...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Record Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

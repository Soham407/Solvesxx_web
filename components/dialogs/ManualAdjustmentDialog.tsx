"use client";

import { useState } from "react";
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
import { UserCheck, Loader2, Clock, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/src/lib/supabaseClient";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    employeeId: employeeId || "",
    adjustmentType: "checkin",
    time: "",
    reason: "",
    notes: "",
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.time || !formData.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const today = date.toISOString().split("T")[0];
      const timeValue = formData.time;

      // Update or create attendance log
      const { data: existingLog } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("employee_id", formData.employeeId)
        .eq("log_date", today)
        .single();

      const updateData: any = {};
      if (formData.adjustmentType === "checkin") {
        updateData.check_in_time = `${today}T${timeValue}:00`;
        updateData.status = "present";
      } else {
        updateData.check_out_time = `${today}T${timeValue}:00`;
      }

      if (existingLog) {
        await supabase
          .from("attendance_logs")
          .update({
            ...updateData,
            is_manual_adjustment: true,
            adjustment_reason: formData.reason,
            adjustment_notes: formData.notes,
          })
          .eq("id", existingLog.id);
      } else {
        await supabase.from("attendance_logs").insert({
          employee_id: formData.employeeId,
          log_date: today,
          ...updateData,
          status: "present",
          is_manual_adjustment: true,
          adjustment_reason: formData.reason,
          adjustment_notes: formData.notes,
        } as any);
      }

      toast({
        title: "Attendance Adjusted",
        description: `Manual ${formData.adjustmentType} recorded for ${employeeName || "employee"}.`,
      });

      setIsOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to record adjustment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
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
                value={formData.adjustmentType}
                onValueChange={(value) => setFormData({ ...formData, adjustmentType: value })}
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
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Reason for Adjustment
            </Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
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
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Enter any additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
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
      </DialogContent>
    </Dialog>
  );
}

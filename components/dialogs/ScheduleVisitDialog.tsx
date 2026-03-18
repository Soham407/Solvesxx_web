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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock, Wrench, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useServiceRequests } from "@/hooks/useServiceRequests";

interface ScheduleVisitDialogProps {
  children: React.ReactNode;
  serviceType?: string;
}

export function ScheduleVisitDialog({ children, serviceType = "AC Service" }: ScheduleVisitDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    location: "",
    contactPerson: "",
    contactPhone: "",
    description: "",
    priority: "normal",
    preferredTime: "",
  });
  const { toast } = useToast();
  const { createRequest } = useServiceRequests();

  const handleSubmit = async () => {
    if (!date || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please select a date and enter a location.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await createRequest({
        title: `Scheduled ${serviceType} Visit`,
        description: formData.description,
        location_name: formData.location,
        contact_person: formData.contactPerson,
        contact_phone: formData.contactPhone,
        preferred_date: date.toISOString(),
        preferred_time: formData.preferredTime,
        priority: formData.priority,
        status: "scheduled",
      });

      if (!result.success) throw new Error(result.error || "Failed to schedule visit");

      toast({
        title: "Visit Scheduled",
        description: `Your ${serviceType} visit has been scheduled for ${format(date, "PPP")}.`,
      });

      setIsOpen(false);
      setFormData({
        location: "",
        contactPerson: "",
        contactPhone: "",
        description: "",
        priority: "normal",
        preferredTime: "",
      });
      setDate(undefined);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to schedule visit. Please try again.",
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
            <CalendarIcon className="h-5 w-5" />
            Schedule {serviceType} Visit
          </DialogTitle>
          <DialogDescription>
            Book a service visit at your preferred date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visit Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <Select
                value={formData.preferredTime}
                onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                  <SelectItem value="evening">Evening (4PM - 8PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location / Address</Label>
            <Input
              placeholder="Enter service location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                placeholder="Name"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                placeholder="Phone number"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
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

          <div className="space-y-2">
            <Label>Issue Description</Label>
            <Textarea
              placeholder="Describe the issue or service required..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                Scheduling...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Schedule Visit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

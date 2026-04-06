"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Users,
  XCircle,
} from "lucide-react";

import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { CompanyEvent, useCompanyEvents } from "@/hooks/useCompanyEvents";

const INITIAL_EVENT_FORM = {
  title: "",
  category: "Meeting",
  event_date: "",
  event_time: "",
  venue: "",
  attendees: "",
  description: "",
};

function getStatusClasses(status: CompanyEvent["status"]) {
  if (status === "Scheduled") {
    return "border-primary/20 bg-primary/10 text-primary";
  }

  if (status === "Completed") {
    return "border-success/20 bg-success/10 text-success";
  }

  if (status === "Cancelled") {
    return "border-critical/20 bg-critical/10 text-critical";
  }

  return "border-none bg-muted text-muted-foreground";
}

export default function CompanyEventsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const { events, isLoading, error, addEvent, updateEvent } = useCompanyEvents();

  const upcomingCount = events.filter((event) => event.status === "Scheduled").length;
  const drillCount = events.filter(
    (event) =>
      event.category === "Emergency Drill" &&
      event.event_date === new Date().toISOString().split("T")[0]
  ).length;

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.event_date || !eventForm.event_time || !eventForm.venue) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addEvent({
        event_code: `EVT-${Date.now().toString().slice(-6)}`,
        title: eventForm.title.trim(),
        category: eventForm.category,
        event_date: eventForm.event_date,
        event_time: eventForm.event_time,
        venue: eventForm.venue.trim(),
        attendees: eventForm.attendees.trim() || undefined,
        description: eventForm.description.trim() || undefined,
      });
      setEventForm(INITIAL_EVENT_FORM);
      setIsCreateDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (event: CompanyEvent, status: CompanyEvent["status"]) => {
    setIsSubmitting(true);
    try {
      await updateEvent(event.id, { status });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<CompanyEvent>[] = [
    {
      accessorKey: "title",
      header: "Event Title",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/5 text-info">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold">{row.original.title}</span>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {row.original.event_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Event Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="border-none bg-muted/50 text-xs font-bold text-muted-foreground/80 capitalize">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: "schedule",
      header: "Timeline",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <CalendarCheck className="h-3 w-3 text-primary" /> {row.original.event_date}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <Clock className="h-2.5 w-2.5" /> {row.original.event_time}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "venue",
      header: "Venue / Site",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="h-3 w-3 text-critical/50" /> {row.original.venue}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("h-5 text-[10px] font-bold uppercase", getStatusClasses(row.original.status))}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === "Scheduled" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isSubmitting}
                onClick={() => handleStatusUpdate(row.original, "Completed")}
              >
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isSubmitting}
                onClick={() => handleStatusUpdate(row.original, "Cancelled")}
              >
                <XCircle className="mr-2 h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Company Events"
        description="Unified scheduling and notification hub for society meetings, critical drills, and training sessions."
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> Schedule Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Event</DialogTitle>
                <DialogDescription>
                  Create a real calendar entry for staff communication and operational planning.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event_title">Event Title</Label>
                  <Input
                    id="event_title"
                    value={eventForm.title}
                    onChange={(event) =>
                      setEventForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Quarterly Fire Drill"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_category">Category</Label>
                    <Select
                      value={eventForm.category}
                      onValueChange={(value) =>
                        setEventForm((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger id="event_category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Emergency Drill">Emergency Drill</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_venue">Venue</Label>
                    <Input
                      id="event_venue"
                      value={eventForm.venue}
                      onChange={(event) =>
                        setEventForm((prev) => ({ ...prev, venue: event.target.value }))
                      }
                      placeholder="Main clubhouse"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_date">Event Date</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={eventForm.event_date}
                      onChange={(event) =>
                        setEventForm((prev) => ({ ...prev, event_date: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_time">Event Time</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={eventForm.event_time}
                      onChange={(event) =>
                        setEventForm((prev) => ({ ...prev, event_time: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_attendees">Attendees</Label>
                  <Input
                    id="event_attendees"
                    value={eventForm.attendees}
                    onChange={(event) =>
                      setEventForm((prev) => ({ ...prev, attendees: event.target.value }))
                    }
                    placeholder="Security staff, residents, management"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_description">Description</Label>
                  <Textarea
                    id="event_description"
                    value={eventForm.description}
                    onChange={(event) =>
                      setEventForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Agenda, notes, or required preparation"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEventForm(INITIAL_EVENT_FORM);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={
                    isSubmitting ||
                    !eventForm.title ||
                    !eventForm.event_date ||
                    !eventForm.event_time ||
                    !eventForm.venue
                  }
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Upcoming", value: upcomingCount.toString(), icon: CalendarCheck, color: "text-primary" },
          { label: "Drills Today", value: drillCount.toString(), icon: Megaphone, color: "text-critical" },
          { label: "Participants", value: events.length.toString(), icon: Users, color: "text-info" },
          { label: "Notifications", value: upcomingCount.toString(), icon: Bell, color: "text-warning" },
        ].map((stat) => (
          <Card key={stat.label} className="border-none p-4 shadow-card ring-1 ring-border">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50",
                  stat.color
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable columns={columns} data={events} searchKey="title" />
      )}
    </div>
  );
}

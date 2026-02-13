"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Bell, MapPin, Clock, Users, MoreHorizontal, Megaphone, CalendarCheck, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCompanyEvents, CompanyEvent } from "@/hooks/useCompanyEvents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CompanyEventsPage() {
  const { events, isLoading, error } = useCompanyEvents();

  const columns: ColumnDef<CompanyEvent>[] = [
    {
      accessorKey: "title",
      header: "Event Title",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-info/5 flex items-center justify-center text-info">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.title}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.event_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Event Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-bold text-xs text-muted-foreground/80 capitalize">
            {row.getValue("category")}
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
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
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
            <MapPin className="h-3 w-3 text-critical/50" /> {row.getValue("venue")}
        </div>
      ),
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const val = row.getValue("status") as string;
            return (
              <Badge variant="outline" className={cn(
                  "font-bold text-[10px] uppercase h-5",
                  val === "Scheduled" ? "bg-primary/10 text-primary border-primary/20" :
                  val === "Completed" ? "bg-success/10 text-success border-success/20" : 
                  val === "Cancelled" ? "bg-critical/10 text-critical border-critical/20" :
                  "bg-muted text-muted-foreground border-none"
              )}>
                  {val}
              </Badge>
            );
        },
      },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Bell className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
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

  const upcomingCount = events.filter(e => e.status === 'Scheduled').length;
  const drillCount = events.filter(e => e.category === 'Emergency Drill' && e.event_date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Company Events"
        description="Unified scheduling and notification hub for society meetings, critical drills, and training sessions."
        actions={
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Schedule Event
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Upcoming", value: upcomingCount.toString(), icon: CalendarCheck, color: "text-primary" },
          { label: "Drills Today", value: drillCount.toString(), icon: Megaphone, color: "text-critical" },
          { label: "Participants", value: "450", icon: Users, color: "text-info" },
          { label: "Notifications", value: "1.2k", icon: Bell, color: "text-warning" },
        ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-2xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
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


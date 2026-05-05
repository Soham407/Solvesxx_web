"use client";

import { useMemo } from "react";
import { Building, Calendar, Megaphone, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyEvent } from "@/hooks/useCompanyEvents";

export interface ResidentAnnouncementsSectionProps {
  events: CompanyEvent[];
}

export function ResidentAnnouncementsSection({ events }: ResidentAnnouncementsSectionProps) {
  const today = new Date().toISOString().split("T")[0];

  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => event.status === "Scheduled" && event.event_date >= today)
      .slice(0, 3);
  }, [events, today]);

  return (
    <>
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b bg-muted/5 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase">
            <Megaphone className="h-4 w-4 text-primary" />
            Society Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No upcoming announcements</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{event.title}</p>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary/20 bg-primary/5 text-[9px] font-bold uppercase"
                      >
                        {event.category}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.event_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <Building className="h-3 w-3 shrink-0" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none bg-muted/30">
        <CardContent className="flex items-center gap-4 p-4">
          <Shield className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Security Notice:</strong> All visitor data
              shown is specific to your flat. Pre-approved visitors will be verified by security
              at the gate.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

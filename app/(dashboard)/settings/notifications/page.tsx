"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Clock } from "lucide-react";

export default function NotificationsSettingsPage() {
  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Notification Settings"
        description="Configure platform-wide notification rules, channels, and escalation triggers."
      />
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
            <Bell className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Notification preferences, alert channels (email, push, in-app), and
              escalation rules will be configurable in a future release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

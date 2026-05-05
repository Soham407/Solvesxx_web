import { Activity, Settings2, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface SuperAdminSummaryCardsProps {
  stats: {
    total: number;
    active: number;
    superAdmins: number;
  };
  recentAuditEvents: number | "...";
  configKeyCount: number | "...";
  isLoadingAdmins: boolean;
  isLoadingLogs: boolean;
  isLoadingConfig: boolean;
}

export function SuperAdminSummaryCards({
  stats,
  recentAuditEvents,
  configKeyCount,
  isLoadingAdmins,
  isLoadingLogs,
  isLoadingConfig,
}: SuperAdminSummaryCardsProps) {
  const cards = [
    {
      title: "Admin Accounts",
      value: isLoadingAdmins ? "..." : stats.total.toString(),
      subtext: isLoadingAdmins ? "Loading accounts" : `${stats.superAdmins} super admins`,
      icon: Users,
    },
    {
      title: "Active Admins",
      value: isLoadingAdmins ? "..." : stats.active.toString(),
      subtext: isLoadingAdmins ? "Loading status" : `${stats.total - stats.active} suspended`,
      icon: ShieldCheck,
    },
    {
      title: "Recent Audit Events",
      value: isLoadingLogs ? "..." : recentAuditEvents.toString(),
      subtext: "Last 24 hours",
      icon: Activity,
    },
    {
      title: "Config Keys",
      value: isLoadingConfig ? "..." : configKeyCount.toString(),
      subtext: "Platform controls seeded",
      icon: Settings2,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.subtext}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

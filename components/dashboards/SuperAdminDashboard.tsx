"use client";

import Link from "next/link";
import { ShieldCheck, Users, KeyRound, Activity, ArrowRight, Settings2 } from "lucide-react";

import { usePlatformAdminAccounts } from "@/hooks/usePlatformAdminAccounts";
import { usePlatformAuditLogs } from "@/hooks/usePlatformAuditLogs";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { usePlatformRolePermissions } from "@/hooks/usePlatformRolePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SuperAdminDashboard() {
  const { stats, admins, isLoading: isLoadingAdmins } = usePlatformAdminAccounts();
  const { summary, logs, isLoading: isLoadingLogs } = usePlatformAuditLogs(20);
  const { entries, isLoading: isLoadingConfig } = usePlatformConfig();
  const { permissionCoverage, isLoading: isLoadingPermissions } =
    usePlatformRolePermissions();

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
      value: isLoadingLogs ? "..." : summary.recent.toString(),
      subtext: "Last 24 hours",
      icon: Activity,
    },
    {
      title: "Config Keys",
      value: isLoadingConfig ? "..." : entries.length.toString(),
      subtext: "Platform controls seeded",
      icon: Settings2,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Platform Control Center
              </CardTitle>
              <CardDescription>
                Core platform administration surfaces for the super admin role.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              {
                href: "/settings/admins",
                title: "Admin Management",
                description: "Invite, suspend, promote, and reset admin-tier accounts.",
              },
              {
                href: "/settings/permissions",
                title: "Role & Permissions",
                description: "Assign the platform permission keys for this slice.",
              },
              {
                href: "/settings/audit-logs",
                title: "Audit Logs",
                description: "Inspect platform actions across accounts, roles, and settings.",
              },
              {
                href: "/settings/company",
                title: "System Configuration",
                description: "Tune inactivity, geo-fence, and checklist thresholds.",
              },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="h-full border border-border/60 bg-muted/10 transition-all hover:border-primary/40 hover:bg-primary/5">
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center text-xs font-semibold text-primary">
                      Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">
              Permission Coverage
            </CardTitle>
            <CardDescription>
              Roles currently carrying each platform permission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(permissionCoverage).map(([permission, count]) => (
              <div
                key={permission}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{permission}</p>
                </div>
                <Badge variant="outline" className="font-bold">
                  {isLoadingPermissions ? "..." : count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Recent Audit Activity
              </CardTitle>
              <CardDescription>Latest platform control actions.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/settings/audit-logs">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isLoadingLogs ? [] : logs.slice(0, 6)).map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{log.action}</p>
                  <Badge variant="secondary">{log.entityType}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.actorName ?? "System"} · {log.actorRole ?? "unknown role"}
                </p>
              </div>
            ))}
            {!isLoadingLogs && logs.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No audit activity recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">
              Admin Snapshot
            </CardTitle>
            <CardDescription>Admin-tier accounts currently provisioned.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isLoadingAdmins ? [] : admins.slice(0, 6)).map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{admin.fullName}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={admin.roleName === "super_admin" ? "border-primary/30 text-primary" : ""}
                >
                  {admin.roleDisplayName}
                </Badge>
              </div>
            ))}
            {!isLoadingAdmins && admins.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No admin-tier accounts found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminAccount } from "@/src/types/platform";
import type { PlatformAuditLog } from "@/src/types/platform";

export interface SuperAdminActivityPanelsProps {
  logs: PlatformAuditLog[];
  admins: AdminAccount[];
  isLoadingLogs: boolean;
  isLoadingAdmins: boolean;
}

export function SuperAdminActivityPanels({
  logs,
  admins,
  isLoadingLogs,
  isLoadingAdmins,
}: SuperAdminActivityPanelsProps) {
  return (
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
  );
}

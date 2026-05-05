"use client";

import { usePlatformAdminAccounts } from "@/hooks/usePlatformAdminAccounts";
import { usePlatformAuditLogs } from "@/hooks/usePlatformAuditLogs";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { usePlatformRolePermissions } from "@/hooks/usePlatformRolePermissions";
import { SuperAdminSummaryCards } from "@/components/dashboards/SuperAdminSummaryCards";
import { SuperAdminControlCenter } from "@/components/dashboards/SuperAdminControlCenter";
import { SuperAdminPermissionCoverage } from "@/components/dashboards/SuperAdminPermissionCoverage";
import { SuperAdminActivityPanels } from "@/components/dashboards/SuperAdminActivityPanels";

export function SuperAdminDashboard() {
  const { stats, admins, isLoading: isLoadingAdmins } = usePlatformAdminAccounts();
  const { summary, logs, isLoading: isLoadingLogs } = usePlatformAuditLogs(20);
  const { entries, isLoading: isLoadingConfig } = usePlatformConfig();
  const { permissionCoverage, isLoading: isLoadingPermissions } =
    usePlatformRolePermissions();

  return (
    <div className="space-y-8 animate-fade-in">
      <SuperAdminSummaryCards
        stats={stats}
        recentAuditEvents={isLoadingLogs ? "..." : summary.recent}
        configKeyCount={entries.length}
        isLoadingAdmins={isLoadingAdmins}
        isLoadingLogs={isLoadingLogs}
        isLoadingConfig={isLoadingConfig}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <SuperAdminControlCenter />
        <SuperAdminPermissionCoverage
          permissionCoverage={permissionCoverage}
          isLoading={isLoadingPermissions}
        />
      </div>

      <SuperAdminActivityPanels
        logs={logs}
        admins={admins}
        isLoadingLogs={isLoadingLogs}
        isLoadingAdmins={isLoadingAdmins}
      />
    </div>
  );
}

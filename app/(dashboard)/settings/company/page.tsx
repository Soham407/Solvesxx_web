"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SystemConfigControls } from "@/components/settings/SystemConfigControls";
import { SystemConfigSummaryCards } from "@/components/settings/SystemConfigSummaryCards";
import {
  SYSTEM_CONFIG_DEFAULTS,
  SYSTEM_CONFIG_METADATA,
} from "@/src/lib/platform/system-config";
import type { SystemConfigKey } from "@/src/types/platform";

export default function CompanySettingsPage() {
  const { config, isLoading, error, updateConfig, isSaving, getNumber, canManage } =
    usePlatformConfig();
  const [formState, setFormState] =
    useState<Record<SystemConfigKey, string>>(SYSTEM_CONFIG_DEFAULTS);

  useEffect(() => {
    setFormState((current) => ({
      ...current,
      ...Object.fromEntries(
        (Object.keys(SYSTEM_CONFIG_METADATA) as SystemConfigKey[]).map((key) => [
          key,
          config[key]?.value ?? SYSTEM_CONFIG_DEFAULTS[key],
        ])
      ),
    }));
  }, [config]);

  const handleSave = async () => {
    await updateConfig(formState);
  };

  if (!isLoading && !canManage) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <PageHeader
          title="System Configuration"
          description="This settings route is restricted to users with platform configuration permission."
        />

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only users with the `platform.config.manage` permission can view or
            update system configuration entries.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="System Configuration"
        description="Tune platform-wide thresholds used by guard monitoring, geo-fence logic, and checklist escalation."
      />

      <SystemConfigSummaryCards
        keys={Object.keys(SYSTEM_CONFIG_METADATA) as SystemConfigKey[]}
        getNumber={getNumber}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SystemConfigControls
        keys={Object.keys(SYSTEM_CONFIG_METADATA) as SystemConfigKey[]}
        values={formState}
        isLoading={isLoading}
        isSaving={isSaving}
        onChange={(key, value) =>
          setFormState((current) => ({
            ...current,
            [key]: value,
          }))
        }
        onSave={handleSave}
      />
    </div>
  );
}

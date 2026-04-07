"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Save, Settings2 } from "lucide-react";

import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

      <div className="grid gap-4 md:grid-cols-4">
        {(Object.keys(SYSTEM_CONFIG_METADATA) as SystemConfigKey[]).map((key) => (
          <Card key={key} className="border-none shadow-card ring-1 ring-border">
            <CardContent className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                {SYSTEM_CONFIG_METADATA[key].label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">{getNumber(key)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-bold uppercase tracking-widest">
              Threshold Controls
            </CardTitle>
          </div>
          <CardDescription>
            These values are saved to `system_config` and consumed by the live platform logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(Object.keys(SYSTEM_CONFIG_METADATA) as SystemConfigKey[]).map((key) => (
            <div key={key} className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
              <Label className="text-sm font-semibold">{SYSTEM_CONFIG_METADATA[key].label}</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  type="number"
                  min={SYSTEM_CONFIG_METADATA[key].min}
                  max={SYSTEM_CONFIG_METADATA[key].max}
                  step={SYSTEM_CONFIG_METADATA[key].step ?? 1}
                  value={formState[key]}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              )}
              <p className="text-xs text-muted-foreground">
                {SYSTEM_CONFIG_METADATA[key].description}
              </p>
            </div>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading || isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              Save System Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

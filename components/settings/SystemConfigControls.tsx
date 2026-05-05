import { Save, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemConfigKey } from "@/src/types/platform";
import { SYSTEM_CONFIG_METADATA } from "@/src/lib/platform/system-config";

export interface SystemConfigControlsProps {
  keys: SystemConfigKey[];
  values: Record<SystemConfigKey, string>;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (key: SystemConfigKey, value: string) => void;
  onSave: () => void;
}

export function SystemConfigControls({
  keys,
  values,
  isLoading,
  isSaving,
  onChange,
  onSave,
}: SystemConfigControlsProps) {
  return (
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
        {keys.map((key) => (
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
                value={values[key]}
                onChange={(event) => onChange(key, event.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {SYSTEM_CONFIG_METADATA[key].description}
            </p>
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isLoading || isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            Save System Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

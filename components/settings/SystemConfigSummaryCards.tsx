import { Card, CardContent } from "@/components/ui/card";
import type { SystemConfigKey } from "@/src/types/platform";
import { SYSTEM_CONFIG_METADATA } from "@/src/lib/platform/system-config";

export interface SystemConfigSummaryCardsProps {
  keys: SystemConfigKey[];
  getNumber: (key: SystemConfigKey) => number;
}

export function SystemConfigSummaryCards({
  keys,
  getNumber,
}: SystemConfigSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {keys.map((key) => (
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
  );
}

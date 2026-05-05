import { Card, CardContent } from "@/components/ui/card";
import type { PermissionKey } from "@/src/types/platform";

export interface PermissionCoverageCardsProps {
  permissionKeys: PermissionKey[];
  permissionLabels: Record<PermissionKey, { label: string }>;
  permissionCoverage: Record<PermissionKey, number>;
}

export function PermissionCoverageCards({
  permissionKeys,
  permissionLabels,
  permissionCoverage,
}: PermissionCoverageCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {permissionKeys.map((permission) => (
        <Card key={permission} className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {permissionLabels[permission].label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {permissionCoverage[permission]}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

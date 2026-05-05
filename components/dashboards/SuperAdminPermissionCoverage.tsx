import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SuperAdminPermissionCoverageProps {
  permissionCoverage: Record<string, number>;
  isLoading: boolean;
}

export function SuperAdminPermissionCoverage({
  permissionCoverage,
  isLoading,
}: SuperAdminPermissionCoverageProps) {
  return (
    <Card className="border-none shadow-card ring-1 ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest">
          Permission Coverage
        </CardTitle>
        <CardDescription>Roles currently carrying each platform permission.</CardDescription>
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
              {isLoading ? "..." : count}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

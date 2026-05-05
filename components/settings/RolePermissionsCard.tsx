import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { PermissionKey } from "@/src/types/platform";

export interface RolePermissionRecordView {
  id: string;
  roleDisplayName: string;
  description: string | null;
  userCount: number;
}

export interface RolePermissionsCardProps {
  role: RolePermissionRecordView;
  permissionKeys: PermissionKey[];
  permissionLabels: Record<PermissionKey, { label: string; description: string }>;
  enabledPermissions: PermissionKey[];
  isSaving: boolean;
  isLoading: boolean;
  onToggle: (permission: PermissionKey, enabled: boolean) => void;
  onSave: () => void;
}

export function RolePermissionsCard({
  role,
  permissionKeys,
  permissionLabels,
  enabledPermissions,
  isSaving,
  isLoading,
  onToggle,
  onSave,
}: RolePermissionsCardProps) {
  return (
    <Card key={role.id} className="border-none shadow-card ring-1 ring-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{role.roleDisplayName}</CardTitle>
            <CardDescription>{role.description || "No description available."}</CardDescription>
          </div>
          <Badge variant="outline">{role.userCount} users</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionKeys.map((permission) => {
          const enabled = enabledPermissions.includes(permission);
          return (
            <div
              key={permission}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold">{permissionLabels[permission].label}</p>
                <p className="text-xs text-muted-foreground">
                  {permissionLabels[permission].description}
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={(checked) => onToggle(permission, checked)} />
            </div>
          );
        })}

        <div className="flex justify-end">
          <Button className="gap-2" onClick={onSave} disabled={isLoading || isSaving}>
            <ShieldCheck className="h-4 w-4" />
            Save Role Permissions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

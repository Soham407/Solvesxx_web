"use client";

import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AdminAccessLink } from "@/src/types/platform";

export interface AdminAccessLinkNoticeProps {
  kind: "invite" | "reset";
  email: string;
  accessLink: AdminAccessLink;
  onDismiss: () => void;
}

export function AdminAccessLinkNotice({
  kind,
  email,
  accessLink,
  onDismiss,
}: AdminAccessLinkNoticeProps) {
  return (
    <Alert>
      <Link2 className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            {kind === "invite"
              ? `Success! Admin account created for ${email}.`
              : `Success! Password reset initiated for ${email}.`}
          </p>
          <p className="text-sm text-muted-foreground">
            {kind === "invite"
              ? "Share the setup link and temporary password below with the new admin."
              : "Share the recovery link below with the admin to complete the reset."}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Setup Link
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={accessLink.url} className="font-mono text-xs bg-background" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(accessLink.url);
                  toast.success("Link copied");
                }}
                title="Copy Link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {accessLink.temporaryPassword && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Temporary Password
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={accessLink.temporaryPassword}
                  className="font-mono text-xs bg-background"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(accessLink.temporaryPassword!);
                    toast.success("Password copied");
                  }}
                  title="Copy Password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

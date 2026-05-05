"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ResidentDenyVisitorDialogProps {
  open: boolean;
  denyReason: string;
  isProcessing: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResidentDenyVisitorDialog({
  open,
  denyReason,
  isProcessing,
  onReasonChange,
  onClose,
  onConfirm,
}: ResidentDenyVisitorDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deny Visitor Entry</DialogTitle>
          <DialogDescription>
            Add a short reason so the guard and support team can understand why entry was denied.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="deny_reason" className="text-sm font-medium">
            Reason
          </label>
          <Textarea
            id="deny_reason"
            placeholder="Security policy, unavailable to receive, ask visitor to reschedule..."
            className="min-h-[110px] resize-none"
            value={denyReason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deny Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

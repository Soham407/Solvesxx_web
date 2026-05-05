"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface AdminEditFormState {
  fullName: string;
  phone: string;
  roleName: "admin" | "super_admin";
  isActive: boolean;
}

export interface AdminEditDialogProps {
  open: boolean;
  form: AdminEditFormState;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: AdminEditFormState) => void;
  onSubmit: () => void;
}

export function AdminEditDialog({
  open,
  form,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}: AdminEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Admin Account</DialogTitle>
          <DialogDescription>
            Adjust role assignment, contact info, or account status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={form.fullName}
              onChange={(event) => onChange({ ...form, fullName: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(event) => onChange({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.roleName}
              onValueChange={(value: "admin" | "super_admin") =>
                onChange({ ...form, roleName: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Account Active</p>
              <p className="text-xs text-muted-foreground">
                Suspended accounts are blocked at middleware on the next request.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => onChange({ ...form, isActive: checked })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

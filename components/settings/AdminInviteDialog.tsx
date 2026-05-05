"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AdminInviteFormState {
  fullName: string;
  email: string;
  phone: string;
  roleName: "admin" | "super_admin";
}

export interface AdminInviteDialogProps {
  open: boolean;
  form: AdminInviteFormState;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: AdminInviteFormState) => void;
  onSubmit: () => void;
}

export function AdminInviteDialog({
  open,
  form,
  isSubmitting,
  onOpenChange,
  onChange,
  onSubmit,
}: AdminInviteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invite Admin</DialogTitle>
          <DialogDescription>
            Create a new admin-tier account and generate a secure setup link.
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
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting}>
              Create Admin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

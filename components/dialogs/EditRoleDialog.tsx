// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useRoles";
import { useUsers, UserMaster } from "@/hooks/useUsers";
import { toast } from "sonner";

interface EditRoleDialogProps {
  user: UserMaster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditRoleDialogProps) {
  const { roles: allRoles, isLoading: rolesLoading } = useRoles();
  const { updateUserRole } = useUsers();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = allRoles.filter(
    (r) => r.roleKey !== "admin" && r.roleKey !== "super_admin"
  );

  useEffect(() => {
    if (user && roles.length > 0) {
      const currentRole = roles.find(r => r.name === user.role_name || r.roleKey === user.role_key);
      if (currentRole) {
        setSelectedRoleId(currentRole.id);
      }
    }
  }, [user, roles]);

  const handleSubmit = async () => {
    if (!user || !selectedRoleId) return;
    
    setIsSubmitting(true);
    try {
      await updateUserRole(user.id, selectedRoleId);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      // toast handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            Change the access level for <strong>{user?.full_name}</strong>.
            This will update their system permissions immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Select New Role</Label>
            <Select 
              value={selectedRoleId} 
              onValueChange={setSelectedRoleId}
              disabled={rolesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedRoleId}
            >
              {isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

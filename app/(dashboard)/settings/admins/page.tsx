"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  Copy,
  Link2,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  UserCog,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { usePlatformAdminAccounts } from "@/hooks/usePlatformAdminAccounts";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { AdminAccessLink, AdminAccount } from "@/src/types/platform";

const EMPTY_INVITE_FORM = {
  fullName: "",
  email: "",
  phone: "",
  roleName: "admin" as "admin" | "super_admin",
};

export default function SuperAdminAccountsPage() {
  const { userId } = useAuth();
  const {
    admins,
    stats,
    isLoading,
    error,
    inviteAdmin,
    updateAdmin,
    resetAdminPassword,
    isInviting,
    isUpdating,
    isResettingPassword,
  } = usePlatformAdminAccounts();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE_FORM);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    roleName: "admin" as "admin" | "super_admin",
    isActive: true,
  });
  const [latestAccessLink, setLatestAccessLink] = useState<{
    kind: "invite" | "reset";
    email: string;
    accessLink: AdminAccessLink;
  } | null>(null);

  const openEditDialog = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setEditForm({
      fullName: admin.fullName,
      phone: admin.phone ?? "",
      roleName: admin.roleName as "admin" | "super_admin",
      isActive: admin.isActive,
    });
    setEditDialogOpen(true);
  };

  const columns: ColumnDef<AdminAccount>[] = useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: "Admin User",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold">{row.original.fullName}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "roleDisplayName",
        header: "Role",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.roleName === "super_admin"
                ? "border-primary/30 bg-primary/5 text-primary"
                : ""
            }
          >
            {row.original.roleDisplayName}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLogin",
        header: "Last Login",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastLogin
              ? format(new Date(row.original.lastLogin), "PPp")
              : "Never"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.isActive
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
            }
          >
            {row.original.isActive ? "Active" : "Suspended"}
          </Badge>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const admin = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                  <UserCog className="mr-2 h-4 w-4" /> Edit account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleResetPassword(admin)}
                  disabled={isResettingPassword}
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Generate reset link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateAdmin({
                      id: admin.id,
                      isActive: !admin.isActive,
                    })
                  }
                  disabled={isUpdating || admin.id === userId}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {admin.isActive ? "Suspend account" : "Reactivate account"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isResettingPassword, isUpdating, resetAdminPassword, updateAdmin, userId]
  );

  const handleInvite = async () => {
    const result = await inviteAdmin({
      fullName: inviteForm.fullName,
      email: inviteForm.email,
      phone: inviteForm.phone || null,
      roleName: inviteForm.roleName,
    });

    if (result.success) {
      setInviteDialogOpen(false);
      setInviteForm(EMPTY_INVITE_FORM);
      setLatestAccessLink(
        result.data?.accessLink
          ? {
              kind: "invite",
              email: result.data.admin.email,
              accessLink: result.data.accessLink,
            }
          : null
      );
    }
  };

  const handleResetPassword = async (admin: AdminAccount) => {
    const result = await resetAdminPassword(admin.id);

    if (result.success) {
      setLatestAccessLink(
        result.data?.accessLink
          ? {
              kind: "reset",
              email: admin.email,
              accessLink: result.data.accessLink,
            }
          : null
      );
    }
  };

  const handleCopyLink = async () => {
    if (!latestAccessLink) return;

    try {
      await navigator.clipboard.writeText(latestAccessLink.accessLink.url);
      toast.success("Access link copied");
    } catch {
      toast.error("Failed to copy access link");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAdmin) return;

    const result = await updateAdmin({
      id: selectedAdmin.id,
      fullName: editForm.fullName,
      phone: editForm.phone || null,
      roleName: editForm.roleName,
      isActive: editForm.isActive,
    });

    if (result.success) {
      setEditDialogOpen(false);
      setSelectedAdmin(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Admin Management"
        description="Provision and govern admin-tier identities for the platform."
        actions={
          <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Invite Admin
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Admin Accounts" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Super Admins" value={stats.superAdmins} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {latestAccessLink && (
        <Alert>
          <Link2 className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>
              {latestAccessLink.kind === "invite"
                ? `A secure setup link is ready for ${latestAccessLink.email}. Share it through a trusted channel so the new admin can finish activating the account.`
                : `A secure password reset link is ready for ${latestAccessLink.email}. Share it through a trusted channel to complete the reset.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={latestAccessLink.accessLink.url} className="font-mono text-xs" />
              <Button variant="outline" type="button" onClick={handleCopyLink} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setLatestAccessLink(null)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <DataTable columns={columns} data={admins} searchKey="fullName" isLoading={isLoading} />

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
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
                value={inviteForm.fullName}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={inviteForm.phone}
                onChange={(event) =>
                  setInviteForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.roleName}
                onValueChange={(value: "admin" | "super_admin") =>
                  setInviteForm((current) => ({ ...current, roleName: value }))
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
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={isInviting}>
                Create Admin
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                value={editForm.fullName}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.roleName}
                onValueChange={(value: "admin" | "super_admin") =>
                  setEditForm((current) => ({ ...current, roleName: value }))
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
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isUpdating}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

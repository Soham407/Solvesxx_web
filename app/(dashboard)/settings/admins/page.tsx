"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import {
  KeyRound,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  UserCog,
  AlertCircle,
} from "lucide-react";

import { usePlatformAdminAccounts } from "@/hooks/usePlatformAdminAccounts";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminAccessLinkNotice } from "@/components/settings/AdminAccessLinkNotice";
import {
  AdminInviteDialog,
  type AdminInviteFormState,
} from "@/components/settings/AdminInviteDialog";
import {
  AdminEditDialog,
  type AdminEditFormState,
} from "@/components/settings/AdminEditDialog";
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
  const [inviteForm, setInviteForm] = useState<AdminInviteFormState>(EMPTY_INVITE_FORM);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<AdminEditFormState>({
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
                ? "border-success/20 bg-success/10 text-success"
                : "border-destructive/20 bg-destructive/10 text-destructive"
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
        <AdminAccessLinkNotice
          kind={latestAccessLink.kind}
          email={latestAccessLink.email}
          accessLink={latestAccessLink.accessLink}
          onDismiss={() => setLatestAccessLink(null)}
        />
      )}

      <DataTable columns={columns} data={admins} searchKey="fullName" isLoading={isLoading} />

      <AdminInviteDialog
        open={inviteDialogOpen}
        form={inviteForm}
        isSubmitting={isInviting}
        onOpenChange={setInviteDialogOpen}
        onChange={setInviteForm}
        onSubmit={handleInvite}
      />

      <AdminEditDialog
        open={editDialogOpen}
        form={editForm}
        isSubmitting={isUpdating}
        onOpenChange={setEditDialogOpen}
        onChange={setEditForm}
        onSubmit={handleSaveEdit}
      />
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

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, User, Key, Mail, ShieldCheck, MoreHorizontal, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUsers, UserMaster } from "@/hooks/useUsers";

export default function UsersPage() {
  const { users, isLoading, error, deactivateUser, activateUser } = useUsers();
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);

  const handleResetPassword = async (user: UserMaster) => {
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Reset link sent", { description: `Password reset email sent to ${user.email}` });
    } catch {
      toast.error("Failed to send reset link");
    }
  };

  const columns: ColumnDef<UserMaster>[] = [
    {
      accessorKey: "full_name",
      header: "System User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {(row.original.full_name || "Un Known").split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
              <Mail className="h-2.5 w-2.5" /> {row.original.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role_name",
      header: "Access Role",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 border-primary/10 text-primary font-bold">
            {row.getValue("role_name")}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "last_login",
      header: "Last Activity",
      cell: ({ row }) => {
        const dateStr = row.getValue("last_login") as string | null;
        return (
          <span className="text-xs font-medium text-muted-foreground">
            {dateStr ? format(new Date(dateStr), "PPp") : "Never"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Security Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variants: Record<string, string> = {
          Active: "bg-success/10 text-success border-success/20",
          Locked: "bg-critical/10 text-critical border-critical/20",
          Pending: "bg-warning/10 text-warning border-warning/20",
        };
        return (
          <Badge variant="outline" className={variants[status]}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2" onClick={() => handleResetPassword(user)}>
                <ShieldCheck className="h-3.5 w-3.5" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => setMfaDialogOpen(true)}>
                <Key className="h-3.5 w-3.5" /> Manage MFA
              </DropdownMenuItem>
              {user.is_active ? (
                <DropdownMenuItem
                  className="text-destructive font-bold gap-2"
                  onClick={() => deactivateUser(user.id)}
                >
                  Deactivate User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-success font-bold gap-2"
                  onClick={() => activateUser(user.id)}
                >
                  Activate User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="User Master"
        description="Provision system access and monitor secure identity portal accounts."
        actions={
          <Button className="gap-2 shadow-primary/20">
            <Plus className="h-4 w-4" /> Provision New User
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable columns={columns} data={users} searchKey="full_name" isLoading={isLoading} />

      <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Manage MFA</DialogTitle>
            <DialogDescription>
              Multi-factor authentication is managed through the Supabase Auth dashboard. Navigate to
              Authentication → Users to enable or disable MFA for individual users.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setMfaDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

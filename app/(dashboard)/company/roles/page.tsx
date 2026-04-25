"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Shield, Users, Lock, MoreHorizontal, RefreshCw, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Role {
  id: string;
  roleId: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: string[];
  status: "Active" | "Inactive";
}

export default function RolesPage() {
  const { roles, isLoading, error, isSubmitting, refresh, createRole, updateRole, deleteRole } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  const openCreateDialog = () => {
    setFormMode("create");
    setSelectedRole(null);
    setRoleName("");
    setRoleDescription("");
    setIsFormOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setFormMode("edit");
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setIsFormOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      if (formMode === "create") {
        await createRole({
          name: roleName,
          description: roleDescription,
        });
        toast.success("Role created");
      } else if (selectedRole) {
        await updateRole(selectedRole.roleId, {
          name: roleName,
          description: roleDescription,
        });
        toast.success("Role updated");
      }

      setIsFormOpen(false);
      setSelectedRole(null);
      setRoleName("");
      setRoleDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      await deleteRole(selectedRole.roleId);
      toast.success("Role deleted");
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete role");
    }
  };

  // Transform roles data for the table
  const data: Role[] = roles.map(role => ({
    id: role.id.substring(0, 8).toUpperCase(),
    roleId: role.id,
    name: role.name,
    description: role.description || "No description available",
    userCount: role.userCount,
    permissions: role.permissions.length > 0 ? role.permissions : ["Standard Access"],
    status: role.isActive ? "Active" : "Inactive",
  }));

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Role Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">ID: {row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      accessorKey: "userCount",
      header: "Users",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.getValue("userCount")}</span>
        </div>
      ),
    },
    {
      accessorKey: "permissions",
      header: "Core Permissions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.permissions.slice(0, 3).map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-muted/50 border-none">
              {p}
            </Badge>
          ))}
          {row.original.permissions.length > 3 && (
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-muted/50 border-none">
              +{row.original.permissions.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge 
          variant={row.getValue("status") === "Active" ? "default" : "secondary"} 
          className={cn(
            row.getValue("status") === "Active" 
              ? "bg-success/10 text-success border-success/20 hover:bg-success/20" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(row.original)}>
              <Lock className="h-3.5 w-3.5" /> Edit Permissions
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive gap-2" onClick={() => openDeleteDialog(row.original)}>
              Delete Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Role Master"
        description="Define and manage system access levels and operational permissions."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={refresh}
              disabled={isLoading || isSubmitting}
            >
              <RefreshCw className={cn("h-4 w-4", (isLoading || isSubmitting) && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 shadow-sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> Create New Role
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data} searchKey="name" />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent size="default">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Create Role" : "Edit Role"}</DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Create a role using a supported system role name."
                : "Update the role display name and description."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="role-name" className="text-sm font-medium">Role Name</label>
              <Input
                id="role-name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="e.g. Site Supervisor"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role-description" className="text-sm font-medium">Description</label>
              <Textarea
                id="role-description"
                value={roleDescription}
                onChange={(event) => setRoleDescription(event.target.value)}
                placeholder="Short description for this role"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : formMode === "create" ? "Create Role" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRole
                ? `This will permanently delete ${selectedRole.name}. Existing users linked to it may block the delete at the database layer.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

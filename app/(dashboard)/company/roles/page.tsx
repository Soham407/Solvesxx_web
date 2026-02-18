"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Role {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: string[];
  status: "Active" | "Inactive";
}

export default function RolesPage() {
  const { roles, isLoading, error, refresh } = useRoles();

  // Transform roles data for the table
  const data: Role[] = roles.map(role => ({
    id: role.id.substring(0, 8).toUpperCase(),
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
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="gap-2">
              <Lock className="h-3.5 w-3.5" /> Edit Permissions
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive gap-2">
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
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 shadow-sm">
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
    </div>
  );
}

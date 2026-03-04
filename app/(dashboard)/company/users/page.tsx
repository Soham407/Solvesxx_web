"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, User, Key, Mail, ShieldCheck, MoreHorizontal, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface UserMaster {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  last_login: string | null;
  status: "Active" | "Locked" | "Pending";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          last_login,
          is_active,
          roles (
            role_display_name
          )
        `)
        .order("full_name");

      if (fetchError) throw fetchError;

      const formattedUsers: UserMaster[] = (data || []).map((u: any) => {
        const roleData = Array.isArray(u.roles) ? u.roles[0] : u.roles;
        
        // Basic status logic based purely on is_active for now
        let status: "Active" | "Locked" | "Pending" = u.is_active ? "Active" : "Locked";

        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role_name: roleData?.role_display_name || "Unknown Role",
          last_login: u.last_login,
          status,
        };
      });

      setUsers(formattedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to load users list");
    } finally {
      setIsLoading(false);
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
            <span className="font-bold text-sm ">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold"><Mail className="h-2.5 w-2.5" /> {row.original.email}</span>
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
            Pending: "bg-warning/10 text-warning border-warning/20"
        };
        return (
          <Badge variant="outline" className={variants[status]} >
            {status}
          </Badge>
        );
      },
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Key className="h-3.5 w-3.5" /> Manage MFA
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive font-bold gap-2">
              Deactivate User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="User Master"
        description="Provision system access and monitor secure identity portal accounts."
        actions={
          <Button className="gap-2 shadow-sh-primary/20">
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={users} searchKey="full_name" />
      )}
    </div>
  );
}

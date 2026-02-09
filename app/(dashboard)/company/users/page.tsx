"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, User, Key, Mail, ShieldCheck, MoreHorizontal } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMaster {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: "Active" | "Locked" | "Pending";
}

const data: UserMaster[] = [
  { id: "USR-001", name: "Vandanaa", email: "vandanaa@facilitypro.com", role: "Administrator", lastLogin: "2024-02-02 10:45 AM", status: "Active" },
  { id: "USR-002", name: "Alan Smith", email: "alan.s@facilitypro.com", role: "Operations Manager", lastLogin: "2024-02-01 04:12 PM", status: "Active" },
  { id: "USR-003", name: "Sarah Connor", email: "sarah@society.com", role: "Society Manager", lastLogin: "2024-01-28 09:00 AM", status: "Locked" },
  { id: "USR-004", name: "Michael Chen", email: "mchen@corp.com", role: "Accountant", lastLogin: "Never", status: "Pending" },
];

export default function UsersPage() {
  const columns: ColumnDef<UserMaster>[] = [
    {
      accessorKey: "name",
      header: "System User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {row.original.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold"><Mail className="h-2.5 w-2.5" /> {row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Access Role",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 border-primary/10 text-primary font-bold">
            {row.getValue("role")}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "lastLogin",
      header: "Last Activity",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">{row.getValue("lastLogin")}</span>
      ),
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
          <Badge variant="outline" className={variants[status] || ""}>
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
    <div className="animate-fade-in">
      <PageHeader
        title="User Master"
        description="Provision system access and monitor secure identity portal accounts."
        actions={
          <Button className="gap-2 shadow-sh-primary/20">
            <Plus className="h-4 w-4" /> Provision New User
          </Button>
        }
      />
      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}

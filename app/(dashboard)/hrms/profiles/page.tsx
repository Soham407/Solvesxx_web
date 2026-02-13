"use client";

import { UserPlus, Building2, MoreHorizontal, Loader2 } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmployees, Employee } from "@/hooks/useEmployees";

export default function HRMSProfilesPage() {
  const { employees, isLoading, error, refresh, getEmployeeInitials } =
    useEmployees();

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "full_name",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 ring-1 ring-border">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {getEmployeeInitials(row.original.id)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.employee_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-xs font-semibold">
          {row.original.role || "Not Assigned"}
        </span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {row.original.department || "No Dept"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Employment Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_active ? "Active" : "Inactive"}
          className="text-[10px]"
        />
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>View Dossier</DropdownMenuItem>
            <DropdownMenuItem>Performance Review</DropdownMenuItem>
            <DropdownMenuItem>Payroll Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-critical font-bold">
              Terminate Employment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Loading employee profiles...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="module-title font-bold uppercase ">
            HRMS / Employee Profiles
          </h1>
          <p className="module-description">
            Comprehensive management of workforce identities and records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold">
            Org Chart
          </Button>
          <Button className="gap-2 shadow-lg bg-primary hover:bg-primary/90 font-bold">
            <UserPlus className="h-4 w-4" />
            Bulk Onboard
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={employees} searchKey="full_name" />
    </div>
  );
}

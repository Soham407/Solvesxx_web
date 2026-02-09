"use client";

import { useState } from "react";
import { Plus, Download, Filter, MoreHorizontal, UserPlus } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleTag } from "@/components/shared/RoleTag";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  joinedDate: string;
  avatar?: string;
}

const data: Employee[] = [
  {
    id: "EMP-001",
    name: "Rajesh Kumar",
    email: "rajesh.k@company.com",
    role: "Admin",
    status: "Active",
    department: "Management",
    joinedDate: "2023-01-15",
  },
  {
    id: "EMP-002",
    name: "Pooja Hegde",
    email: "pooja.h@company.com",
    role: "Manager",
    status: "Active",
    department: "Operations",
    joinedDate: "2023-02-20",
  },
  {
    id: "EMP-003",
    name: "Karthik Aryan",
    email: "karthik.a@company.com",
    role: "Guard",
    status: "Active",
    department: "Security",
    joinedDate: "2023-03-10",
  },
  {
    id: "EMP-004",
    name: "Meena Kumari",
    email: "meena.k@company.com",
    role: "Buyer",
    status: "Pending",
    department: "Procurement",
    joinedDate: "2024-01-05",
  },
];

export default function EmployeesPage() {
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={emp.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {emp.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{emp.name}</span>
              <span className="text-xs text-muted-foreground">{emp.id}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleTag role={row.original.role} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "joinedDate",
      header: "Joined Date",
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
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/company/employees/${row.original.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Edit Employee</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="module-title">Employees</h1>
          <p className="module-description">Manage and monitor all your enterprise personnel.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="gap-2 shadow-md" asChild>
             <Link href="/company/employees/create">
                <UserPlus className="h-4 w-4" />
                Add Employee
             </Link>
          </Button>
        </div>
      </div>

      <div className="p-1">
        <DataTable 
          columns={columns} 
          data={data} 
          searchKey="name" 
        />
      </div>
    </div>
  );
}

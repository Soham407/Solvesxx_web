"use client";

import { Users, UserPlus, Search, Filter, Mail, Phone, MapPin, Building2, MoreHorizontal } from "lucide-react";
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

interface Profile {
  id: string;
  name: string;
  role: string;
  department: string;
  location: string;
  email: string;
  status: string;
}

const data: Profile[] = [
  { id: "P-101", name: "Priya Patel", role: "HR Manager", department: "People & Culture", location: "Global HQ", email: "priya.p@facilitypro.com", status: "Active" },
  { id: "P-102", name: "Rahul Verma", role: "Legal Associate", department: "Legal", location: "London Branch", email: "rahul.v@facilitypro.com", status: "Active" },
  { id: "P-103", name: "Harish Sheth", role: "Director", department: "Executive", location: "Global HQ", email: "harish.s@facilitypro.com", status: "On Leave" },
  { id: "P-104", name: "Lokesh Luthra", role: "Finance Head", department: "Finance", location: "Global HQ", email: "lokesh.l@facilitypro.com", status: "Active" },
];

export default function HRMSProfilesPage() {
  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-1 ring-border">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {row.original.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Designation",
      cell: ({ row }) => <span className="text-xs font-semibold">{row.original.role}</span>
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <Building2 className="h-3 w-3 text-muted-foreground" />
           <span className="text-xs font-medium">{row.original.department}</span>
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Employment Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} className="text-[10px]" />
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
            <DropdownMenuItem className="text-critical font-bold">Terminate Employment</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="module-title font-bold uppercase ">HRMS / Employee Profiles</h1>
          <p className="module-description">Comprehensive management of workforce identities and records.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold">Org Chart</Button>
          <Button className="gap-2 shadow-lg bg-primary hover:bg-primary/90 font-bold">
            <UserPlus className="h-4 w-4" />
            Bulk Onboard
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}

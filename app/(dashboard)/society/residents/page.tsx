"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Home, 
  Car, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Phone, 
  ShieldCheck, 
  UserPlus
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Resident {
  id: string;
  flatNo: string;
  primaryMember: string;
  familyCount: number;
  vehicles: string[];
  status: "Owner" | "Tenant";
}

const data: Resident[] = [
  { id: "RES-101", flatNo: "Penthouse P1", primaryMember: "Amit Khanna", familyCount: 4, vehicles: ["MH-01-AB-1234", "MH-01-XY-9000"], status: "Owner" },
  { id: "RES-102", flatNo: "Tower B-203", primaryMember: "Anjali Sharma", familyCount: 2, vehicles: ["MH-02-CD-5678"], status: "Owner" },
  { id: "RES-103", flatNo: "Sector C-404", primaryMember: "Arjun Reddy", familyCount: 5, vehicles: ["MH-04-EF-1122"], status: "Tenant" },
  { id: "RES-104", flatNo: "Garden Villa V2", primaryMember: "Vicky Malhotara", familyCount: 3, vehicles: ["MH-01-ZZ-9999"], status: "Owner" },
];

export default function ResidentsPage() {
  const columns: ColumnDef<Resident>[] = [
    {
      accessorKey: "flatNo",
      header: "Address / Flat",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Home className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm ">{row.original.flatNo}</span>
        </div>
      ),
    },
    {
      accessorKey: "primaryMember",
      header: "Primary Resident",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-[10px] font-bold">{row.original.primaryMember.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{row.original.primaryMember}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{row.original.familyCount} Family Members</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "vehicles",
      header: "Authorized Vehicles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.vehicles.map(v => (
            <Badge key={v} variant="outline" className="text-[9px] font-mono h-4 border-muted-foreground/20">
              <Car className="h-2.5 w-2.5 mr-1" /> {v}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Occupancy",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.getValue("status") === "Owner" ? "bg-success/5 text-success border-success/20" : "bg-info/5 text-info border-info/20"
        )}>
            {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Phone className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Family & Resident Database"
        description="Searchable directory of flat numbers, authorized family members, and registered vehicles for quick gate verification."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <Search className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="gap-2 shadow-sm">
               <UserPlus className="h-4 w-4" /> Register Family
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Registered Flats", value: "240", icon: Home, sub: "Occupancy 92%" },
          { label: "Total Residents", value: "842", icon: Users, sub: "Including tenants/guests" },
          { label: "Verified Vehicles", value: "312", icon: Car, sub: "RFID tags active" },
        ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-2xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
                    </div>
                 </div>
            </Card>
        ))}
      </div>

      <DataTable columns={columns} data={data} searchKey="primaryMember" />
    </div>
  );
}

"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Ticket, 
  AlertTriangle, 
  UserX, 
  ShieldAlert, 
  Plus, 
  MoreHorizontal,
  Clock,
  Camera,
  MessageSquare,
  AlertCircle,
  Filter
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BehaviorTicket {
  id: string;
  employee: string;
  category: "Sleeping on Duty" | "Rudeness" | "Absence" | "Uniform Issue" | "Unauthorized Entry";
  severity: "Low" | "Medium" | "High";
  reportedBy: string;
  date: string;
  status: "Open" | "Under Review" | "Resolved-Warning" | "Resolved-Action";
}

const data: BehaviorTicket[] = [
  { id: "TKT-B-901", employee: "Rajesh Kumar", category: "Sleeping on Duty", severity: "High", reportedBy: "Amit Sharma (Society Mgr)", date: "2024-02-01", status: "Open" },
  { id: "TKT-B-905", employee: "Sunita Rao", category: "Uniform Issue", severity: "Low", reportedBy: "System Guard Audit", date: "2024-01-28", status: "Resolved-Warning" },
  { id: "TKT-B-908", employee: "Rahul Verma", category: "Absence", severity: "Medium", reportedBy: "Amit Sharma (Society Mgr)", date: "2024-02-02", status: "Under Review" },
];

export default function BehaviorTicketsPage() {
  const columns: ColumnDef<BehaviorTicket>[] = [
    {
      accessorKey: "employee",
      header: "Employee Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-critical/5">
            <AvatarFallback className="bg-critical/5 text-critical text-xs font-bold">{row.original.employee.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.employee}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Violation Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-medium text-[10px] uppercase">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
          const val = row.getValue("severity") as string;
          return (
            <div className="flex items-center gap-2">
                <AlertCircle className={cn(
                    "h-3.5 w-3.5",
                    val === "High" ? "text-critical" : val === "Medium" ? "text-warning" : "text-info"
                )} />
                <span className="text-xs font-bold">{val}</span>
            </div>
          );
      },
    },
    {
      accessorKey: "reportedBy",
      header: "Reporting Auth",
      cell: ({ row }) => <span className="text-[10px] font-medium text-muted-foreground uppercase">{row.getValue("reportedBy")}</span>,
    },
    {
      accessorKey: "status",
      header: "Case Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "Open": "bg-critical/10 text-critical border-critical/20 animate-pulse-soft",
              "Under Review": "bg-warning/10 text-warning border-warning/20",
              "Resolved-Warning": "bg-success/10 text-success border-success/20",
              "Resolved-Action": "bg-primary/10 text-primary border-primary/20"
          };
          return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[val] || "")}>
                {val}
            </Badge>
          );
      },
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Camera className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Behavioral Tickets"
        description="Formal incident reporting system for tracking employee discipline, rudeness, and duty negligence."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <Filter className="h-4 w-4" /> Summary Reports
            </Button>
            <Button variant="destructive" className="gap-2 shadow-lg shadow-critical/20">
               <Plus className="h-4 w-4" /> Raise Incident
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Active Investigations", value: "3", icon: ShieldAlert, color: "text-critical" },
          { label: "Under Review", value: "8", icon: Clock, color: "text-warning" },
          { label: "Resolved (30d)", value: "24", icon: CheckCircle2, color: "text-success" },
          { label: "Repeat Offenders", value: "2", icon: UserX, color: "text-info" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold ">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={data} searchKey="employee" />
    </div>
  );
}

import { CheckCircle2 } from "lucide-react";

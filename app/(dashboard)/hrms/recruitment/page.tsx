"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, FileSearch, UserCheck, MoreHorizontal, Briefcase, Filter, ArrowUpRight } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Candidate {
  id: string;
  name: string;
  appliedFor: string;
  source: string;
  interviewStatus: "Screening" | "Interviewing" | "Background Check" | "Offered" | "Rejected";
  appliedDate: string;
}

const data: Candidate[] = [
  { id: "APP-001", name: "Aditya Deshmukh", appliedFor: "Night Shift Guard", source: "Security Agency A", interviewStatus: "Background Check", appliedDate: "2024-01-25" },
  { id: "APP-002", name: "Pooja Hegde", appliedFor: "HR Coordinator", source: "Referral", interviewStatus: "Interviewing", appliedDate: "2024-01-28" },
  { id: "APP-003", name: "Ramesh Babu", appliedFor: "Lift Technician", source: "Indeed", interviewStatus: "Screening", appliedDate: "2024-02-01" },
  { id: "APP-004", name: "Sunita Rao", appliedFor: "Pantry Staff", source: "Agency B", interviewStatus: "Offered", appliedDate: "2024-01-20" },
];

export default function RecruitmentPortalPage() {
  const columns: ColumnDef<Candidate>[] = [
    {
      accessorKey: "name",
      header: "Candidate / Applicant",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{row.original.name.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "appliedFor",
      header: "Opening / Role",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground/80">{row.getValue("appliedFor")}</span>,
    },
    {
      accessorKey: "interviewStatus",
      header: "Hiring Lifecycle",
      cell: ({ row }) => {
          const val = row.getValue("interviewStatus") as string;
          const variants: Record<string, string> = {
              "Offered": "bg-success/10 text-success border-success/20",
              "Interviewing": "bg-info/10 text-info border-info/20",
              "Screening": "bg-warning/10 text-warning border-warning/20",
              "Background Check": "bg-primary/10 text-primary border-primary/20 animate-pulse-soft",
              "Rejected": "bg-critical/10 text-critical border-critical/20"
          };
          return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[val] || "")}>
                {val}
            </Badge>
          );
      },
    },
    {
        accessorKey: "appliedDate",
        header: "Application Date",
        cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.getValue("appliedDate")}</span>,
      },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <FileSearch className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Recruitment Portal"
        description="Monitor candidates from 'Applicant' to 'Hired Staff' with integrated background verification tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <Briefcase className="h-4 w-4" /> Job Requisitions
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <UserPlus className="h-4 w-4" /> Add Candidate
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "New Applicants", value: "24", sub: "Last 7 days", icon: UserPlus, color: "text-primary" },
          { label: "BGV Pending", value: "8", sub: "Verification required", icon: FileSearch, color: "text-warning" },
          { label: "Hired Tracker", value: "142", sub: "Total this year", icon: UserCheck, color: "text-success" },
          { label: "Active Openings", value: "3", sub: "Hiring priorities", icon: Briefcase, color: "text-info" },
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

      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}

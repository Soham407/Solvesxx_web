"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Star, 
  MessageSquare, 
  ShieldCheck, 
  TrendingUp, 
  MoreHorizontal, 
  UserCheck, 
  Filter,
  BarChart,
  ThumbsUp,
  ThumbsDown,
  Camera
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FeedbackRecord {
  id: string;
  resident: string;
  flatNo: string;
  serviceCategory: "Security" | "AC Service" | "Pest Control" | "Staffing";
  rating: number;
  comment: string;
  vendorRating: "Incentivize" | "Warning" | "Standard";
}

const data: FeedbackRecord[] = [
  { id: "FB-001", resident: "Amit Khanna", flatNo: "Penthouse P1", serviceCategory: "Security", rating: 5, comment: "Guard was very professional during night shift.", vendorRating: "Incentivize" },
  { id: "FB-002", resident: "Anjali Sharma", flatNo: "Tower B-203", serviceCategory: "AC Service", rating: 2, comment: "Technician arrived 2 hours late. Cooling still not optimal.", vendorRating: "Warning" },
  { id: "FB-003", resident: "Arjun Reddy", flatNo: "Sector C-404", serviceCategory: "Pest Control", rating: 4, comment: "Prompt service, clean execution.", vendorRating: "Standard" },
];

export default function PerformanceAuditPage() {
  const columns: ColumnDef<FeedbackRecord>[] = [
    {
      accessorKey: "resident",
      header: "Buyer Feedback",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{row.original.resident.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.resident}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.flatNo}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "serviceCategory",
      header: "Monitored Service",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-muted/50 border-none font-medium text-xs">
          {row.getValue("serviceCategory")}
        </Badge>
      ),
    },
    {
      accessorKey: "rating",
      header: "Score Card",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
                <Star key={i} className={cn(
                    "h-3 w-3",
                    i <= row.original.rating ? "text-warning fill-warning" : "text-muted-foreground/30"
                )} />
            ))}
        </div>
      ),
    },
    {
      accessorKey: "comment",
      header: "Detailed Note",
      cell: ({ row }) => <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.getValue("comment")}</span>,
    },
    {
      accessorKey: "vendorRating",
      header: "HRA Audit Result",
      cell: ({ row }) => {
          const val = row.getValue("vendorRating") as string;
          const variants: Record<string, string> = {
              "Incentivize": "bg-success/10 text-success border-success/20",
              "Warning": "bg-critical/10 text-critical border-critical/20 animate-pulse-soft",
              "Standard": "bg-info/10 text-info border-info/20",
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
        title="Quality Performance Audit"
        description="Buyer/Resident feedback engine for auditing outsourced vendor performance and service quality levels."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <TrendingUp className="h-4 w-4" /> Trend Analysis
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <BarChart className="h-4 w-4" /> Vendor Scorecards
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Overall Rating", value: "4.2", extra: "Above target", icon: Star, color: "text-warning" },
          { label: "Critical Feedback", value: "3", extra: "Immediate action", icon: ShieldCheck, color: "text-critical" },
          { label: "Participating Units", value: "142", extra: "58% turnout", icon: UserCheck, color: "text-info" },
          { label: "Positive Sentiment", value: "85%", extra: "Healthy growth", icon: TrendingUp, color: "text-success" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
               <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <Progress value={85} className="h-1 mt-2 bg-muted" />
                        <span className="text-[10px] font-medium text-muted-foreground mt-2">{stat.extra}</span>
                    </div>
                </div>
          </Card>
        ))}
      </div>

      <DataTable columns={columns} data={data} searchKey="resident" />
    </div>
  );
}

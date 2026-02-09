"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  ArrowRight, 
  ShoppingCart, 
  MoreHorizontal, 
  History, 
  ClipboardList 
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IndentRequest {
  id: string;
  requester: string;
  department: string;
  itemsCount: number;
  totalEstValue: string;
  priority: "High" | "Normal";
  status: "Draft" | "Pending Approval" | "Approved" | "PO Created";
}

const data: IndentRequest[] = [
  { id: "IND-1001", requester: "Amit Sharma", department: "Facility Management", itemsCount: 5, totalEstValue: "₹45,000", priority: "Normal", status: "Pending Approval" },
  { id: "IND-1005", requester: "Amit Sharma", department: "Security", itemsCount: 2, totalEstValue: "₹1,20,000", priority: "High", status: "Approved" },
  { id: "IND-1008", requester: "Admin Port", department: "Pantry", itemsCount: 12, totalEstValue: "₹18,500", priority: "Normal", status: "Draft" },
];

export default function IndentManagementPage() {
  const columns: ColumnDef<IndentRequest>[] = [
    {
      accessorKey: "id",
      header: "Indent Ref",
      cell: ({ row }) => <span className="text-xs font-bold font-mono">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "requester",
      header: "Raised By",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
            <span className="text-sm font-bold">{row.original.requester}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">{row.original.department}</span>
        </div>
      ),
    },
    {
      accessorKey: "itemsCount",
      header: "Item Count",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("itemsCount")} SKUs</span>,
    },
    {
      accessorKey: "totalEstValue",
      header: "Est. Budget",
      cell: ({ row }) => <span className="text-sm font-bold text-primary">{row.getValue("totalEstValue")}</span>,
    },
    {
        accessorKey: "status",
        header: "Lifecycle Stage",
        cell: ({ row }) => {
            const val = row.getValue("status") as string;
            const variants: Record<string, string> = {
                "Approved": "bg-success/10 text-success border-success/20",
                "PO Created": "bg-primary/10 text-primary border-primary/20",
                "Pending Approval": "bg-warning/10 text-warning border-warning/20",
                "Draft": "bg-muted text-muted-foreground border-border"
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
                <ArrowRight className="h-4 w-4" />
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
        title="Internal Indent Requests"
        description="Raise and track internal material requests before they are converted into formal Supplier Purchase Orders."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <History className="h-4 w-4" /> Request History
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> New Indent
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Awaiting Appr.", value: "4", icon: ClipboardList, color: "text-warning" },
          { label: "Ready for PO", value: "2", icon: ShoppingCart, color: "text-success" },
          { label: "Drafts", value: "1", icon: FileText, color: "text-muted-foreground" },
          { label: "Avg Appr. TAT", value: "1.4d", icon: History, color: "text-info" },
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

      <DataTable columns={columns} data={data} searchKey="id" />
    </div>
  );
}

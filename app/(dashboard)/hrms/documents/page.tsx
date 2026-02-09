"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ShieldCheck, 
  Upload, 
  AlertCircle, 
  MoreHorizontal, 
  FileCheck, 
  Search,
  BookOpen,
  Filter
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuardDocument {
  id: string;
  staffName: string;
  docType: "Aadhar Card" | "PSARA License" | "Police Verification" | "Medical Fitness";
  expiryDate: string;
  status: "Verified" | "Expired" | "Pending Review" | "Missing";
  fileSize: string;
}

const data: GuardDocument[] = [
  { id: "DOC-901", staffName: "Rahul Deshmukh", docType: "Aadhar Card", expiryDate: "-", status: "Verified", fileSize: "1.2 MB" },
  { id: "DOC-902", staffName: "Rahul Deshmukh", docType: "Police Verification", expiryDate: "2024-12-01", status: "Verified", fileSize: "3.4 MB" },
  { id: "DOC-903", staffName: "Kiran Kumar", docType: "PSARA License", expiryDate: "2024-02-15", status: "Expired", fileSize: "2.1 MB" },
  { id: "DOC-904", staffName: "Suresh P.", docType: "Medical Fitness", expiryDate: "2024-06-30", status: "Pending Review", fileSize: "1.8 MB" },
  { id: "DOC-905", staffName: "Rahul Verma", docType: "Police Verification", expiryDate: "-", status: "Missing", fileSize: "0 KB" },
];

export default function DocumentGovernancePage() {
  const columns: ColumnDef<GuardDocument>[] = [
    {
      accessorKey: "docType",
      header: "Compliance Document",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.docType}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">REF: {row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "staffName",
      header: "Associated Staff",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.getValue("staffName")}</span>,
    },
    {
      accessorKey: "expiryDate",
      header: "Valid Until",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.getValue("expiryDate")}</span>,
    },
    {
      accessorKey: "status",
      header: "Review Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "Verified": "bg-success/10 text-success border-success/20",
              "Expired": "bg-critical/10 text-critical border-critical/20",
              "Pending Review": "bg-warning/10 text-warning border-warning/20",
              "Missing": "bg-muted text-muted-foreground border-border"
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
                <BookOpen className="h-4 w-4" />
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
        title="Document Governance"
        description="Unified portal for tracking critical compliance documents like PSARA, Police Verifications, and Identity Proofs."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <ShieldCheck className="h-4 w-4" /> Audit Report
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Upload className="h-4 w-4" /> Upload Document
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Verified Docs", value: "842", sub: "100% compliant", icon: ShieldCheck, color: "text-success" },
          { label: "Expired Soon", value: "14", sub: "Next 30 days", icon: AlertCircle, color: "text-warning" },
          { label: "Critical Gaps", value: "3", sub: "Security risk", icon: AlertCircle, color: "text-critical" },
          { label: "Total Vault Size", value: "4.2 GB", sub: "Secure storage", icon: BookOpen, color: "text-info" },
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

      <DataTable columns={columns} data={data} searchKey="staffName" />
    </div>
  );
}

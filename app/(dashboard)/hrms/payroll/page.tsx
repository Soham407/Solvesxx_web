"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Download, 
  Wallet, 
  ArrowUpRight, 
  Receipt, 
  MoreHorizontal,
  Plus,
  ArrowDownRight,
  ShieldCheck,
  Ban
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PayrollRecord {
  id: string;
  employee: string;
  basicSalary: string;
  allowance: string;
  deductions: string;
  netPayable: string;
  status: "Processed" | "Pending" | "On Hold";
}

const data: PayrollRecord[] = [
  { id: "PAY-001", employee: "Rajesh Kumar", basicSalary: "₹45,000", allowance: "₹5,200", deductions: "₹2,100", netPayable: "₹48,100", status: "Processed" },
  { id: "PAY-002", employee: "Sunita Rao", basicSalary: "₹38,000", allowance: "₹4,000", deductions: "₹1,800", netPayable: "₹40,200", status: "Processed" },
  { id: "PAY-003", employee: "Suresh Raina", basicSalary: "₹32,000", allowance: "₹2,500", deductions: "₹3,400", netPayable: "₹31,100", status: "Pending" },
  { id: "PAY-004", employee: "Amit Sharma", basicSalary: "₹55,000", allowance: "₹8,000", deductions: "₹4,500", netPayable: "₹58,500", status: "On Hold" },
];

export default function PayrollPage() {
  const columns: ColumnDef<PayrollRecord>[] = [
    {
      accessorKey: "employee",
      header: "Personnel Details",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{row.original.employee.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm ">{row.original.employee}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "basicSalary",
      header: "Basic Salary",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("basicSalary")}</span>,
    },
    {
      accessorKey: "allowance",
      header: "Allowance (OT)",
      cell: ({ row }) => <span className="text-sm font-bold text-success">+{row.getValue("allowance")}</span>,
    },
    {
      accessorKey: "deductions",
      header: "Deductions",
      cell: ({ row }) => <span className="text-sm font-bold text-critical">-{row.getValue("deductions")}</span>,
    },
    {
      accessorKey: "netPayable",
      header: "Net Payable",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-sm font-bold text-primary">{row.getValue("netPayable")}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Cycle Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "Processed": "bg-success/10 text-success border-success/20",
              "Pending": "bg-warning/10 text-warning border-warning/20",
              "On Hold": "bg-critical/10 text-critical border-critical/20"
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
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Download className="h-4 w-4" />
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
        title="Personnel Payroll"
        description="Automated earnings, statutory deductions, and monthly payslip generation cycle."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Deduction Master
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <ShieldCheck className="h-4 w-4" /> Run Payroll Cycle
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Total Disbursement", value: "₹42,50,000", icon: Wallet, color: "text-primary", sub: "For Jan 2024" },
          { label: "Allowances Paid", value: "₹2,15,400", icon: ArrowUpRight, color: "text-success", sub: "OT & Special pay" },
          { label: "Tax Deductions", value: "₹1,85,900", icon: ArrowDownRight, color: "text-critical", sub: "PF, PT & ESIC" },
          { label: "Cycle Status", value: "94%", icon: CreditCard, color: "text-info", sub: "Payment success rate" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                    <stat.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold ">{stat.value}</span>
                <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-premium overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Payroll Registry - Current Cycle</CardTitle>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/5 text-success border-success/20">Cycle: Open</Badge>
                <Badge variant="outline">Period: Jan 2024</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <DataTable columns={columns} data={data} searchKey="employee" />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Settings2, 
  Calendar, 
  Plus, 
  Clock, 
  MoreHorizontal, 
  ShieldCheck, 
  History,
  FileCheck,
  Settings,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeaveType {
  id: string;
  leave_name: string;
  yearly_quota: number;
  accrual: string;
  carryForward: string;
  status: "Active" | "Draft";
}

export default function LeaveConfigPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("leave_types")
        .select("*")
        .order("leave_name");

      if (fetchError) throw fetchError;

      const formattedLeaveTypes: LeaveType[] = (data || []).map((lt: any) => ({
        id: lt.id,
        leave_name: lt.leave_name,
        yearly_quota: lt.yearly_quota || 0,
        accrual: `${(lt.yearly_quota / 12).toFixed(1)}/mo`, // Simulated accrual logic based on quota
        carryForward: lt.can_carry_forward 
                       ? `Max ${lt.max_carry_forward || lt.yearly_quota} Days` 
                       : "Expired Annually",
        status: lt.is_active ? "Active" : "Draft",
      }));

      setLeaveTypes(formattedLeaveTypes);
    } catch (err: any) {
      console.error("Error fetching leave types:", err);
      setError("Failed to load leave configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<LeaveType>[] = [
    {
      accessorKey: "leave_name",
      header: "Leave Category",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.leave_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id.substring(0, 8)}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "yearly_quota",
      header: "Annual Entitlement",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("yearly_quota")} Days</span>,
    },
    {
      accessorKey: "accrual",
      header: "Accrual Logic",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.getValue("accrual")}</span>,
    },
    {
      accessorKey: "carryForward",
      header: "Rollover Policy",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.getValue("carryForward")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", row.getValue("status") === "Active" ? "bg-success/10 text-success border-success/20" : "")}>
            {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Settings2 className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  const activeCount = leaveTypes.filter(l => l.status === "Active").length;
  const draftCount = leaveTypes.filter(l => l.status === "Draft").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Leave Configuration"
        description="Define statutory leave types, accrual logic, and carry-forward rules for payroll integration."
        actions={
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Define Leave Type
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Active Policies", value: activeCount, icon: ShieldCheck, color: "text-success" },
            { label: "Draft Configs", value: draftCount, icon: Settings, color: "text-warning" },
            { label: "Revision Hist.", value: "0", icon: History, color: "text-info" },
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
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={leaveTypes} searchKey="leave_name" />
      )}
    </div>
  );
}

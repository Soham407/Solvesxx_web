"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Download,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Loader2,
  CheckCircle,
  PlayCircle,
  Calendar,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  usePayroll,
  Payslip,
  PayrollCycle,
  PayslipStatus,
  CYCLE_STATUS_CONFIG,
  PAYSLIP_STATUS_CONFIG,
  MONTH_NAMES,
} from "@/hooks/usePayroll";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

// Initial form state for creating payroll cycle
const INITIAL_CYCLE_FORM = {
  period_month: new Date().getMonth() + 1,
  period_year: new Date().getFullYear(),
  period_start: "",
  period_end: "",
  total_working_days: 26,
  notes: "",
};

export default function PayrollPage() {
  const { role } = useAuth();
  const {
    cycles,
    payslips,
    isLoading,
    error,
    createPayrollCycle,
    approvePayrollCycle,
    disbursePayrollCycle,
    generatePayslips,
    fetchPayslips,
    formatCurrency,
    getCycleDisplayName,
    downloadPayslipPdf,
    refresh,
  } = usePayroll();

  // Dialog states
  const [createCycleDialogOpen, setCreateCycleDialogOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState(INITIAL_CYCLE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<PayrollCycle | null>(null);
  const canManagePayroll = role === "admin" || role === "super_admin";

  // Get current/active cycle
  const currentCycle = cycles.find((c) => c.status !== "cancelled" && c.status !== "disbursed") || cycles[0];

  // Load payslips when cycle changes
  const handleCycleSelect = async (cycle: PayrollCycle) => {
    setSelectedCycle(cycle);
    await fetchPayslips(cycle.id);
  };

  // Initialize with first cycle
  if (cycles.length > 0 && !selectedCycle && !isLoading) {
    handleCycleSelect(cycles[0]);
  }

  // Handle create cycle
  const handleCreateCycle = async () => {
    setIsSubmitting(true);
    try {
      const result = await createPayrollCycle({
        period_month: cycleForm.period_month,
        period_year: cycleForm.period_year,
        period_start: cycleForm.period_start,
        period_end: cycleForm.period_end,
        total_working_days: cycleForm.total_working_days,
        notes: cycleForm.notes || undefined,
      });

      if (result) {
        setCreateCycleDialogOpen(false);
        setCycleForm(INITIAL_CYCLE_FORM);
        setSelectedCycle(result);
        await fetchPayslips(result.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle approve cycle
  const handleApproveCycle = async () => {
    if (!selectedCycle) return;
    setIsSubmitting(true);
    try {
      await approvePayrollCycle(selectedCycle.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle disburse cycle
  const handleDisburseCycle = async () => {
    if (!selectedCycle) return;
    setIsSubmitting(true);
    try {
      await disbursePayrollCycle(selectedCycle.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle generate payslips
  const handleGeneratePayslips = async () => {
    if (!selectedCycle) return;
    setIsSubmitting(true);
    try {
      await generatePayslips(selectedCycle.id, []); // The hook handles fetching employee data if empty array passed or ignores it if RPC doesn't need it
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats from current payslips
  const stats = {
    totalDisbursement: payslips.reduce((sum, ps) => sum + ps.net_payable, 0),
    totalAllowances: payslips.reduce(
      (sum, ps) => sum + ps.hra + ps.special_allowance + ps.travel_allowance + ps.medical_allowance + ps.overtime_amount,
      0
    ),
    totalDeductions: payslips.reduce((sum, ps) => sum + ps.total_deductions, 0),
    processedCount: payslips.filter((ps) => ps.status === "processed").length,
    totalCount: payslips.length,
  };

  const columns: ColumnDef<Payslip>[] = [
    {
      accessorKey: "employee_name",
      header: "Personnel Details",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-9 w-9 border ring-2 ring-primary/5">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {row.original.employee_name?.substring(0, 2).toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.employee_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.payslip_number}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "basic_salary",
      header: "Basic Salary",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{formatCurrency(row.original.pro_rated_basic)}</span>
      ),
    },
    {
      id: "allowances",
      header: "Allowances",
      cell: ({ row }) => {
        const total =
          row.original.hra +
          row.original.special_allowance +
          row.original.travel_allowance +
          row.original.medical_allowance +
          row.original.overtime_amount;
        return <span className="text-sm font-bold text-success">+{formatCurrency(total)}</span>;
      },
    },
    {
      accessorKey: "total_deductions",
      header: "Deductions",
      cell: ({ row }) => (
        <span className="text-sm font-bold text-critical">-{formatCurrency(row.original.total_deductions)}</span>
      ),
    },
    {
      accessorKey: "net_payable",
      header: "Net Payable",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-primary/50" />
          <span className="text-sm font-bold text-primary">{formatCurrency(row.original.net_payable)}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Cycle Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as PayslipStatus;
        const config = PAYSLIP_STATUS_CONFIG[status];
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config?.className || "")}>
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary"
            onClick={() => downloadPayslipPdf(row.original.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadPayslipPdf(row.original.id)}>
                 <Download className="mr-2 h-4 w-4" /> Download Payslip
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Details</DropdownMenuItem>
              {row.original.status === "approved" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Mark as Processed</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Loading state
  if (isLoading && cycles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading payroll data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Personnel Payroll"
        description="Automated earnings, statutory deductions, and monthly payslip generation cycle."
        actions={
          <div className="flex gap-2">
            {canManagePayroll && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setCreateCycleDialogOpen(true)}
              >
                <Plus className="h-4 w-4" /> New Cycle
              </Button>
            )}
            {canManagePayroll && selectedCycle?.status === "computed" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleApproveCycle}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve Cycle
              </Button>
            )}
            {canManagePayroll && selectedCycle?.status === "approved" && (
              <Button
                className="gap-2 shadow-lg shadow-primary/20"
                onClick={handleDisburseCycle}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Disburse Payroll
              </Button>
            )}
            {canManagePayroll && selectedCycle?.status === "draft" && (
              <Button 
                className="gap-2 shadow-lg shadow-primary/20"
                onClick={handleGeneratePayslips}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Generate Payslips
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Total Disbursement",
            value: formatCurrency(stats.totalDisbursement),
            icon: Wallet,
            color: "text-primary",
            sub: selectedCycle ? getCycleDisplayName(selectedCycle) : "No cycle selected",
          },
          {
            label: "Allowances Paid",
            value: formatCurrency(stats.totalAllowances),
            icon: ArrowUpRight,
            color: "text-success",
            sub: "OT & Special pay",
          },
          {
            label: "Tax Deductions",
            value: formatCurrency(stats.totalDeductions),
            icon: ArrowDownRight,
            color: "text-critical",
            sub: "PF, PT & ESIC",
          },
          {
            label: "Cycle Status",
            value:
              stats.totalCount > 0
                ? `${Math.round((stats.processedCount / stats.totalCount) * 100)}%`
                : "0%",
            icon: CreditCard,
            color: "text-info",
            sub: `${stats.processedCount}/${stats.totalCount} processed`,
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  {stat.label}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold">{stat.value}</span>
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
            {selectedCycle && (
              <>
                <Badge
                  variant="outline"
                  className={cn(CYCLE_STATUS_CONFIG[selectedCycle.status]?.className)}
                >
                  {CYCLE_STATUS_CONFIG[selectedCycle.status]?.label}
                </Badge>
                <Select
                  value={selectedCycle.id}
                  onValueChange={(value) => {
                    const cycle = cycles.find((c) => c.id === value);
                    if (cycle) handleCycleSelect(cycle);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {getCycleDisplayName(cycle)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payslips.length > 0 ? (
            <DataTable columns={columns} data={payslips} searchKey="employee_name" />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">No payslips generated for this cycle yet.</p>
              {canManagePayroll && selectedCycle?.status === "draft" && (
                <Button variant="outline" className="mt-4 gap-2" onClick={handleGeneratePayslips}>
                  <ShieldCheck className="h-4 w-4" /> Generate Payslips
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payroll Cycle Dialog */}
      <Dialog open={createCycleDialogOpen} onOpenChange={setCreateCycleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Payroll Cycle</DialogTitle>
            <DialogDescription>Set up a new payroll cycle for salary processing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_month">Month *</Label>
                <Select
                  value={cycleForm.period_month.toString()}
                  onValueChange={(value) => setCycleForm({ ...cycleForm, period_month: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_year">Year *</Label>
                <Select
                  value={cycleForm.period_year.toString()}
                  onValueChange={(value) => setCycleForm({ ...cycleForm, period_year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Period Start *</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={cycleForm.period_start}
                  onChange={(e) => setCycleForm({ ...cycleForm, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Period End *</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={cycleForm.period_end}
                  onChange={(e) => setCycleForm({ ...cycleForm, period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_working_days">Total Working Days *</Label>
              <Input
                id="total_working_days"
                type="number"
                min={1}
                max={31}
                value={cycleForm.total_working_days}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, total_working_days: parseInt(e.target.value) || 26 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={cycleForm.notes}
                onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })}
                placeholder="Optional notes about this payroll cycle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCycleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCycle}
              disabled={isSubmitting || !cycleForm.period_start || !cycleForm.period_end}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  Calendar,
  Plus,
  ShieldCheck,
  History,
  Settings,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useLeaveTypes, LeaveType } from "@/hooks/useLeaveTypes";

const EMPTY_FORM = {
  leave_name: "",
  yearly_quota: 12,
  is_paid: true,
  can_carry_forward: false,
  max_carry_forward: null as number | null,
};

export default function LeaveConfigPage() {
  const { leaveTypes, isLoading, error, createLeaveType, updateLeaveType } = useLeaveTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditTarget(lt);
    setForm({
      leave_name: lt.leave_name,
      yearly_quota: lt.yearly_quota,
      is_paid: lt.is_paid,
      can_carry_forward: lt.can_carry_forward,
      max_carry_forward: lt.max_carry_forward,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.leave_name || !form.yearly_quota) return;
    setIsSubmitting(true);
    try {
      const input = {
        leave_name: form.leave_name,
        yearly_quota: form.yearly_quota,
        is_paid: form.is_paid,
        can_carry_forward: form.can_carry_forward,
        max_carry_forward: form.can_carry_forward ? form.max_carry_forward : null,
      };
      const ok = editTarget
        ? await updateLeaveType(editTarget.id, input)
        : await createLeaveType(input);
      if (ok) setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedLeaveTypes = leaveTypes.map(lt => ({
    ...lt,
    accrual: `${(lt.yearly_quota / 12).toFixed(1)}/mo`,
    carryForward: lt.can_carry_forward
      ? `Max ${lt.max_carry_forward || lt.yearly_quota} Days`
      : "Expired Annually",
    status: lt.is_active ? "Active" : "Draft",
  }));

  const columns: ColumnDef<typeof formattedLeaveTypes[0]>[] = [
    {
      accessorKey: "leave_name",
      header: "Leave Category",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.leave_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.id.substring(0, 8)}</span>
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary"
            onClick={() => openEdit(row.original)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = formattedLeaveTypes.filter(l => l.status === "Active").length;
  const draftCount = formattedLeaveTypes.filter(l => l.status === "Draft").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Leave Configuration"
        description="Define statutory leave types, accrual logic, and carry-forward rules for payroll integration."
        actions={
          <Button className="gap-2 shadow-sm" onClick={openCreate}>
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
            { label: "Total Defined", value: leaveTypes.length, icon: History, color: "text-info" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DataTable columns={columns} data={formattedLeaveTypes} searchKey="leave_name" isLoading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Leave Type" : "Define Leave Type"}</DialogTitle>
            <DialogDescription>Configure leave entitlement and carry-forward rules.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Leave Name *</Label>
              <Input
                value={form.leave_name}
                onChange={e => setForm({ ...form, leave_name: e.target.value })}
                placeholder="e.g., Casual Leave"
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Quota (Days) *</Label>
              <Input
                type="number"
                min={1}
                value={form.yearly_quota}
                onChange={e => setForm({ ...form, yearly_quota: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Paid Leave</Label>
              <Switch
                checked={form.is_paid}
                onCheckedChange={v => setForm({ ...form, is_paid: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Carry Forward</Label>
              <Switch
                checked={form.can_carry_forward}
                onCheckedChange={v => setForm({ ...form, can_carry_forward: v })}
              />
            </div>
            {form.can_carry_forward && (
              <div className="space-y-2">
                <Label>Max Carry Forward (Days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_carry_forward ?? ""}
                  onChange={e => setForm({ ...form, max_carry_forward: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Leave blank for unlimited"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !form.leave_name}>
              {isSubmitting ? "Saving..." : editTarget ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

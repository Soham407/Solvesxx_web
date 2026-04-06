"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Calendar, Flag, Info, Loader2, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreateHolidayDTO, Holiday, useHolidays } from "@/hooks/useHolidays";

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  national: "National",
  regional: "Regional",
  company_off: "Company Off",
};

const PAYROLL_IMPACT_LABELS: Record<string, string> = {
  standard_off: "Standard Off",
  public_holiday_pay: "Public Holiday Pay",
};

const INITIAL_HOLIDAY_FORM = {
  holiday_name: "",
  holiday_date: "",
  holiday_type: "national",
  payroll_impact: "standard_off",
  description: "",
};

function getHolidayTypeLabel(value: string | null) {
  if (!value) return "Company Off";
  return HOLIDAY_TYPE_LABELS[value] || value;
}

function getPayrollImpactLabel(value: string | null) {
  if (!value) return "Standard Off";
  return PAYROLL_IMPACT_LABELS[value] || value;
}

export default function HolidayCalendarPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [holidayForm, setHolidayForm] = useState(INITIAL_HOLIDAY_FORM);
  const { holidays, isLoading, error, addHoliday, deleteHoliday } = useHolidays();

  const stats = useMemo(() => {
    const nationalCount = holidays.filter((holiday) => holiday.holiday_type === "national").length;
    const regionalCount = holidays.filter((holiday) => holiday.holiday_type === "regional").length;
    const companyCount = holidays.filter((holiday) => holiday.holiday_type === "company_off").length;

    return { nationalCount, regionalCount, companyCount };
  }, [holidays]);

  const handleCreateHoliday = async () => {
    if (!holidayForm.holiday_name || !holidayForm.holiday_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateHolidayDTO = {
        holiday_name: holidayForm.holiday_name.trim(),
        holiday_date: holidayForm.holiday_date,
        holiday_type: holidayForm.holiday_type,
        payroll_impact: holidayForm.payroll_impact,
        description: holidayForm.description.trim() || undefined,
        year: new Date(holidayForm.holiday_date).getFullYear(),
      };
      await addHoliday(payload);
      setHolidayForm(INITIAL_HOLIDAY_FORM);
      setIsCreateDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (holiday: Holiday) => {
    setIsSubmitting(true);
    try {
      await deleteHoliday(holiday.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Holiday>[] = [
    {
      accessorKey: "holiday_name",
      header: "Holiday Instance",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
            <Flag className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold">{row.original.holiday_name}</span>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {row.original.year}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "holiday_date",
      header: "Observed Date",
      cell: ({ row }) => {
        const holidayDate = new Date(row.original.holiday_date);
        return (
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold">{format(holidayDate, "yyyy-MM-dd")}</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {format(holidayDate, "EEEE")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "holiday_type",
      header: "Classification",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-0.5 text-[10px] font-bold uppercase",
            row.original.holiday_type === "national"
              ? "border-primary/20 bg-primary/5 text-primary"
              : "border-none bg-muted/50 text-muted-foreground"
          )}
        >
          {getHolidayTypeLabel(row.original.holiday_type)}
        </Badge>
      ),
    },
    {
      accessorKey: "payroll_impact",
      header: "Payroll Logic",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-info" />
          <span className="text-xs font-bold text-muted-foreground">
            {getPayrollImpactLabel(row.original.payroll_impact)}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={isSubmitting}
          onClick={() => handleDeleteHoliday(row.original)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Holiday Master"
        description="Unified calendar of National and Regional holidays utilized for payroll and statutory pay calculations."
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Holiday</DialogTitle>
                <DialogDescription>
                  Record the date and payroll treatment for the holiday calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="holiday_name">Holiday Name</Label>
                  <Input
                    id="holiday_name"
                    value={holidayForm.holiday_name}
                    onChange={(event) =>
                      setHolidayForm((prev) => ({ ...prev, holiday_name: event.target.value }))
                    }
                    placeholder="Independence Day"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday_date">Holiday Date</Label>
                    <Input
                      id="holiday_date"
                      type="date"
                      value={holidayForm.holiday_date}
                      onChange={(event) =>
                        setHolidayForm((prev) => ({ ...prev, holiday_date: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday_type">Holiday Type</Label>
                    <Select
                      value={holidayForm.holiday_type}
                      onValueChange={(value) =>
                        setHolidayForm((prev) => ({ ...prev, holiday_type: value }))
                      }
                    >
                      <SelectTrigger id="holiday_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="company_off">Company Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payroll_impact">Payroll Impact</Label>
                  <Select
                    value={holidayForm.payroll_impact}
                    onValueChange={(value) =>
                      setHolidayForm((prev) => ({ ...prev, payroll_impact: value }))
                    }
                  >
                    <SelectTrigger id="payroll_impact">
                      <SelectValue placeholder="Select payroll handling" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard_off">Standard Off</SelectItem>
                      <SelectItem value="public_holiday_pay">Public Holiday Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday_description">Description</Label>
                  <Textarea
                    id="holiday_description"
                    value={holidayForm.description}
                    onChange={(event) =>
                      setHolidayForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Optional statutory or internal notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setHolidayForm(INITIAL_HOLIDAY_FORM);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateHoliday}
                  disabled={isSubmitting || !holidayForm.holiday_name || !holidayForm.holiday_date}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Holiday
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            {
              label: "Public Holidays",
              value: stats.nationalCount,
              sub: "National observance",
              icon: Flag,
              color: "text-primary",
            },
            {
              label: "Regional / Fest",
              value: stats.regionalCount,
              sub: "State-specific",
              icon: Calendar,
              color: "text-warning",
            },
            {
              label: "Company Special",
              value: stats.companyCount,
              sub: "Organization specific",
              icon: Info,
              color: "text-info",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-none p-4 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50",
                    stat.color
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable columns={columns} data={holidays} searchKey="holiday_name" />
      )}
    </div>
  );
}

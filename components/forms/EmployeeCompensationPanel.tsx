"use client";

import { type FormEvent, useMemo, useRef } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useEmployeeSalaryStructure } from "@/hooks/useEmployeeSalaryStructure";
import { cn } from "@/lib/utils";
import { formatCurrency, toRupees } from "@/src/lib/utils/currency";

interface EmployeeCompensationPanelProps {
  employeeId: string;
  employeeName: string;
  canManage: boolean;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeCompensationPanel({
  employeeId,
  employeeName,
  canManage,
}: EmployeeCompensationPanelProps) {
  const {
    components,
    activeStructures,
    hasBasicSalary,
    isLoading,
    isSaving,
    error,
    saveSalaryStructure,
  } = useEmployeeSalaryStructure(employeeId);

  const defaultEffectiveFromRef = useRef(getTodayIsoDate());
  const formRevisionKey = useMemo(() => {
    const componentSeed = components.map((component) => component.id).join("|") || "no-components";
    const structureSeed =
      activeStructures
        .map((record) => `${record.id}:${record.amount}:${record.effectiveFrom}`)
        .join("|") || "no-structure";

    return `${employeeId}:${componentSeed}:${structureSeed}`;
  }, [employeeId, components, activeStructures]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const effectiveFrom = String(formData.get("effectiveFrom") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const result = await saveSalaryStructure({
      employeeId,
      effectiveFrom,
      notes,
      components: components.map((component) => ({
        componentId: component.id,
        amountRupees: Number(formData.get(`component-${component.id}`) || 0),
      })),
    });

    if (result.success) {
      event.currentTarget.reset();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading payroll compensation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <WalletCards className="h-5 w-5 text-primary" />
                Payroll Compensation
              </CardTitle>
              <CardDescription>
                Maintain the employee salary structure that the payroll engine uses for
                attendance-linked payslip calculation.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "w-fit font-bold uppercase",
                hasBasicSalary
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning"
              )}
            >
              {hasBasicSalary ? "Payroll Ready" : "Setup Required"}
            </Badge>
          </div>

          {hasBasicSalary ? (
            <Alert variant="success">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>{employeeName} can be included in payroll generation.</AlertTitle>
              <AlertDescription>
                The active salary structure includes a Basic Salary component. New values saved
                here become the current payroll basis from the effective date you choose.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payroll is blocked until compensation is configured.</AlertTitle>
              <AlertDescription>
                The payroll engine skips employees who do not have an active Basic Salary. Configure
                the current component values here before generating payslips.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Compensation data could not be loaded.</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <form key={formRevisionKey} className="space-y-6" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="salary-effective-from" className="text-xs font-bold uppercase tracking-wider">
                Effective From
              </Label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="salary-effective-from"
                  name="effectiveFrom"
                  type="date"
                  defaultValue={defaultEffectiveFromRef.current}
                  disabled={!canManage || isSaving}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use the first day from which this structure should drive payroll.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary-notes" className="text-xs font-bold uppercase tracking-wider">
                Change Note
              </Label>
              <Textarea
                id="salary-notes"
                name="notes"
                defaultValue=""
                disabled={!canManage || isSaving}
                placeholder="Document the reason for this compensation update."
                className="min-h-[92px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The same note is stored against each component change saved in this batch.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            {components.map((component) => {
              const existingComponent = activeStructures.find(
                (record) => record.componentId === component.id
              );

              return (
                <div
                  key={component.id}
                  className="rounded-2xl border bg-card/50 p-4 shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{component.name}</h3>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {component.abbr}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {component.description || "Current payroll-supported component."}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        component.dependsOnPaymentDays
                          ? "border-info/30 bg-info/10 text-info"
                          : "border-muted bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {component.dependsOnPaymentDays ? "Prorated" : "Fixed"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label
                      htmlFor={`salary-component-${component.abbr}`}
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      Monthly Amount (INR)
                    </Label>
                    <Input
                      id={`salary-component-${component.abbr}`}
                      name={`component-${component.id}`}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canManage || isSaving}
                      defaultValue={existingComponent ? toRupees(existingComponent.amount).toString() : ""}
                      placeholder={component.abbr === "B" ? "Required for payroll" : "Optional"}
                    />
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {existingComponent ? (
                      <span>
                        Current active value: {formatCurrency(existingComponent.amount)} from{" "}
                        {formatDate(existingComponent.effectiveFrom)}
                      </span>
                    ) : (
                      <span>No active value configured yet.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {canManage ? (
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WalletCards className="h-4 w-4" />
                )}
                Save Compensation
              </Button>
            </div>
          ) : (
            <Alert variant="muted">
              <AlertTitle>Read-only compensation view</AlertTitle>
              <AlertDescription>
                This employee dossier shows payroll inputs, but only payroll admins can change the
                salary structure.
              </AlertDescription>
            </Alert>
          )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-base font-bold">Current Active Structure</CardTitle>
          <CardDescription>
            This is the live component set the payroll calculator can see right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeStructures.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {activeStructures.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{record.componentName}</span>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {record.componentAbbr}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active from {formatDate(record.effectiveFrom)}
                      {record.notes ? ` | ${record.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {formatCurrency(record.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No active payroll compensation is configured for this employee yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

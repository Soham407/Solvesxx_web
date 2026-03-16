"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  DollarSign,
  CreditCard,
  BarChart2,
  ShieldCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useSupplierBills } from "@/hooks/useSupplierBills";
import { useBuyerInvoices } from "@/hooks/useBuyerInvoices";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useCompliance } from "@/hooks/useCompliance";
import { formatCurrency } from "@/src/lib/utils/currency";

export function AccountsDashboard() {
  const router = useRouter();

  const { bills, getBillStatistics, isLoading: billsLoading } = useSupplierBills();
  const { invoices, getInvoiceStatistics, isLoading: invoicesLoading } = useBuyerInvoices();
  const { reconciliations, isLoading: reconLoading } = useReconciliation();
  const { snapshots, isLoading: complianceLoading } = useCompliance();

  const isLoading = billsLoading || invoicesLoading || reconLoading || complianceLoading;

  const billStats = useMemo(() => getBillStatistics(), [bills]);
  const invoiceStats = useMemo(() => getInvoiceStatistics(), [invoices]);

  const discrepancyCount = useMemo(
    () => reconciliations.filter((r) => r.status === "discrepancy").length,
    [reconciliations],
  );

  const unresolvedCompliance = useMemo(
    () =>
      snapshots.reduce((sum, s) => sum + (s.unresolved_reconciliations_count || 0), 0),
    [snapshots],
  );

  // Build a simple monthly chart from bills + invoices data
  const chartData = useMemo(() => {
    const monthMap: Record<string, { month: string; inflow: number; outflow: number }> = {};
    invoices.forEach((inv) => {
      const m = new Date(inv.invoice_date).toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!monthMap[m]) monthMap[m] = { month: m, inflow: 0, outflow: 0 };
      monthMap[m].inflow += inv.paid_amount;
    });
    bills.forEach((bill) => {
      const m = new Date(bill.bill_date).toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!monthMap[m]) monthMap[m] = { month: m, inflow: 0, outflow: 0 };
      monthMap[m].outflow += bill.paid_amount;
    });
    return Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [bills, invoices]);

  const kpis = [
    {
      label: "Accounts Receivable",
      value: formatCurrency(invoiceStats.totalOutstanding),
      sub: `${invoiceStats.unpaidInvoices} unpaid invoices`,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
      action: () => router.push("/finance/buyer-billing"),
    },
    {
      label: "Accounts Payable",
      value: formatCurrency(billStats.totalDue),
      sub: `${billStats.unpaidBills} supplier bills pending`,
      icon: TrendingDown,
      color: "text-critical",
      bg: "bg-critical/10",
      action: () => router.push("/finance/supplier-bills"),
    },
    {
      label: "Recon Discrepancies",
      value: discrepancyCount.toString(),
      sub: "Awaiting resolution",
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      action: () => router.push("/finance/reconciliation"),
    },
    {
      label: "Compliance Issues",
      value: unresolvedCompliance.toString(),
      sub: "Unresolved items",
      icon: ShieldCheck,
      color: "text-info",
      bg: "bg-info/10",
      action: () => router.push("/finance/compliance"),
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold">Finance & Reconciliation</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Managing the ledger, billing, and triple-match audits.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 font-bold h-10 border-muted-foreground/20"
          onClick={() => router.push("/finance/payments")}
        >
          <Calculator className="h-4 w-4" /> View Ledger
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : kpis.map((kpi) => (
              <Card
                key={kpi.label}
                className="border-none shadow-card ring-1 ring-border p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={kpi.action}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {kpi.label}
                    </span>
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    <span className="text-xs text-muted-foreground">{kpi.sub}</span>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <span>View details</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Card>
            ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-card ring-1 ring-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Cash Flow — Last 6 Months
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No payment data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="inflow" name="Inflow (AR)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Outflow (AP)" fill="hsl(var(--critical))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <FileCheck2 className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {[
              { label: "Process Supplier Bills", href: "/finance/supplier-bills", icon: CreditCard },
              { label: "Issue Buyer Invoices", href: "/finance/buyer-billing", icon: DollarSign },
              { label: "3-Way Reconciliation", href: "/finance/reconciliation", icon: BarChart2 },
              { label: "Compliance Vault", href: "/finance/compliance", icon: ShieldCheck },
              { label: "Universal Ledger", href: "/finance/payments", icon: Calculator },
            ].map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="w-full justify-start gap-3 h-9 text-sm font-medium text-left"
                onClick={() => router.push(item.href)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Billed (AR)</span>
            {isLoading ? <Skeleton className="h-5 w-20" /> : (
              <span className="font-bold text-sm">{formatCurrency(invoiceStats.totalAmount)}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {isLoading ? <Skeleton className="h-3 w-full" /> : (
              <>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${invoiceStats.totalAmount > 0 ? (invoiceStats.totalCollected / invoiceStats.totalAmount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {invoiceStats.totalAmount > 0 ? Math.round((invoiceStats.totalCollected / invoiceStats.totalAmount) * 100) : 0}% collected
                </span>
              </>
            )}
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Payable (AP)</span>
            {isLoading ? <Skeleton className="h-5 w-20" /> : (
              <span className="font-bold text-sm">{formatCurrency(billStats.totalAmount)}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {isLoading ? <Skeleton className="h-3 w-full" /> : (
              <>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${billStats.totalAmount > 0 ? (billStats.totalPaid / billStats.totalAmount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {billStats.totalAmount > 0 ? Math.round((billStats.totalPaid / billStats.totalAmount) * 100) : 0}% paid
                </span>
              </>
            )}
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reconciliation Status</span>
            {isLoading ? <Skeleton className="h-5 w-20" /> : (
              <Badge
                variant="outline"
                className={discrepancyCount > 0 ? "bg-warning/10 text-warning border-warning/20" : "bg-success/10 text-success border-success/20"}
              >
                {discrepancyCount > 0 ? `${discrepancyCount} issues` : "Clean"}
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {isLoading ? <Skeleton className="h-3 w-32" /> : (
              <span>{reconciliations.filter(r => r.status === "matched").length} matched · {reconciliations.filter(r => r.status === "pending").length} pending</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

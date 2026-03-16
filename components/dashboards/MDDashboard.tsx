"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Globe,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMDStats } from "@/hooks/useMDStats";
import { formatCurrency } from "@/src/lib/utils/currency";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function MDDashboard() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { stats, isLoading } = useMDStats();

  useEffect(() => { setMounted(true); }, []);

  const statCards = [
    {
      label: "Active Societies",
      value: isLoading ? "..." : stats.activeSocieties.toString(),
      sub: "Operational sites",
      icon: Building2,
      bg: "bg-primary",
    },
    {
      label: "Force Strength",
      value: isLoading ? "..." : stats.totalEmployees.toLocaleString(),
      sub: "Total employees",
      icon: Users,
      bg: "bg-warning",
    },
    {
      label: "Guard Strength",
      value: isLoading ? "..." : stats.guardStrength.toLocaleString(),
      sub: "Security personnel",
      icon: ShieldCheck,
      bg: "bg-info",
    },
    {
      label: "YTD Revenue",
      value: isLoading
        ? "..."
        : stats.totalRevenue !== null
        ? formatCurrency(stats.totalRevenue)
        : "—",
      sub: "Collections this year",
      icon: DollarSign,
      bg: "bg-success",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight">Strategic Hub (Company MD)</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
            Enterprise growth, operational health, and workforce overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="glow"
            className="gap-2 font-semibold"
            onClick={() => router.push("/reports/financial")}
          >
            <Globe className="h-4 w-4" /> Financial Reports
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid gap-6 md:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={cardVariants}>
            <Card className="border-none shadow-sm ring-1 ring-border p-4 bg-card premium-card-hover cursor-pointer group corner-accent">
              <div className="flex items-center gap-4 text-left">
                <div
                  className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow text-white",
                    stat.bg,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight">{stat.value}</span>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider leading-none mt-1">
                    {stat.label}
                  </span>
                  <span className="text-xs font-medium mt-1 text-success">{stat.sub}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Compliance */}
      <motion.div
        className="grid gap-6 lg:grid-cols-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Revenue vs Expenses Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold uppercase tracking-wide">
                  Revenue vs Expenses
                </CardTitle>
                <CardDescription className="text-xs">Last 6 months cash flow</CardDescription>
              </div>
              {stats.monthlyTrends.length > 0 && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-bold">
                  Live
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : stats.monthlyTrends.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                No financial data yet — bills and payments will appear here
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={stats.monthlyTrends}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--critical))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--critical))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="hsl(var(--critical))"
                    strokeWidth={2}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Compliance + Financial Metrics */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="flex flex-col gap-4 text-left relative z-10">
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold uppercase tracking-wide">PSARA Compliance</h3>
                <p className="text-xs text-indigo-100/70 font-medium">Guards with valid licenses</p>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-24 bg-white/20" />
              ) : stats.psaraCompliancePercent !== null ? (
                <div className="flex flex-col gap-2">
                  <span className="text-4xl font-black">{stats.psaraCompliancePercent}%</span>
                  <div className="w-full h-2 rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-700"
                      style={{ width: `${stats.psaraCompliancePercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-indigo-100/70">
                    {stats.psaraCompliancePercent >= 80 ? "Compliant" : "Action required"}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-white/60">No guard data yet</span>
              )}
              <Button
                className="w-full bg-white/10 text-white hover:bg-white/20 font-semibold uppercase text-xs tracking-wider mt-2 h-10 border border-white/10"
                onClick={() => router.push("/hrms/documents")}
              >
                View Documents
              </Button>
            </div>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-border p-5">
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Financial Snapshot</h4>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">YTD Revenue</span>
                    <span className="text-sm font-bold text-success">
                      {stats.totalRevenue !== null ? formatCurrency(stats.totalRevenue) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Staff</span>
                    <span className="text-sm font-bold">{stats.totalEmployees.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Active Sites</span>
                    <span className="text-sm font-bold">{stats.activeSocieties}</span>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs font-bold"
                onClick={() => router.push("/reports/financial")}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-2" /> Full Analytics
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

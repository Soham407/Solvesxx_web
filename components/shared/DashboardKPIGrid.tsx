"use client";

import { LucideIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KPIItem {
  label: string;
  value: string | number | null; // null = loading skeleton inline
  icon: LucideIcon;
  color: string;   // e.g. "text-primary"
  bg: string;      // e.g. "bg-primary/10"
  sub?: string;    // subtitle below value
  onClick?: () => void;
}

interface DashboardKPIGridProps {
  kpis: KPIItem[];
  isLoading?: boolean; // true = show skeleton cards instead of content
  columns?: 3 | 4;    // default 4
}

/**
 * Shared KPI card grid used across role dashboards.
 * Replaces the repeated kpis.map() pattern.
 *
 * @example
 * <DashboardKPIGrid kpis={kpis} isLoading={isLoading} />
 */
export function DashboardKPIGrid({
  kpis,
  isLoading = false,
  columns = 4,
}: DashboardKPIGridProps) {
  const gridClass = cn(
    "grid gap-6 grid-cols-1",
    columns === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : "md:grid-cols-3"
  );

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className={cn(
            "border-none shadow-card",
            kpi.onClick && "cursor-pointer hover:shadow-md transition-shadow group"
          )}
          onClick={kpi.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight mt-1">
              {kpi.value === null ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                kpi.value
              )}
            </div>
            <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.15em] mt-1">
              {kpi.label}
            </p>
            {kpi.sub && (
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

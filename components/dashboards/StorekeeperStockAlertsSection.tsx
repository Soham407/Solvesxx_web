"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReorderAlert } from "@/hooks/useReorderAlerts";

interface StorekeeperStockAlertsSectionProps {
  alerts: ReorderAlert[];
}

export function StorekeeperStockAlertsSection({ alerts }: StorekeeperStockAlertsSectionProps) {
  return (
    <Card className="border-none shadow-card">
      <CardHeader className="border-b py-4 bg-muted/5">
        <CardTitle className="text-sm font-bold uppercase tracking-widest">Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length > 0 ? (
          <div className="divide-y">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3 border-l-4",
                  alert.priority === "critical" || alert.priority === "high"
                    ? "border-critical bg-critical/5"
                    : "border-warning bg-warning/5",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">{alert.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.warehouseName} • Stock: {alert.currentStock}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                    alert.priority === "critical" || alert.priority === "high"
                      ? "bg-critical/10 text-critical"
                      : "bg-warning/10 text-warning",
                  )}
                >
                  {alert.alertType === "out_of_stock" ? "Out of Stock" : "Low Stock"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-6 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm">All stock levels normal</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { MaterialReceipt } from "@/hooks/useGRN";

interface StorekeeperGrnSectionProps {
  grns: MaterialReceipt[];
}

export function StorekeeperGrnSection({ grns }: StorekeeperGrnSectionProps) {
  return (
    <Card className="border-none shadow-card">
      <CardHeader className="border-b py-4 bg-muted/5">
        <CardTitle className="text-sm font-bold uppercase tracking-widest">Recent GRNs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {grns.length > 0 ? (
          <div className="divide-y">
            {grns.slice(0, 6).map((grn) => (
              <div key={grn.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold">{grn.grn_number || "GRN pending"}</p>
                  <p className="text-xs text-muted-foreground">{grn.supplier_name || "Supplier not set"}</p>
                </div>
                <StatusBadge status={grn.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-6 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm">No pending GRNs</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

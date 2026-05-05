"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { RTVTicketDisplay } from "@/src/types/operations";

interface StorekeeperRtvSectionProps {
  tickets: RTVTicketDisplay[];
}

export function StorekeeperRtvSection({ tickets }: StorekeeperRtvSectionProps) {
  if (tickets.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-card">
      <CardHeader className="border-b py-4 bg-muted/5">
        <CardTitle className="text-sm font-bold uppercase tracking-widest">Open Return-to-Vendor Items</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {tickets.slice(0, 5).map((rtv) => (
            <div key={rtv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/5 transition-colors">
              <div>
                <p className="text-sm font-semibold">{rtv.rtv_number}</p>
                <p className="text-xs text-muted-foreground capitalize">{rtv.return_reason?.replace(/_/g, " ")}</p>
              </div>
              <StatusBadge status={rtv.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

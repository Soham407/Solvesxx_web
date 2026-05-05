"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StorekeeperKpiCard {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  color: string;
}

interface StorekeeperKpiCardsProps {
  cards: StorekeeperKpiCard[];
}

export function StorekeeperKpiCards({ cards }: StorekeeperKpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-none shadow-card hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-xl shadow-lg shadow-black/10", card.color)}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">{card.title}</p>
              <p className="text-3xl font-bold mt-1">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

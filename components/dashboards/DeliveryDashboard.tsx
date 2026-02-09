"use client";

import { Truck, Package, Construction, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoon, ComingSoonCard } from "@/components/shared/ComingSoon";

export function DeliveryDashboard() {
  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between pb-2 text-left">
          <div className="flex flex-col">
              <h1 className="text-xl font-bold ">Dispatch Ops</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Delivery Management System
              </p>
          </div>
          <Button size="icon" variant="outline" className="h-10 w-10 border-muted-foreground/20" disabled>
              <Package className="h-5 w-5" />
          </Button>
      </div>

      <ComingSoon 
        title="Active Route" 
        description="Route navigation and delivery optimization"
        size="lg" 
      />

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-left">
          Pending Deliveries
        </h2>
        <ComingSoonCard 
          title="Delivery Pipeline" 
          description="View assigned deliveries, navigate to destinations, and update delivery status."
        />
      </div>

      <div className="space-y-4">
        <ComingSoon 
          title="Package Tracking" 
          description="QR code scanning and package verification"
          size="md" 
        />
        <ComingSoon 
          title="Route Optimization" 
          description="AI-powered delivery sequencing"
          size="md" 
        />
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="bg-muted/5 border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Construction className="h-4 w-4" />
            Delivery Module Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-left space-y-3">
            <p className="text-sm text-muted-foreground">
              The Delivery Management module is not part of the current Phase A/B scope.
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Route optimization</li>
              <li>QR code tracking</li>
              <li>Delivery confirmation</li>
              <li>Real-time location sharing</li>
            </ul>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Future Roadmap Item
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

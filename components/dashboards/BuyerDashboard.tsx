"use client";

import { ShoppingCart, Package, Construction, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoon, ComingSoonCard } from "@/components/shared/ComingSoon";

export function BuyerDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Order & Requisition Portal</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Select service category and specify requirements.
          </p>
        </div>
        <Button variant="outline" className="font-bold gap-2" disabled>
            <Package className="h-4 w-4" /> My Active Orders
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ComingSoon 
          title="Security Services" 
          description="Request armed guards, door keepers, and security personnel"
          size="md" 
        />
        <ComingSoon 
          title="Technical Staff" 
          description="Hire plumbers, electricians, AC technicians, and lift engineers"
          size="md" 
        />
        <ComingSoon 
          title="Soft Services" 
          description="Book housekeeping, pantry staff, and facility support"
          size="md" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoonCard 
          title="Service Requisition" 
          description="Create custom service requests with specific headcounts, shift timings, and deployment durations. Requires procurement workflow tables."
        />
        <ComingSoonCard 
          title="Deployment Pipeline" 
          description="Track order status from requisition to personnel deployment. View real-time updates on staffing assignments."
        />
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="bg-muted/5 border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Construction className="h-4 w-4" />
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-left">
            <p className="text-sm text-muted-foreground">
              The Buyer Portal and Procurement Workflow are planned for future implementation.
              Missing components include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Purchase order management</li>
              <li>Service requisition workflows</li>
              <li>Vendor/supplier selection</li>
              <li>Deployment tracking</li>
              <li>Rate card management</li>
              <li>Contract management</li>
            </ul>
            <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning font-medium">
                <Clock className="h-4 w-4 inline mr-2" />
                Phase C Target: Q2 2024
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

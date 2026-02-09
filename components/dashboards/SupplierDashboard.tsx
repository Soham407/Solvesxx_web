"use client";

import { Package, Construction, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoon, ComingSoonCard } from "@/components/shared/ComingSoon";

export function SupplierDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Vendor Fulfillment Portal</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Review indents and manage personnel roster.
          </p>
        </div>
        <Button variant="outline" className="gap-2 font-bold shadow-sm" disabled>
            Manage Roster
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ComingSoon 
          title="Open Indents" 
          description="View and accept service requests from buyers"
          size="md" 
        />
        <ComingSoon 
          title="Billing & Invoicing" 
          description="Submit invoices and track payment status"
          size="md" 
        />
        <ComingSoon 
          title="Personnel Roster" 
          description="Manage assigned staff and deployment schedules"
          size="md" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoonCard 
          title="Indent Management" 
          description="Review incoming service requests, accept or reject indents, and negotiate terms. Requires supplier management tables."
        />
        <ComingSoonCard 
          title="Personnel Tracking" 
          description="Manage your workforce deployment, track attendance, and handle replacements. View real-time deployment map."
        />
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="bg-muted/5 border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Construction className="h-4 w-4" />
            Supplier Portal Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-left">
            <p className="text-sm text-muted-foreground">
              The Supplier/Vendor Portal is planned for future implementation.
              Key features will include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Indent acceptance workflow</li>
              <li>Personnel roster management</li>
              <li>Deployment tracking</li>
              <li>Invoice submission</li>
              <li>Payment tracking</li>
              <li>Performance analytics</li>
            </ul>
            <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
              <p className="text-sm text-info font-medium">
                <Clock className="h-4 w-4 inline mr-2" />
                Estimated: Phase C - Q2 2024
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

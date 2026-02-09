"use client";

import { Calculator, Clock, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComingSoon, ComingSoonCard } from "@/components/shared/ComingSoon";

export function AccountsDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Finance & Reconciliation</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            Managing the ledger, billing, and triple-match audits.
          </p>
        </div>
        <Button variant="outline" className="gap-2 font-bold h-10 border-muted-foreground/20" disabled>
            <Calculator className="h-4 w-4" /> Export Ledger
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ComingSoon 
          title="Accounts Receivable" 
          description="Track incoming payments and invoices"
          size="md" 
        />
        <ComingSoon 
          title="Accounts Payable" 
          description="Manage vendor payments and expenses"
          size="md" 
        />
        <ComingSoon 
          title="Billing Verification" 
          description="Triple-match invoice validation"
          size="md" 
        />
        <ComingSoon 
          title="Tax Compliance" 
          description="GST, PF, and ESIC tracking"
          size="md" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoonCard 
          title="Billing Cycle Management" 
          description="View invoice status, payment tracking, and reconciliation workflows. This feature requires financial tables which are planned for Phase C."
        />
        <ComingSoonCard 
          title="Financial Reporting" 
          description="Generate P&L statements, balance sheets, and compliance reports. Available once accounting modules are implemented."
        />
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="bg-muted/5 border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Development Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-left">
            <p className="text-sm text-muted-foreground">
              The Accounts and Finance module is planned for Phase C implementation. 
              It will include:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Invoice management and billing cycles</li>
              <li>Accounts receivable/payable tracking</li>
              <li>GST and tax liability calculations</li>
              <li>PF/ESIC compliance tracking</li>
              <li>Financial reporting and analytics</li>
              <li>Triple-match audit workflows</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

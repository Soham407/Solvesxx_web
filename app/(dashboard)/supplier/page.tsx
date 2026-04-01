"use client";

import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  FileText, 
  Truck, 
  Clock, 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Badge } from "@/components/ui/badge";

export default function SupplierDashboard() {
  const { indents, pos, bills, isLoading } = useSupplierPortal();

  const stats = {
    pendingIndents: indents.filter(i => i.status === 'indent_forwarded').length,
    activePOs: pos.filter(p => ['sent_to_vendor', 'acknowledged'].includes(p.status)).length,
    unpaidBills: bills.filter(b => b.payment_status === 'unpaid').length,
    totalOutstanding: bills.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + b.total_amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Workspace</h1>
          <p className="text-muted-foreground">Manage your orders, fulfillment, and billing.</p>
        </div>
        <Link href="/supplier/profile">
          <Button variant="outline">Manage Profile</Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">New Requests</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingIndents}</div>
            <p className="text-xs text-muted-foreground">Require your attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active POs</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePOs}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unpaid Bills</CardTitle>
            <FileText className="h-4 w-4 text-critical" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaidBills}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Total receivables</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Incoming Indents</CardTitle>
            <CardDescription>Review and respond to new fulfillment requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {indents.filter(i => i.status === 'indent_forwarded').slice(0, 3).map((indent) => (
              <div key={indent.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div>
                  <div className="font-bold">{indent.request_number}</div>
                  <div className="text-sm text-muted-foreground">{indent.title}</div>
                </div>
                <Link href="/supplier/indents">
                  <Button variant="ghost" size="sm" className="gap-2">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
            {stats.pendingIndents === 0 && (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
                No pending requests.
              </div>
            )}
            <Link href="/supplier/indents" className="block text-center">
              <Button variant="link" size="sm">View all requests</Button>
            </Link>
          </CardContent>
        </Card>

        {/* PO Task List */}
        <Card>
          <CardHeader>
            <CardTitle>Order Fulfillment</CardTitle>
            <CardDescription>Acknowledge and dispatch issued POs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pos.filter(p => ['sent_to_vendor', 'acknowledged'].includes(p.status)).slice(0, 3).map((po) => (
              <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div>
                  <div className="font-bold">{po.po_number}</div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{po.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{formatCurrency(po.grand_total)}</span>
                  </div>
                </div>
                <Link href="/supplier/purchase-orders">
                  <Button variant="outline" size="sm">Action</Button>
                </Link>
              </div>
            ))}
            {stats.activePOs === 0 && (
              <div className="text-center py-6 text-muted-foreground">No active purchase orders.</div>
            )}
            <Link href="/supplier/purchase-orders" className="block text-center">
              <Button variant="link" size="sm">Manage fulfillment</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

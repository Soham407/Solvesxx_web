"use client";

import { useBuyerRequests, REQUEST_STATUS_CONFIG } from "@/hooks/useBuyerRequests";
import { useBuyerInvoices, PAYMENT_STATUS_CONFIG } from "@/hooks/useBuyerInvoices";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Receipt, Clock, PackageCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function BuyerDashboard() {
  const { requests, isLoading: isLoadingRequests } = useBuyerRequests();
  const { invoices, isLoading: isLoadingInvoices } = useBuyerInvoices();

  const stats = [
    {
      title: "Active Requests",
      value: requests.filter(r => r.status !== 'completed' && r.status !== 'rejected').length,
      icon: Clock,
      color: "text-info"
    },
    {
      title: "Pending Invoices",
      value: invoices.filter(i => i.payment_status !== 'paid').length,
      icon: Receipt,
      color: "text-warning"
    },
    {
      title: "Completed Orders",
      value: requests.filter(r => r.status === 'completed').length,
      icon: PackageCheck,
      color: "text-success"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Portal</h1>
          <p className="text-muted-foreground">Manage your orders and view invoices.</p>
        </div>
        <Link href="/buyer/requests/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Order Request
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-background border ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Recent Requests
              </CardTitle>
              <CardDescription>Track your active order progress.</CardDescription>
            </div>
            <Link href="/buyer/requests">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingRequests ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : requests.length > 0 ? (
              requests.slice(0, 5).map((req) => (
                <Link key={req.id} href={`/buyer/requests/${req.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{req.request_number}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{req.title}</p>
                    </div>
                    <Badge variant="secondary" className={REQUEST_STATUS_CONFIG[req.status]?.className}>
                      {REQUEST_STATUS_CONFIG[req.status]?.buyerLabel}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No requests found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Recent Invoices
              </CardTitle>
              <CardDescription>Review and track your payments.</CardDescription>
            </div>
            <Link href="/buyer/invoices">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingInvoices ? (
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            ) : invoices.length > 0 ? (
              invoices.slice(0, 5).map((inv) => (
                <Link key={inv.id} href="/buyer/invoices">
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(inv.total_amount)} | {format(new Date(inv.invoice_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="secondary" className={PAYMENT_STATUS_CONFIG[inv.payment_status]?.className}>
                      {(inv.payment_status || 'unpaid').toUpperCase()}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No invoices found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

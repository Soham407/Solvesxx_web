"use client";

import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Plus, Receipt, Download, Wallet, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/src/lib/utils/currency";
import Link from "next/link";

export default function SupplierBillsPage() {
  const { bills, isLoading } = useSupplierPortal();
  const [search, setSearch] = useState("");

  const filteredBills = bills.filter(b => 
    b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier_invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground">Submit and track your bills for material fulfillment.</p>
        </div>
        <Link href="/supplier/bills/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Bill Submission
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Pending Payment
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(bills.filter(b => b.payment_status === 'unpaid').reduce((sum, b) => sum + b.total_amount, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> Total Paid
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(bills.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.total_amount, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Lifetime Billed
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(bills.reduce((sum, b) => sum + b.total_amount, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            className="w-full pl-9 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 animate-pulse italic">Loading bills...</TableCell>
              </TableRow>
            ) : filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono font-bold text-xs">{bill.bill_number}</TableCell>
                  <TableCell className="font-medium">{bill.supplier_invoice_number}</TableCell>
                  <TableCell className="text-sm">{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(bill.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{bill.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={bill.payment_status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                      {bill.payment_status?.toUpperCase() || 'UNPAID'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No bills found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

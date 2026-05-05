"use client";

import { useSupplierPortal, type SupplierBill } from "@/hooks/useSupplierPortal";
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
import { Search, Plus, Receipt, Download, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/src/lib/utils/currency";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";

function summarizeSupplierBills(bills: SupplierBill[]) {
  const partiallyPaid = bills.filter((bill) => bill.payment_status === "partial");
  const totalOutstanding = bills
    .filter((bill) => bill.payment_status !== "paid")
    .reduce((sum, bill) => sum + (bill.due_amount ?? 0), 0);

  return {
    pendingPayment: totalOutstanding,
    totalPaid: bills.reduce((sum, bill) => sum + (bill.paid_amount ?? 0), 0),
    lifetimeBilled: bills.reduce((sum, bill) => sum + bill.total_amount, 0),
    partiallyPaid: partiallyPaid.length,
    totalOutstanding,
  };
}

function getSupplierBillPaymentClassName(paymentStatus?: string | null) {
  return paymentStatus === "paid" ? "bg-success/20 text-success" : "bg-warning/20 text-warning";
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toBillDocumentPath(documentUrl: string): string {
  const trimmed = documentUrl.trim().replace(/^\/+/, "");
  return trimmed.startsWith("bill-documents/") ? trimmed.slice("bill-documents/".length) : trimmed;
}

export default function SupplierBillsPage() {
  const { bills, isLoading } = useSupplierPortal();
  const [search, setSearch] = useState("");
  const [resolvingDocumentBillId, setResolvingDocumentBillId] = useState<string | null>(null);

  const handleBillDocumentDownload = async (bill: SupplierBill) => {
    if (!bill.document_url) {
      toast.info("Bill document is not available for this bill.");
      return;
    }

    setResolvingDocumentBillId(bill.id);
    try {
      if (isHttpUrl(bill.document_url)) {
        window.open(bill.document_url, "_blank", "noopener,noreferrer");
        return;
      }

      const storagePath = toBillDocumentPath(bill.document_url);
      const { data, error } = await supabase.storage
        .from("bill-documents")
        .createSignedUrl(storagePath, 60 * 60);

      if (error || !data?.signedUrl) {
        toast.error("Unable to open the bill document right now.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Unable to open the bill document right now.");
    } finally {
      setResolvingDocumentBillId(null);
    }
  };

  const filteredBills = bills.filter(b => 
    b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
    (b.supplier_invoice_number ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const { pendingPayment, totalPaid, lifetimeBilled, partiallyPaid, totalOutstanding } =
    summarizeSupplierBills(bills);

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
              {formatCurrency(pendingPayment)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Settlement open amount</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> Total Paid
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totalPaid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Lifetime Billed
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(lifetimeBilled)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Settlement: {partiallyPaid} partially paid | {formatCurrency(totalOutstanding)} due
            </p>
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
              <TableHead>Settlement</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 animate-pulse italic">Loading bills...</TableCell>
              </TableRow>
            ) : filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono font-bold text-xs">{bill.bill_number}</TableCell>
                  <TableCell className="font-medium">{bill.supplier_invoice_number || "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(bill.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{bill.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSupplierBillPaymentClassName(bill.payment_status)}>
                      {bill.payment_status?.toUpperCase() || 'UNPAID'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p>Paid: {formatCurrency(bill.paid_amount ?? 0)}</p>
                      <p className="text-muted-foreground">Due: {formatCurrency(bill.due_amount ?? 0)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      disabled={!bill.document_url || resolvingDocumentBillId === bill.id}
                      onClick={() => handleBillDocumentDownload(bill)}
                    >
                      <Download className="h-4 w-4" />
                      {!bill.document_url ? "No document" : resolvingDocumentBillId === bill.id ? "Opening..." : "PDF"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No bills found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

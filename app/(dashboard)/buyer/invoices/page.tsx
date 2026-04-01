"use client";

import { useBuyerInvoices, PAYMENT_STATUS_CONFIG } from "@/hooks/useBuyerInvoices";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Download, ExternalLink, Filter, Wallet, Star } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BuyerFeedbackDialog } from "@/components/buyer/BuyerFeedbackDialog";
import { toast } from "sonner";

export default function BuyerInvoicesPage() {
  const { invoices, isLoading } = useBuyerInvoices();
  const [search, setSearch] = useState("");

  const handleDownloadPDF = (invoiceNumber: string) => {
    toast.info(`Generating PDF for ${invoiceNumber}...`);
    // Mock PDF generation
    setTimeout(() => {
      toast.success(`PDF for ${invoiceNumber} downloaded successfully`);
    }, 1500);
  };

  const handlePayNow = (invoiceNumber: string) => {
    toast.info(`Redirecting to payment gateway for ${invoiceNumber}...`);
    // Mock payment redirection
    setTimeout(() => {
      toast.success(`Secure payment session initiated for ${invoiceNumber}`);
    }, 1000);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    unpaid: invoices.filter(inv => inv.payment_status !== 'paid').reduce((sum, inv) => sum + inv.due_amount, 0),
    paid: invoices.filter(inv => inv.payment_status === 'paid').reduce((sum, inv) => sum + inv.paid_amount, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-muted-foreground">Review and manage your financial records.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Billed</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.total)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Amount</CardDescription>
            <CardTitle className="text-2xl text-critical">{formatCurrency(stats.unpaid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-success">{formatCurrency(stats.paid)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search invoice number..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground animate-pulse">
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono font-bold">{inv.invoice_number}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(inv.invoice_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(inv.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{inv.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={PAYMENT_STATUS_CONFIG[inv.payment_status]?.className}>
                      {(inv.payment_status || 'unpaid').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => handleDownloadPDF(inv.invoice_number)}
                    >
                       <Download className="h-3 w-3" /> PDF
                     </Button>
                     {inv.payment_status !== 'paid' ? (
                       <Button 
                         size="sm" 
                         variant="outline" 
                         className="gap-1 border-primary text-primary hover:bg-primary/5"
                         onClick={() => handlePayNow(inv.invoice_number)}
                       >
                         <Wallet className="h-3 w-3" /> Pay Now
                       </Button>
                     ) : !inv.feedback_submitted ? (
                       <BuyerFeedbackDialog
                         invoiceId={inv.id}
                         supplierName={inv.supplier_name || "Supplier"}
                       >
                         <Button size="sm" variant="outline" className="gap-1 border-warning text-warning hover:bg-warning/5">
                           <Star className="h-3 w-3" /> Rate
                         </Button>
                       </BuyerFeedbackDialog>
                     ) : (
                       <Badge variant="outline" className="text-xs">
                         <Star className="h-3 w-3 fill-warning text-warning mr-1" /> Rated
                       </Badge>
                     )}
                   </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

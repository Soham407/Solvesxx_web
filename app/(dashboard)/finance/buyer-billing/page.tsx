"use client";

import { useState } from "react";
import { FileText, Plus, MoreHorizontal, DollarSign, Clock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBuyerInvoices, INVOICE_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, BuyerInvoice } from "@/hooks/useBuyerInvoices";
import { useFinance } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function BuyerBillingPage() {
  const { userId } = useAuth();
  const { invoices, isLoading, error, refresh: refreshInvoices } = useBuyerInvoices() as any;
  const { methods, recordTransaction } = useFinance();
  const manualMethods = methods.filter((method) => method.gateway === "manual");
  
  const [selectedInvoice, setSelectedInvoice] = useState<BuyerInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    if (!notes || notes.trim().length < 5) {
      toast.error("Please provide a meaningful reason/note for this receipt (min 5 characters)");
      return;
    }

    if (!isConfirmed) {
      toast.error("Please confirm the transaction by checking the checkbox");
      return;
    }

    if (!userId) {
      toast.error("Security Error: No authenticated user ID found. Please re-login.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await recordTransaction({
        type: 'receipt',
        referenceType: 'sale_bill',
        referenceId: selectedInvoice.sale_bill_id || selectedInvoice.id,
        amount: amountNum,
        methodId: selectedMethodId,
        date: paymentDate,
        notes: notes,
        payerId: selectedInvoice.client_id || '', // In a real app, this would be the specific user or entity ID
        payeeId: userId, // Use authenticated user ID (validated above)
      });

      if (success) {
        toast.success("Payment recorded successfully");
        setIsPaymentModalOpen(false);
        refreshInvoices();
      } else {
        toast.error("Failed to record payment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<BuyerInvoice>[] = [
    {
      accessorKey: "invoice_number",
      header: "Invoice ID",
      cell: ({ row }) => <span className="font-bold font-mono text-xs">{row.original.invoice_number}</span>
    },
    {
      accessorKey: "client_name",
      header: "Buyer / Client",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm ">{row.original.client_name}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">Contract {row.original.contract_number || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Grand Total",
      cell: ({ row }) => <span className="font-bold text-sm">{formatCurrency(row.original.total_amount || 0)}</span>,
    },
    {
      accessorKey: "due_amount",
      header: "Due Balance",
      cell: ({ row }) => (
        <span className={cn(
          "font-bold text-sm",
          (row.original.due_amount || 0) > 0 ? "text-critical" : "text-success"
        )}>
          {formatCurrency(row.original.due_amount || 0)}
        </span>
      ),
    },
    {
      accessorKey: "payment_status",
      header: "Payment Truth",
      cell: ({ row }) => {
        const val = row.original.payment_status as string;
        const config = PAYMENT_STATUS_CONFIG[val as keyof typeof PAYMENT_STATUS_CONFIG] || { label: val, className: "" };
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Truth Controls</DropdownMenuLabel>
            <DropdownMenuItem 
              className="gap-2 font-bold text-primary"
              disabled={row.original.payment_status === 'paid'}
              onClick={() => {
                setSelectedInvoice(row.original);
                setPaymentAmount((row.original.due_amount || 0).toString());
                setIsPaymentModalOpen(true);
              }}
            >
               <CheckCircle2 className="h-4 w-4" /> Record Payment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
               <FileText className="h-4 w-4" /> View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Synchronizing billing state...</p>
      </div>
    );
  }

  const totalOutstanding = invoices.reduce((acc: number, inv: BuyerInvoice) => acc + (inv.due_amount || 0), 0);
  const collectedTotal = invoices.reduce((acc: number, inv: BuyerInvoice) => acc + (inv.paid_amount || 0), 0);

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <div className="grid gap-4 md:grid-cols-4">
         <Card className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Accounts Receivable</span>
              <span className="text-2xl font-bold font-mono text-critical">{formatCurrency(totalOutstanding)}</span>
              <span className="text-[10px] text-muted-foreground">Verified outstanding</span>
            </div>
         </Card>
         <Card className="border-none shadow-card ring-1 ring-border p-4 bg-success/5 border-l-4 border-l-success">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-success">Total Collected</span>
              <span className="text-2xl font-bold font-mono text-success">{formatCurrency(collectedTotal)}</span>
              <span className="text-[10px] text-success/60">Audit-ready collections</span>
            </div>
         </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="text-2xl font-bold uppercase tracking-tight">Buyer Financial Ledger</h1>
          <p className="text-sm text-muted-foreground">Official record of client billing and payment reconciliation.</p>
        </div>
        <Button className="gap-2 shadow-lg bg-primary hover:bg-primary/90 font-bold">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <DataTable columns={columns} data={invoices} searchKey="client_name" />

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Record Buyer Payment
            </DialogTitle>
            <DialogDescription>
              Record a manual payment for Invoice <strong>{selectedInvoice?.invoice_number}</strong>. This will update the financial truth.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">Method</Label>
              <Select onValueChange={setSelectedMethodId} value={selectedMethodId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {manualMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.method_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference #, Bank Details, Reason"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/10 rounded-lg mb-4">
             <input 
               type="checkbox" 
               id="confirm-receipt" 
               className="h-4 w-4 rounded border-success text-success focus:ring-success" 
               checked={isConfirmed}
               onChange={(e) => setIsConfirmed(e.target.checked)}
               required
             />
             <label htmlFor="confirm-receipt" className="text-[10px] font-bold text-success uppercase">
               I confirm this payment has been received and verified.
             </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button 
              className="gap-2" 
              onClick={handleRecordPayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Finalize Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

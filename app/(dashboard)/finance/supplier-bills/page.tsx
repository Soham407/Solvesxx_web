"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  MoreHorizontal,
  Plus,
  ArrowRightLeft,
  FileCheck2,
  AlertCircle,
  Loader2,
  DollarSign,
  ShieldAlert
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSupplierBills, BILL_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, SupplierBill } from "@/hooks/useSupplierBills";
import { useFinance } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/src/lib/utils/currency";
import { useReconciliation } from "@/hooks/useReconciliation";
import { toast } from "sonner";

export default function SupplierBillsPage() {
    const { userId, role } = useAuth();
  const { bills, isLoading: billsLoading, error, refresh: refreshBills } = useSupplierBills() as any;
  const { reconciliations, isLoading: reconLoading } = useReconciliation();
  const { methods, recordTransaction, validateBillForPayout, forceMatchBill } = useFinance() as any;

  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  
  // Payout State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Force Match State
  const [isForceMatchModalOpen, setIsForceMatchModalOpen] = useState(false);
  const [forceMatchReason, setForceMatchReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const isLoading = billsLoading || reconLoading;
  const manualMethods = methods.filter((method: any) => method.gateway === "manual");

  const openPayoutModal = async (bill: SupplierBill) => {
    setIsValidating(true);
    setSelectedBill(bill); // Set this first so the loader shows on the right row
    try {
      // 1. Validate Bill for Payout (Truth Engine Check)
      const validation = await validateBillForPayout(bill.id);
      
      if (!validation.success) {
        toast.error("Validation Error: " + validation.error);
        return;
      }

      if (!validation.canPay) {
        toast.error("HARD TRUTH GATE: Cannot Pay", {
          description: validation.reason || "Reconciliation match failed (3-Way Match mismatch).",
          duration: 5000
        });
        return;
      }

      // If valid, open modal
      setPayoutAmount((bill.due_amount || 0).toString());
      setIsPayoutModalOpen(true);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRecordPayout = async () => {
    if (!selectedBill) return;
    
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedMethodId) {
      toast.error("Please select a payout method");
      return;
    }

    if (!notes || notes.trim().length < 5) {
      toast.error("Please provide a meaningful reason/note (min 5 chars)");
      return;
    }

    if (!isConfirmed) {
      toast.error("Please confirm the transaction");
      return;
    }

    if (!userId) {
      toast.error("Security Error: No authenticated user ID found.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await recordTransaction({
        type: 'payout',
        referenceType: 'purchase_bill',
        referenceId: selectedBill.id,
        amount: amountNum,
        methodId: selectedMethodId,
        date: payoutDate,
        notes: notes,
        payerId: userId,
        payeeId: selectedBill.supplier_id || '',
      });

      if (success) {
        toast.success("Payout recorded successfully");
        setIsPayoutModalOpen(false);
        refreshBills();
      } else {
        toast.error("Failed to record payout");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceMatch = async () => {
    if (!selectedBill) return;

    if (!forceMatchReason || forceMatchReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forceMatchBill(selectedBill.id, forceMatchReason.trim());
      
      if (result.success) {
        toast.success("Bill force matched successfully.");
        setIsForceMatchModalOpen(false);
        refreshBills();
      } else {
        toast.error("Force Match Failed: " + result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<SupplierBill>[] = [
    {
      accessorKey: "supplier_name",
      header: "Supplier Hub",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.supplier_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">REF: {row.original.po_number || "N/A"} • {row.original.bill_number}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Bill Value",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{formatCurrency(row.original.total_amount || 0)}</span>,
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
      accessorKey: "status",
      header: "Audit Verification",
      cell: ({ row }) => {
          const status = row.original.status;
          const config = BILL_STATUS_CONFIG[status as keyof typeof BILL_STATUS_CONFIG] || { label: status, className: "" };
          return (
            <div className="flex items-center gap-2">
                <FileCheck2 className={cn(
                    "h-3.5 w-3.5",
                    status === "approved" ? "text-success" : status === "disputed" ? "text-critical" : "text-warning"
                )} />
                <span className="text-[10px] font-bold uppercase ">{config.label}</span>
            </div>
          );
      },
    },
    {
      accessorKey: "payment_status",
      header: "Payout Truth",
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
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isValidating && selectedBill?.id === row.original.id}>
              {isValidating && selectedBill?.id === row.original.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Payout Controls</DropdownMenuLabel>
            <DropdownMenuItem 
              className="gap-2 font-bold text-primary"
              disabled={row.original.status !== 'approved' || row.original.payment_status === 'paid'}
              onClick={() => {
                setSelectedBill(row.original);
                openPayoutModal(row.original);
              }}
            >
               <DollarSign className="h-4 w-4" /> Record Payout
            </DropdownMenuItem>
            
            {(role === 'company_md' || role === 'account') && (
              <DropdownMenuItem 
                className="gap-2 font-bold text-critical"
                onClick={() => {
                  setSelectedBill(row.original);
                  setForceMatchReason("");
                  setIsForceMatchModalOpen(true);
                }}
              >
                 <ShieldAlert className="h-4 w-4" /> Force Match (Admin)
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
               <Link href="/finance/reconciliation">
                  <ArrowRightLeft className="h-4 w-4" /> Reconcile Match
               </Link>
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
        <p className="text-sm text-muted-foreground animate-pulse">Loading billing data...</p>
      </div>
    );
  }

  const displayBills = bills || [];


  // Calculate summary stats
  const accountsPayable = displayBills.reduce((acc: number, bill: SupplierBill) => acc + (bill.due_amount || 0), 0);
  const approvedPayouts = displayBills
    .filter((b: SupplierBill) => b.status === "approved")
    .reduce((acc: number, bill: SupplierBill) => acc + (bill.total_amount || 0), 0);
  const pendingVerification = displayBills
    .filter((b: SupplierBill) => b.status === "submitted" || b.status === "draft")
    .length;

    const auditDiscrepancies = Array.isArray(reconciliations) ? reconciliations.filter(r => r.status === "discrepancy").length : 0;

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Supplier Payout Registry"
        description="Verify, reconcile and approve vendor invoices against Purchase Orders and Receipt Notes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
               <Link href="/finance/reconciliation">
                  <ArrowRightLeft className="h-4 w-4" /> Reconciliation Sheet
               </Link>
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> New Bill Intake
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Accounts Payable", value: formatCurrency(accountsPayable), icon: Wallet, color: "text-primary", sub: "Total current liability" },
          { label: "Approved Payouts", value: formatCurrency(approvedPayouts), icon: CheckCircle2, color: "text-success", sub: "Scheduled for payment" },
          { label: "Pending Verification", value: pendingVerification.toString(), icon: Clock, color: "text-warning", sub: `${pendingVerification} bills in queue` },
          { label: "Audit Discrepancies", value: auditDiscrepancies.toString(), icon: AlertCircle, color: "text-critical", sub: "Price/Qty mismatch" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
               <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className={cn("h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
                    </div>
                </div>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-premium overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Billing Registry</CardTitle>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-success/5 text-success border-success/20">Active Cycle</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            {error && (
              <div className="border-b border-critical/10 bg-critical/5 px-6 py-3 text-xs font-medium text-critical">
                Live supplier bills could not be loaded. Mock rows are disabled to avoid invalid payouts.
              </div>
            )}
            <DataTable columns={columns} data={displayBills} searchKey="supplier_name" />
        </CardContent>
      </Card>

      {/* Payout Recording Dialog */}
      <Dialog open={isPayoutModalOpen} onOpenChange={(open) => {
        setIsPayoutModalOpen(open);
        if (!open) {
          setPayoutAmount("");
          setSelectedMethodId("");
          setNotes("");
          setIsConfirmed(false);
          setSelectedBill(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Record Supplier Payout
            </DialogTitle>
            <DialogDescription>
              Record a manual payout for Bill <strong>{selectedBill?.bill_number}</strong>. This will settle the liability.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
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
                  {manualMethods.map((m: any) => (
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
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Justification</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for payout / Bill reference"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-critical/5 border border-critical/10 rounded-lg mb-4">
             <input 
               type="checkbox" 
               id="confirm-payout" 
               className="h-4 w-4 rounded border-critical text-critical focus:ring-critical" 
               checked={isConfirmed}
               onChange={(e) => setIsConfirmed(e.target.checked)}
               required
             />
             <label htmlFor="confirm-payout" className="text-[10px] font-bold text-critical uppercase">
               I confirm this payout is valid and authorized. This action is irreversible.
             </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayoutModalOpen(false)}>Cancel</Button>
            <Button 
              className="gap-2" 
              onClick={handleRecordPayout}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Dispatch Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Match Dialog */}
      <Dialog open={isForceMatchModalOpen} onOpenChange={setIsForceMatchModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-critical">
              <ShieldAlert className="h-5 w-5" />
              Force Match Bill (Admin Override)
            </DialogTitle>
            <DialogDescription className="text-critical/80 font-medium">
              You are about to override a 3-Way Match validation failure. This action will be logged in the permanent audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="force-reason" className="text-xs font-bold uppercase">Mandatory Override Reason</Label>
              <Textarea
                id="force-reason"
                value={forceMatchReason}
                onChange={(e) => setForceMatchReason(e.target.value)}
                placeholder="Explain why this mismatch is being overridden (min 10 chars)..."
                className="min-h-[100px] border-critical/30 focus:border-critical focus:ring-critical"
              />
              <p className="text-[10px] text-muted-foreground">
                This will be visible to Finance Auditors.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsForceMatchModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              className="gap-2" 
              onClick={handleForceMatch}
              disabled={isSubmitting || forceMatchReason.length < 10}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

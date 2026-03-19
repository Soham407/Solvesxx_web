"use client";

import { useSupplierPortal } from "@/hooks/useSupplierPortal";
import { useSupplierBills } from "@/hooks/useSupplierBills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, FileText, Upload, Receipt } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function NewSupplierBillPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { pos, bills, submitBill, isLoading } = useSupplierPortal();
  const { uploadBillDocument, generateBillNumber } = useSupplierBills();

  const [selectedPoId, setSelectedPoId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Only show POs that are dispatched or received AND not already billed
  const eligiblePOs = useMemo(() => {
    const billedPOIds = new Set((bills || []).map(b => b.purchase_order_id).filter(Boolean));
    return pos.filter(p => ['dispatched', 'received'].includes(p.status) && !billedPOIds.has(p.id));
  }, [pos, bills]);

  const selectedPO = useMemo(() => {
    return pos.find(p => p.id === selectedPoId);
  }, [selectedPoId, pos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId || !invoiceNumber) return;

    try {
      setIsSubmitting(true);

      // Generate bill number via hook (no inline Supabase in pages)
      const billNumber = await generateBillNumber();

      const billData = {
        purchase_order_id: selectedPoId,
        supplier_invoice_number: invoiceNumber,
        bill_date: invoiceDate,
        total_amount: selectedPO?.grand_total || 0,
        subtotal: selectedPO?.subtotal || 0,
        tax_amount: selectedPO?.tax_amount || 0,
        discount_amount: selectedPO?.discount_amount || 0,
        notes: notes,
        supplier_id: selectedPO?.supplier_id,
        bill_number: billNumber
      };

      const result = await submitBill(billData);
      const success = result?.success ?? false;
      const newBillId = result?.billId;

      if (success) {
        // Upload document if provided
        if (uploadedFile && selectedPO?.supplier_id && newBillId) {
          setIsUploading(true);
          try {
            const uploaded = await uploadBillDocument(newBillId, selectedPO.supplier_id, uploadedFile);
            if (!uploaded) {
              toast({ title: "Bill submitted", description: "Bill submitted but document upload failed. Please re-upload from the bills list.", variant: "default" });
            }
          } finally {
            setIsUploading(false);
          }
        }

        toast({ title: "Bill Submitted", description: "Your invoice has been received and is under review." });
        router.push("/supplier/bills");
      }
    } catch (err) {
      toast({ title: "Submission Failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/supplier/bills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit Invoice</h1>
          <p className="text-muted-foreground">Attach your invoice details for finalized shipments.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>PO Selection</CardTitle>
            <CardDescription>Select the purchase order you are billing for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="po">Reference Purchase Order</Label>
              <Select value={selectedPoId} onValueChange={setSelectedPoId} required>
                <SelectTrigger id="po">
                  <SelectValue placeholder="Choose a dispatched PO" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} ({formatCurrency(po.grand_total)})
                    </SelectItem>
                  ))}
                  {eligiblePOs.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground italic">No dispatched POs available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPO && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2 border border-dashed border-muted-foreground/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Date:</span>
                  <span>{new Date(selectedPO.po_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Amount:</span>
                  <span className="font-bold">{formatCurrency(selectedPO.grand_total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Your business's formal invoice information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-num">Your Invoice #</Label>
                <Input
                  id="inv-num"
                  placeholder="e.g., INV-001"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-date">Invoice Date</Label>
                <Input
                  id="inv-date"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bill-doc">Attach Invoice Document</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors relative">
                <input
                  id="bill-doc"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                {uploadedFile ? (
                  <>
                    <span className="text-sm font-medium text-primary">{uploadedFile.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground font-medium">Click to upload PDF or Photo</span>
                    <span className="text-xs text-muted-foreground mt-1">Maximum file size: 5MB</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes to Accounts</Label>
              <Textarea
                id="notes"
                placeholder="Payment instructions, bank details, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/supplier/bills">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="gap-2" disabled={isSubmitting || isUploading || !selectedPoId}>
            {isUploading ? "Uploading document..." : isSubmitting ? "Submitting..." : (
              <>
                <Send className="h-4 w-4" /> Submit for Review
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

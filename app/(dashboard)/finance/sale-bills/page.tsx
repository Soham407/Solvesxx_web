"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, FileText, CheckCircle2, Loader2, Download, Filter, Search } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaleBills, SaleBill, PAYMENT_STATUS_CONFIG } from "@/hooks/useSaleBills";
import { useSaleProductRates } from "@/hooks/useSaleProductRates";
import { formatCurrency } from "@/src/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";

export default function SaleBillsPage() {
  const { bills, isLoading, createBill, markPaid } = useSaleBills();
  const { getSaleRate } = useSaleProductRates();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<any[]>([{ type: "service", id: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);

  // Data for Selects
  const [societies, setSocieties] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const loadFormData = async () => {
    const [socRes, reqRes, serRes, proRes] = await Promise.all([
      supabase.from("societies").select("id, society_name"),
      supabase.from("requests").select("id, request_number, title").eq("status", "accepted"),
      supabase.from("services").select("id, service_name"),
      supabase.from("products").select("id, product_name"),
    ]);

    if (socRes.data) setSocieties(socRes.data);
    if (reqRes.data) setRequests(reqRes.data);
    if (serRes.data) setServices(serRes.data);
    if (proRes.data) setProducts(proRes.data);
  };

  const handleItemChange = async (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // If type or id changed, try to fetch the rate
    if (field === "id" || field === "type") {
      const item = newItems[index];
      if (item.id && item.type === "product") {
        const rateData = await getSaleRate(item.id, selectedClientId || null);
        if (rateData) {
          newItems[index].unit_price = rateData.rate;
          newItems[index].tax_rate = rateData.gst_percentage || 18;
        }
      }
    }
    
    setItems(newItems);
  };

  const handleCreateBill = async () => {
    if (!selectedClientId) {
      toast.error("Please select a buyer");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createBill({
        client_id: selectedClientId,
        request_id: selectedRequestId && selectedRequestId !== "none" ? selectedRequestId : undefined,
        due_date: dueDate || undefined,
        items: items.map(item => ({
            service_id: item.type === "service" ? item.id : undefined,
            product_id: item.type === "product" ? item.id : undefined,
            item_description: item.type === "service" 
              ? services.find(s => s.id === item.id)?.service_name 
              : products.find(p => p.id === item.id)?.product_name,
            unit_price: parseFloat(item.unit_price) || 0,
            quantity: parseFloat(item.quantity) || 0,
            tax_rate: parseFloat(item.tax_rate) || 0
        }))
      });

      if (success) {
        toast.success("Sale Bill generated successfully");
        setIsCreateModalOpen(false);
        // Reset form
        setSelectedClientId("");
        setSelectedRequestId("");
        setDueDate("");
        setItems([{ type: "service", id: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<SaleBill>[] = [
    {
      accessorKey: "invoice_number",
      header: "Bill Number",
      cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.original.invoice_number}</span>,
    },
    {
      accessorKey: "client_name",
      header: "Buyer Name",
      cell: ({ row }) => <span className="font-semibold">{row.original.client_name}</span>,
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.total_amount)}</span>,
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => {
        const config = PAYMENT_STATUS_CONFIG[row.original.payment_status] || { label: row.original.payment_status, className: "" };
        return (
          <Badge className={config.className}>
            {config.label.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => row.original.due_date ? format(new Date(row.original.due_date), "MMM d, yyyy") : "N/A",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              disabled={row.original.payment_status === "paid"}
              onClick={() => markPaid(row.original.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Paid
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FileText className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sale Bills</h1>
          <p className="text-muted-foreground">Generate and manage invoices for buyers.</p>
        </div>
        <Button 
          onClick={() => {
            loadFormData();
            setIsCreateModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Generate Bill
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Receivables</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(bills.reduce((sum, b) => sum + b.due_amount, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid This Month</CardDescription>
            <CardTitle className="text-2xl text-success">
              {formatCurrency(bills.filter(b => b.payment_status === "paid").reduce((sum, b) => sum + b.paid_amount, 0))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue Bills</CardDescription>
            <CardTitle className="text-2xl text-critical">
              {bills.filter(b => b.payment_status === "overdue").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <DataTable columns={columns} data={bills} searchKey="client_name" />

      {/* Generate Bill Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Generate New Sale Bill</DialogTitle>
            <DialogDescription>
              Create a new invoice for a buyer. Link it to an accepted request if applicable.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer / Society</Label>
                <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {societies.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.society_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Request (Optional)</Label>
                <Select onValueChange={setSelectedRequestId} value={selectedRequestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {requests.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.request_number} - {r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setItems([...items, { type: "service", id: "", quantity: 1, unit_price: 0, tax_rate: 18 }])}
                >
                  Add Item
                </Button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select 
                        value={item.type}
                        onValueChange={(val) => handleItemChange(index, "type", val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Item</Label>
                      <Select 
                        value={item.id}
                        onValueChange={(val) => handleItemChange(index, "id", val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {item.type === "service" ? (
                            services.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.service_name}</SelectItem>
                            ))
                          ) : (
                            products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input 
                        type="number" 
                        className="h-8" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Rate (Paise)</Label>
                      <Input 
                        type="number" 
                        className="h-8" 
                        value={item.unit_price} 
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">GST %</Label>
                      <Input 
                        type="number" 
                        className="h-8" 
                        value={item.tax_rate} 
                        onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-critical h-8 w-8 p-0"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBill} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

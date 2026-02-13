"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Banknote, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal, 
  FileCheck,
  Loader2,
  RefreshCw,
  Search,
  Edit,
  XCircle,
  CalendarDays,
  Percent,
  AlertTriangle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSupplierRates } from "@/hooks/useSupplierRates";
import { useSupplierProducts } from "@/hooks/useSupplierProducts";
import { 
  SupplierRateDisplay,
  CreateSupplierRateForm,
} from "@/src/types/phaseD";
import { RATE_DEFAULTS } from "@/src/lib/constants";

export default function SupplierRatesPage() {
  const {
    rates,
    totalCount,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    createRate,
    updateRate,
    deactivateRate,
    getRatesExpiringSoon,
  } = useSupplierRates();

  const { mappings: supplierProducts } = useSupplierProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SupplierRateDisplay | null>(null);
  const [expiringSoonRates, setExpiringSoonRates] = useState<SupplierRateDisplay[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierRateForm>({
    supplier_product_id: "",
    rate: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: undefined,
    discount_percentage: 0,
    gst_percentage: RATE_DEFAULTS.GST_PERCENTAGE,
    min_qty_for_price: 1,
    notes: "",
  });

  // Fetch rates expiring soon on load
  useEffect(() => {
    const fetchExpiring = async () => {
      const expiring = await getRatesExpiringSoon(30);
      setExpiringSoonRates(expiring);
    };
    fetchExpiring();
  }, [getRatesExpiringSoon, rates]);

  // Calculate stats
  const stats = {
    totalRates: rates.length,
    activeRates: rates.filter(r => r.is_active !== false).length,
    expiringSoon: expiringSoonRates.length,
    avgDiscount: rates.length > 0 
      ? (rates.reduce((sum, r) => sum + (r.discount_percentage || 0), 0) / rates.length).toFixed(1)
      : "0",
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle search (filter by product/supplier name in frontend since we join)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, search is client-side
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier_product_id: "",
      rate: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: undefined,
      discount_percentage: 0,
      gst_percentage: RATE_DEFAULTS.GST_PERCENTAGE,
      min_qty_for_price: 1,
      notes: "",
    });
  };

  // Handle create rate
  const handleCreateRate = async () => {
    if (!formData.supplier_product_id || formData.rate <= 0) return;
    
    setIsSubmitting(true);
    const result = await createRate(formData);
    setIsSubmitting(false);
    
    if (result.success) {
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  // Handle update rate
  const handleUpdateRate = async () => {
    if (!selectedRate) return;
    
    setIsSubmitting(true);
    const result = await updateRate(selectedRate.id, {
      rate: formData.rate,
      discount_percentage: formData.discount_percentage,
      gst_percentage: formData.gst_percentage,
      min_qty_for_price: formData.min_qty_for_price,
      notes: formData.notes,
    });
    setIsSubmitting(false);
    
    if (result.success) {
      setEditDialogOpen(false);
      setSelectedRate(null);
      resetForm();
    }
  };

  // Handle deactivate rate
  const handleDeactivateRate = async (rate: SupplierRateDisplay) => {
    await deactivateRate(rate.id);
  };

  // Open edit dialog
  const openEditDialog = (rate: SupplierRateDisplay) => {
    setSelectedRate(rate);
    setFormData({
      supplier_product_id: rate.supplier_product_id || "",
      rate: rate.rate,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to || undefined,
      discount_percentage: rate.discount_percentage || 0,
      gst_percentage: rate.gst_percentage || RATE_DEFAULTS.GST_PERCENTAGE,
      min_qty_for_price: rate.min_qty_for_price || 1,
      notes: rate.notes || "",
    });
    setEditDialogOpen(true);
  };

  // Filter rates based on search term
  const filteredRates = searchTerm 
    ? rates.filter(r => 
        r.product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplier?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : rates;

  // Table columns
  const columns: ColumnDef<SupplierRateDisplay>[] = [
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm">{row.original.product?.product_name || "Unknown"}</span>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">
            {row.original.product?.product_code || "-"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground/80">
          {row.original.supplier?.supplier_name || "Unknown"}
        </span>
      ),
    },
    {
      accessorKey: "rate",
      header: "Base Rate",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Banknote className="h-3.5 w-3.5 text-success/50" />
          <span className="text-sm font-bold text-primary">{formatCurrency(row.original.rate)}</span>
          <span className="text-[10px] text-muted-foreground font-medium">
            / {row.original.product?.unit || "unit"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "discount_percentage",
      header: "Discount",
      cell: ({ row }) => {
        const discount = row.original.discount_percentage || 0;
        return (
          <div className="flex items-center gap-1">
            {discount > 0 ? (
              <>
                <ArrowDownRight className="h-3.5 w-3.5 text-success" />
                <span className="text-sm font-bold text-success">{discount}%</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "netRate",
      header: "Net Rate",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold">{formatCurrency(row.original.netRate)}</span>
          <span className="text-[10px] text-muted-foreground">
            +{row.original.gst_percentage || 18}% GST = {formatCurrency(row.original.rateWithGst)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "effective_from",
      header: "Effective Period",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">
            {formatDate(row.original.effective_from)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            to {row.original.effective_to ? formatDate(row.original.effective_to) : "Ongoing"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active !== false;
        const effectiveTo = row.original.effective_to;
        const isExpiringSoon = effectiveTo && new Date(effectiveTo) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "font-bold text-[10px] uppercase h-5",
                isActive 
                  ? "bg-success/10 text-success border-success/20" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Active" : "Expired"}
            </Badge>
            {isActive && isExpiringSoon && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px] h-5">
                Expiring Soon
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const rate = row.original;
        const isActive = rate.is_active !== false;
        
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <History className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => openEditDialog(rate)} className="gap-2">
                  <Edit className="h-3.5 w-3.5" /> Edit Rate
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <History className="h-3.5 w-3.5" /> View History
                </DropdownMenuItem>
                
                {isActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeactivateRate(rate)} 
                      className="gap-2 text-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Deactivate Rate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <PageHeader
        title="Purchase Rate Repository"
        description="Negotiated procurement costs and long-term contracts for each product per supplier."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" /> Price Audit
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Add Rate
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{stats.activeRates}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Rates</span>
            </div>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-success">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-success">{stats.avgDiscount}%</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Avg Discount</span>
            </div>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-warning">{stats.expiringSoon}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expiring Soon</span>
            </div>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-info">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-info">{stats.totalRates}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Records</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select 
          value={filters.is_active === undefined ? "all" : filters.is_active.toString()} 
          onValueChange={(val) => setFilters({ 
            ...filters, 
            is_active: val === "all" ? undefined : val === "true" 
          })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rates</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Expired Only</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Rates Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" /> Supplier Rate Cards
          </CardTitle>
          <CardDescription>
            {filteredRates.length} rates found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {filteredRates.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No supplier rates found</CardDescription>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add First Rate
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredRates} searchKey="rate" />
          )}
        </CardContent>
      </Card>

      {/* Create Rate Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Rate</DialogTitle>
            <DialogDescription>
              Create a new purchase rate for a supplier-product combination. Previous active rates will be automatically expired.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_product_id">Supplier-Product *</Label>
              <Select 
                value={formData.supplier_product_id} 
                onValueChange={(val) => setFormData({ ...formData, supplier_product_id: val })}
              >
                <SelectTrigger id="supplier_product_id">
                  <SelectValue placeholder="Select supplier-product mapping" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {supplierProducts.filter(sp => sp.is_active !== false).map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.product?.product_name} - {sp.supplier?.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Base Rate (₹) *</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount %</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_percentage">GST %</Label>
                <Input
                  id="gst_percentage"
                  type="number"
                  min="0"
                  max="28"
                  step="0.5"
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) || 18 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_qty_for_price">Min Qty for Price</Label>
                <Input
                  id="min_qty_for_price"
                  type="number"
                  min="1"
                  value={formData.min_qty_for_price}
                  onChange={(e) => setFormData({ ...formData, min_qty_for_price: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effective_to">Effective To (Optional)</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to || ""}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value || undefined })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this rate..."
                rows={2}
              />
            </div>

            {/* Rate Preview */}
            {formData.rate > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Rate Preview</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Base</div>
                    <div className="font-bold">{formatCurrency(formData.rate)}</div>
                  </div>
                  <ArrowDownRight className="h-4 w-4 text-success" />
                  <div>
                    <div className="text-sm text-muted-foreground">After Discount</div>
                    <div className="font-bold">
                      {formatCurrency(formData.rate * (1 - (formData.discount_percentage || 0) / 100))}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-warning" />
                  <div>
                    <div className="text-sm text-muted-foreground">With GST</div>
                    <div className="font-bold text-primary">
                      {formatCurrency(
                        formData.rate * 
                        (1 - (formData.discount_percentage || 0) / 100) * 
                        (1 + (formData.gst_percentage || 18) / 100)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRate} 
              disabled={isSubmitting || !formData.supplier_product_id || formData.rate <= 0}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rate</DialogTitle>
            <DialogDescription>
              Update rate details. Note: Changes to rate or discount will be reflected immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedRate && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{selectedRate.product?.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  from {selectedRate.supplier?.supplier_name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_rate">Base Rate (₹)</Label>
                <Input
                  id="edit_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_discount_percentage">Discount %</Label>
                <Input
                  id="edit_discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_gst_percentage">GST %</Label>
                <Input
                  id="edit_gst_percentage"
                  type="number"
                  min="0"
                  max="28"
                  step="0.5"
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) || 18 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_min_qty_for_price">Min Qty for Price</Label>
                <Input
                  id="edit_min_qty_for_price"
                  type="number"
                  min="1"
                  value={formData.min_qty_for_price}
                  onChange={(e) => setFormData({ ...formData, min_qty_for_price: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedRate(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

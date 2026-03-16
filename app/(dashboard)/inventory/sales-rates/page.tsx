"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Percent, 
  TrendingUp, 
  DollarSign, 
  MoreHorizontal, 
  Settings2, 
  BarChart4,
  Loader2,
  RefreshCw,
  Search,
  Edit,
  XCircle,
  Building2,
  Globe,
  Banknote,
  ArrowUpRight
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
import { useSaleProductRates } from "@/hooks/useSaleProductRates";
import { useProducts } from "@/hooks/useProducts";
import { useSocieties } from "@/hooks/useSocieties";
import { 
  SaleProductRateDisplay,
  CreateSaleProductRateForm,
} from "@/src/types/supply-chain";
import { RATE_DEFAULTS } from "@/src/lib/constants";

export default function SalesRatesPage() {
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
    calculateMargin,
  } = useSaleProductRates();

  const { products } = useProducts();
  const { societies, isLoading: societiesLoading } = useSocieties();

  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SaleProductRateDisplay | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSaleProductRateForm>({
    product_id: "",
    society_id: null,
    rate: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: undefined,
    gst_percentage: RATE_DEFAULTS.GST_PERCENTAGE,
    margin_percentage: undefined,
    base_cost: undefined,
    notes: "",
  });

  // Calculate stats
  const stats = {
    totalRates: rates.length,
    globalRates: rates.filter(r => !r.society_id).length,
    societyRates: rates.filter(r => r.society_id).length,
    avgMargin: rates.length > 0 
      ? (rates.reduce((sum, r) => sum + (r.margin_percentage || 0), 0) / rates.length).toFixed(1)
      : "0",
    highMarginCount: rates.filter(r => (r.margin_percentage || 0) >= 35).length,
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

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side search for now
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      product_id: "",
      society_id: null,
      rate: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: undefined,
      gst_percentage: RATE_DEFAULTS.GST_PERCENTAGE,
      margin_percentage: undefined,
      base_cost: undefined,
      notes: "",
    });
  };

  // Handle create rate
  const handleCreateRate = async () => {
    if (!formData.product_id || formData.rate <= 0) return;
    
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
      gst_percentage: formData.gst_percentage,
      margin_percentage: formData.margin_percentage,
      base_cost: formData.base_cost,
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
  const handleDeactivateRate = async (rate: SaleProductRateDisplay) => {
    await deactivateRate(rate.id);
  };

  // Open edit dialog
  const openEditDialog = (rate: SaleProductRateDisplay) => {
    setSelectedRate(rate);
    setFormData({
      product_id: rate.product_id || "",
      society_id: rate.society_id || null,
      rate: rate.rate,
      effective_from: rate.effective_from,
      effective_to: rate.effective_to || undefined,
      gst_percentage: rate.gst_percentage || RATE_DEFAULTS.GST_PERCENTAGE,
      margin_percentage: rate.margin_percentage || undefined,
      base_cost: rate.base_cost || undefined,
      notes: rate.notes || "",
    });
    setEditDialogOpen(true);
  };

  // Auto-calculate margin when cost and rate change
  useEffect(() => {
    if (formData.base_cost && formData.rate > 0) {
      const { marginPercentage } = calculateMargin(formData.rate, formData.base_cost);
      setFormData(prev => ({ ...prev, margin_percentage: marginPercentage }));
    }
  }, [formData.base_cost, formData.rate, calculateMargin]);

  // Filter rates based on search term
  const filteredRates = searchTerm 
    ? rates.filter(r => 
        r.product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.society?.society_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : rates;

  // Table columns
  const columns: ColumnDef<SaleProductRateDisplay>[] = [
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
      accessorKey: "society",
      header: "Scope",
      cell: ({ row }) => {
        const society = row.original.society;
        return society ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-info" />
            <span className="text-sm font-medium">{society.society_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <Badge variant="outline" className="text-[10px]">Global Rate</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "base_cost",
      header: "Cost",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrency(row.original.base_cost)}
        </span>
      ),
    },
    {
      accessorKey: "rate",
      header: "Sale Price",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-primary">{formatCurrency(row.original.rate)}</span>
          <span className="text-[10px] text-muted-foreground">
            +{row.original.gst_percentage || 18}% GST = {formatCurrency(row.original.rateWithGst)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "marginAmount",
      header: "Margin",
      cell: ({ row }) => {
        const marginPct = row.original.margin_percentage || 0;
        const marginAmt = row.original.marginAmount;
        const isHighMargin = marginPct >= 35;
        
        return (
          <div className="flex items-center gap-2">
            {marginAmt !== undefined ? (
              <>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-bold",
                    isHighMargin 
                      ? "bg-success/10 text-success border-success/20" 
                      : "bg-muted"
                  )}
                >
                  {formatCurrency(marginAmt)}
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground">
                  ({marginPct.toFixed(1)}%)
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active !== false;
        return (
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
              <Settings2 className="h-4 w-4" />
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
        title="Sale Product Rates"
        description="Revenue control and margin management across the centralized product catalog."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Percent className="h-4 w-4" /> Global Markup
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Add Rate Record
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-primary">{stats.avgMargin}%</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Avg Profit Margin</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary/40">
              <BarChart4 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed">
            <span className="text-[10px] font-medium text-muted-foreground">Projected across catalog</span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-success">{stats.highMarginCount}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">High Margin Items</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/5 flex items-center justify-center text-success/40">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed">
            <span className="text-[10px] font-medium text-muted-foreground">Above 35% target</span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold">{stats.globalRates}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Global Rates</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/40">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed">
            <span className="text-[10px] font-medium text-muted-foreground">Default pricing</span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold text-info">{stats.societyRates}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Society Rates</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-info/5 flex items-center justify-center text-info/40">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dashed">
            <span className="text-[10px] font-medium text-muted-foreground">Custom pricing</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product or society..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select 
          value={filters.society_id === null ? "global" : filters.society_id || "all"} 
          onValueChange={(val) => setFilters({ 
            ...filters, 
            society_id: val === "all" ? undefined : val === "global" ? null : val 
          })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rates</SelectItem>
            <SelectItem value="global">Global Only</SelectItem>
            {societies.map((soc) => (
              <SelectItem key={soc.id} value={soc.id}>
                {soc.society_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectItem value="all">All Status</SelectItem>
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
            <Banknote className="h-4 w-4 text-primary" /> Sale Rate Cards
          </CardTitle>
          <CardDescription>
            {filteredRates.length} rates found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {filteredRates.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No sale rates found</CardDescription>
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
            <DialogTitle>Add Sale Rate</DialogTitle>
            <DialogDescription>
              Create a new sale rate. Leave society empty for a global rate that applies to all societies.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product_id">Product *</Label>
              <Select 
                value={formData.product_id} 
                onValueChange={(val) => setFormData({ ...formData, product_id: val })}
              >
                <SelectTrigger id="product_id">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {products.filter(p => p.status === 'active').map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_name} ({product.product_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="society_id">Society (Optional - leave empty for global rate)</Label>
              <Select 
                value={formData.society_id || "global"} 
                onValueChange={(val) => setFormData({ ...formData, society_id: val === "global" ? null : val })}
              >
                <SelectTrigger id="society_id">
                  <SelectValue placeholder="Global rate (all societies)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global Rate (All Societies)</SelectItem>
                  {societies.map((soc) => (
                    <SelectItem key={soc.id} value={soc.id}>
                      {soc.society_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_cost">Base Cost (₹)</Label>
                <Input
                  id="base_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_cost || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    base_cost: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Sale Rate (₹) *</Label>
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
                <Label htmlFor="margin_percentage">Margin % (auto-calculated)</Label>
                <Input
                  id="margin_percentage"
                  type="number"
                  value={formData.margin_percentage?.toFixed(1) || ""}
                  readOnly
                  className="bg-muted"
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
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            {/* Rate Preview */}
            {formData.rate > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-2">Rate Preview</div>
                <div className="flex items-center gap-4">
                  {formData.base_cost && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Cost</div>
                        <div className="font-medium">{formatCurrency(formData.base_cost)}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    </>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Sale</div>
                    <div className="font-bold">{formatCurrency(formData.rate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">With GST</div>
                    <div className="font-bold text-primary">
                      {formatCurrency(formData.rate * (1 + (formData.gst_percentage || 18) / 100))}
                    </div>
                  </div>
                  {formData.margin_percentage !== undefined && (
                    <div>
                      <div className="text-sm text-muted-foreground">Margin</div>
                      <div className={cn(
                        "font-bold",
                        formData.margin_percentage >= 35 ? "text-success" : "text-warning"
                      )}>
                        {formData.margin_percentage.toFixed(1)}%
                      </div>
                    </div>
                  )}
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
              disabled={isSubmitting || !formData.product_id || formData.rate <= 0}
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
            <DialogTitle>Edit Sale Rate</DialogTitle>
            <DialogDescription>
              Update rate details. Note: Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedRate && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{selectedRate.product?.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedRate.society ? selectedRate.society.society_name : "Global Rate"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_base_cost">Base Cost (₹)</Label>
                <Input
                  id="edit_base_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_cost || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    base_cost: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_rate">Sale Rate (₹)</Label>
                <Input
                  id="edit_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
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
                <Label htmlFor="edit_margin_percentage">Margin %</Label>
                <Input
                  id="edit_margin_percentage"
                  type="number"
                  value={formData.margin_percentage?.toFixed(1) || ""}
                  readOnly
                  className="bg-muted"
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

"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Building2, 
  Package, 
  Link2, 
  MoreHorizontal, 
  ArrowRightLeft, 
  ShieldCheck,
  Star,
  Loader2,
  RefreshCw,
  Clock,
  Hash,
  Trash2,
  Edit,
  Search,
  StarOff
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { useSupplierProducts } from "@/hooks/useSupplierProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { 
  SupplierProductDisplay,
  CreateSupplierProductForm,
} from "@/src/types/phaseD";

export default function SupplierProductsPage() {
  const {
    mappings,
    totalCount,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    linkProduct,
    unlinkProduct,
    updateMapping,
    setPreferred,
    removePreferred,
    toggleActive,
  } = useSupplierProducts();

  const { suppliers } = useSuppliers();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<SupplierProductDisplay | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierProductForm>({
    supplier_id: "",
    product_id: "",
    supplier_sku: "",
    lead_time_days: 7,
    min_order_quantity: 1,
    max_order_quantity: undefined,
    is_preferred: false,
    preference_rank: 0,
    pack_size: "",
    case_size: undefined,
  });

  // Calculate stats
  const stats = {
    totalMappings: mappings.length,
    preferredLinks: mappings.filter(m => m.is_preferred).length,
    activeMappings: mappings.filter(m => m.is_active !== false).length,
    uniqueProducts: new Set(mappings.map(m => m.product_id)).size,
    uniqueSuppliers: new Set(mappings.map(m => m.supplier_id)).size,
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, searchTerm });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier_id: "",
      product_id: "",
      supplier_sku: "",
      lead_time_days: 7,
      min_order_quantity: 1,
      max_order_quantity: undefined,
      is_preferred: false,
      preference_rank: 0,
      pack_size: "",
      case_size: undefined,
    });
  };

  // Handle create mapping
  const handleCreateMapping = async () => {
    if (!formData.supplier_id || !formData.product_id) return;
    
    setIsSubmitting(true);
    const result = await linkProduct(formData);
    setIsSubmitting(false);
    
    if (result.success) {
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  // Handle update mapping
  const handleUpdateMapping = async () => {
    if (!selectedMapping) return;
    
    setIsSubmitting(true);
    const result = await updateMapping(selectedMapping.id, {
      supplier_sku: formData.supplier_sku,
      lead_time_days: formData.lead_time_days,
      min_order_quantity: formData.min_order_quantity,
      max_order_quantity: formData.max_order_quantity,
      pack_size: formData.pack_size,
      case_size: formData.case_size,
    });
    setIsSubmitting(false);
    
    if (result.success) {
      setEditDialogOpen(false);
      setSelectedMapping(null);
      resetForm();
    }
  };

  // Handle delete mapping
  const handleDeleteMapping = async () => {
    if (!selectedMapping) return;
    
    setIsSubmitting(true);
    const result = await unlinkProduct(selectedMapping.id);
    setIsSubmitting(false);
    
    if (result.success) {
      setDeleteDialogOpen(false);
      setSelectedMapping(null);
    }
  };

  // Handle set preferred
  const handleSetPreferred = async (mapping: SupplierProductDisplay) => {
    if (!mapping.product_id || !mapping.supplier_id) return;
    await setPreferred(mapping.product_id, mapping.supplier_id, 1);
  };

  // Handle remove preferred
  const handleRemovePreferred = async (mapping: SupplierProductDisplay) => {
    await removePreferred(mapping.id);
  };

  // Open edit dialog
  const openEditDialog = (mapping: SupplierProductDisplay) => {
    setSelectedMapping(mapping);
    setFormData({
      supplier_id: mapping.supplier_id || "",
      product_id: mapping.product_id || "",
      supplier_sku: mapping.supplier_sku || "",
      lead_time_days: mapping.lead_time_days || 7,
      min_order_quantity: mapping.min_order_quantity || 1,
      max_order_quantity: mapping.max_order_quantity || undefined,
      is_preferred: mapping.is_preferred || false,
      preference_rank: mapping.preference_rank || 0,
      pack_size: mapping.pack_size || "",
      case_size: mapping.case_size || undefined,
    });
    setEditDialogOpen(true);
  };

  // Table columns
  const columns: ColumnDef<SupplierProductDisplay>[] = [
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.supplier?.supplier_name || "Unknown"}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              {row.original.supplier?.supplier_code || (row.original.supplier_id ? `SUP-${row.original.supplier_id.slice(0, 8)}` : "N/A")}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.product?.product_name || "Unknown"}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">
                {row.original.product?.product_code || (row.original.product_id ? `PRD-${row.original.product_id.slice(0, 8)}` : "N/A")}
              </span>
              {row.original.supplier_sku && (
                <Badge variant="outline" className="h-4 px-1.5 py-0 text-[8px] uppercase font-mono">
                  SKU: {row.original.supplier_sku}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "lead_time_days",
      header: "Lead Time",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.original.lead_time_days || 7} days</span>
        </div>
      ),
    },
    {
      accessorKey: "min_order_quantity",
      header: "MOQ",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.original.min_order_quantity || 1}</span>
          {row.original.max_order_quantity && (
            <span className="text-xs text-muted-foreground">
              - {row.original.max_order_quantity}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "is_preferred",
      header: "Status",
      cell: ({ row }) => {
        const isPreferred = row.original.is_preferred;
        const isActive = row.original.is_active !== false;
        
        return (
          <div className="flex items-center gap-2">
            {isPreferred && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
                <Star className="h-3 w-3 fill-warning" /> Preferred
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn(
                "font-bold text-[10px] uppercase h-5",
                isActive 
                  ? "bg-success/10 text-success border-success/20" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const mapping = row.original;
        const isPreferred = mapping.is_preferred;
        const isActive = mapping.is_active !== false;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openEditDialog(mapping)} className="gap-2">
                <Edit className="h-3.5 w-3.5" /> Edit Details
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {!isPreferred && (
                <DropdownMenuItem onClick={() => handleSetPreferred(mapping)} className="gap-2 text-warning">
                  <Star className="h-3.5 w-3.5" /> Set as Preferred
                </DropdownMenuItem>
              )}
              {isPreferred && (
                <DropdownMenuItem onClick={() => handleRemovePreferred(mapping)} className="gap-2">
                  <StarOff className="h-3.5 w-3.5" /> Remove Preferred
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => toggleActive(mapping.id, !isActive)} 
                className="gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => { setSelectedMapping(mapping); setDeleteDialogOpen(true); }}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Unlink Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        title="Supplier Wise Products"
        description="Linking Product Master entries to specific authorized vendors for automated indenting."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-sm">
              <Link2 className="h-4 w-4" /> New Mapping
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mapped Products</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold">{stats.totalMappings}</span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
              {stats.uniqueProducts} unique products
            </span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-warning">
              <Star className="h-4 w-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Preferred Links</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold">{stats.preferredLinks}</span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Primary vendors set</span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-info">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Multi-Source</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold">
              {stats.totalMappings - stats.uniqueProducts > 0 ? stats.totalMappings - stats.uniqueProducts : 0}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Fallback vendors</span>
          </div>
        </Card>
        
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-success">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Suppliers</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-2xl font-bold">{stats.uniqueSuppliers}</span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">With linked products</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select 
          value={filters.supplier_id || "all"} 
          onValueChange={(val) => setFilters({ ...filters, supplier_id: val === "all" ? undefined : val })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.supplier_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.is_preferred === undefined ? "all" : filters.is_preferred.toString()} 
          onValueChange={(val) => setFilters({ 
            ...filters, 
            is_preferred: val === "all" ? undefined : val === "true" 
          })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Links</SelectItem>
            <SelectItem value="true">Preferred Only</SelectItem>
            <SelectItem value="false">Non-Preferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mappings Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Product-Supplier Mappings
          </CardTitle>
          <CardDescription>
            {mappings.length} mappings found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {mappings.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No product-supplier mappings found</CardDescription>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Create First Mapping
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={mappings} searchKey="supplier_sku" />
          )}
        </CardContent>
      </Card>

      {/* Create Mapping Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Product to Supplier</DialogTitle>
            <DialogDescription>
              Create a mapping between a product and a supplier. This enables procurement from this vendor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}
              >
                <SelectTrigger id="supplier_id">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {suppliers.filter(s => s.is_active !== false).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="supplier_sku">Supplier SKU</Label>
              <Input
                id="supplier_sku"
                value={formData.supplier_sku}
                onChange={(e) => setFormData({ ...formData, supplier_sku: e.target.value })}
                placeholder="Vendor's product code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead_time_days">Lead Time (days)</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  min="1"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_order_quantity">Min Order Qty</Label>
                <Input
                  id="min_order_quantity"
                  type="number"
                  min="1"
                  value={formData.min_order_quantity}
                  onChange={(e) => setFormData({ ...formData, min_order_quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_order_quantity">Max Order Qty</Label>
                <Input
                  id="max_order_quantity"
                  type="number"
                  min="1"
                  value={formData.max_order_quantity || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_order_quantity: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack_size">Pack Size</Label>
                <Input
                  id="pack_size"
                  value={formData.pack_size}
                  onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                  placeholder="e.g., 12 units/case"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMapping} 
              disabled={isSubmitting || !formData.supplier_id || !formData.product_id}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product Mapping</DialogTitle>
            <DialogDescription>
              Update the supplier-specific details for this product.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedMapping && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-bold">{selectedMapping.product?.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  from {selectedMapping.supplier?.supplier_name}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit_supplier_sku">Supplier SKU</Label>
              <Input
                id="edit_supplier_sku"
                value={formData.supplier_sku}
                onChange={(e) => setFormData({ ...formData, supplier_sku: e.target.value })}
                placeholder="Vendor's product code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_lead_time_days">Lead Time (days)</Label>
                <Input
                  id="edit_lead_time_days"
                  type="number"
                  min="1"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_min_order_quantity">Min Order Qty</Label>
                <Input
                  id="edit_min_order_quantity"
                  type="number"
                  min="1"
                  value={formData.min_order_quantity}
                  onChange={(e) => setFormData({ ...formData, min_order_quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_max_order_quantity">Max Order Qty</Label>
                <Input
                  id="edit_max_order_quantity"
                  type="number"
                  min="1"
                  value={formData.max_order_quantity || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_order_quantity: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_pack_size">Pack Size</Label>
                <Input
                  id="edit_pack_size"
                  value={formData.pack_size}
                  onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                  placeholder="e.g., 12 units/case"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedMapping(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMapping} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Product from Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this product-supplier mapping? This will prevent future 
              orders from this vendor for this product.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMapping && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-bold text-sm">{selectedMapping.product?.product_name}</p>
              <p className="text-xs text-muted-foreground">from {selectedMapping.supplier?.supplier_name}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setSelectedMapping(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMapping} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Unlink Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

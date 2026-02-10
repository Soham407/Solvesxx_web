"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  Boxes, 
  MoreHorizontal,
  Search,
  Loader2,
  RefreshCw,
  Info,
  Edit,
  ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useProducts, Product } from "@/hooks/useProducts";

export default function ProductsPage() {
  const {
    products,
    stats,
    isLoading,
    error,
    updateStock,
    getStockStatus,
    filters,
    setFilters,
    refresh,
  } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, searchTerm });
  };

  // Handle stock update
  const handleUpdateStock = async () => {
    if (!selectedProduct) return;
    
    setIsUpdating(true);
    await updateStock(selectedProduct.id, parseInt(newStock) || 0);
    setIsUpdating(false);
    setStockDialogOpen(false);
    setSelectedProduct(null);
    setNewStock("");
  };

  // Open stock dialog
  const openStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.current_stock.toString());
    setStockDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Table columns
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "product_name",
      header: "Product Details",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-sm">{row.original.product_name}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[8px] uppercase font-mono">
              {row.original.product_code}
            </Badge>
            {row.original.category && (
              <span className="text-[10px] text-muted-foreground">
                {row.original.category.category_name}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "current_stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="gap-1 -ml-4"
        >
          Stock Level
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const stockStatus = getStockStatus(row.original);
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold">{row.original.current_stock}</span>
              <span className="text-[10px] text-muted-foreground">
                Min: {row.original.min_stock_level}
              </span>
            </div>
            <Badge variant="outline" className={cn("text-[10px] font-bold", stockStatus.color)}>
              {stockStatus.label}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "unit_of_measurement",
      header: "Unit",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.unit_of_measurement || "Pieces"}
        </span>
      ),
    },
    {
      accessorKey: "base_rate",
      header: "Rate",
      cell: ({ row }) => (
        <span className="text-sm font-bold">
          {formatCurrency(row.original.base_rate)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge 
          variant="outline" 
          className={cn(
            row.original.status === "active" 
              ? "bg-success/10 text-success" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openStockDialog(row.original)}>
              <Edit className="h-4 w-4 mr-2" /> Update Stock
            </DropdownMenuItem>
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>View History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Product Inventory"
        description="Manage product catalog, stock levels, and inventory tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats.totalProducts}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total SKUs</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-success">{stats.activeProducts}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Products</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Boxes className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-warning">{stats.lowStockCount}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Low Stock</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-critical">{stats.outOfStockCount}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Out of Stock</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-critical/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-critical" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select 
          value={filters.stockStatus || "all"} 
          onValueChange={(val) => setFilters({ ...filters, stockStatus: val as typeof filters.stockStatus })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.status || "all"} 
          onValueChange={(val) => setFilters({ ...filters, status: val as typeof filters.status })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Product Catalog
          </CardTitle>
          <CardDescription>
            {products.length} products found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {products.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No products found matching your filters</CardDescription>
            </div>
          ) : (
            <DataTable columns={columns} data={products} searchKey="product_name" />
          )}
        </CardContent>
      </Card>

      {/* Stock Update Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock Level</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-bold">{selectedProduct.product_name}</p>
                <p className="text-xs text-muted-foreground">{selectedProduct.product_code}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">New Stock Level</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Enter new stock quantity"
                />
                <p className="text-xs text-muted-foreground">
                  Current: {selectedProduct.current_stock} | Min Level: {selectedProduct.min_stock_level}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

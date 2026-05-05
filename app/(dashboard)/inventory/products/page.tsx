"use client";

import { useMemo, useState } from "react";
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
  Edit,
  ArrowUpDown,
  Archive,
  Trash2,
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
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useProducts, Product } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductSubcategories } from "@/hooks/useProductSubcategories";
import { useAuth } from "@/hooks/useAuth";
import {
  ProductFormData,
  EMPTY_PRODUCT_FORM,
  buildProductFormFromProduct,
  buildProductPayload,
  validateProductForm as validateProductFormFields,
  formatProductCurrency,
} from "@/src/lib/inventory/productEditor";
import { ProductEditorDialog } from "@/components/inventory-ops/ProductEditorDialog";
import { ProductConfirmDialog } from "@/components/inventory-ops/ProductConfirmDialog";
import { ProductStockDialog } from "@/components/inventory-ops/ProductStockDialog";

export default function ProductsPage() {
  const { toast } = useToast();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "super_admin" || role === "storekeeper";
  
  const {
    products,
    stats,
    isLoading,
    error,
    updateStock,
    addProduct,
    updateProduct,
    deleteProduct,
    getStockStatus,
    filters,
    setFilters,
    refresh,
  } = useProducts();
  const { categories } = useProductCategories();
  const { subcategories } = useProductSubcategories();

  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedActionProduct, setSelectedActionProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | "delete" | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);

  const availableSubcategories = useMemo(
    () =>
      subcategories.filter(
        (subcategory) =>
          !productForm.category_id || subcategory.category_id === productForm.category_id
      ),
    [productForm.category_id, subcategories]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, searchTerm });
  };

  const resetProductForm = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setSelectedProduct(null);
  };

  const openCreateDialog = () => {
    resetProductForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setProductForm(buildProductFormFromProduct(product));
    setEditDialogOpen(true);
  };

  const validateProductForm = () => {
    const errorMessage = validateProductFormFields(productForm);
    if (errorMessage) {
      toast({ title: errorMessage, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleCreateProduct = async () => {
    if (!validateProductForm()) return;
    setIsSubmitting(true);
    const result = await addProduct(buildProductPayload(productForm));
    setIsSubmitting(false);
    if (result.success) {
      setCreateDialogOpen(false);
      resetProductForm();
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !validateProductForm()) return;
    setIsSubmitting(true);
    const result = await updateProduct(selectedProduct.id, buildProductPayload(productForm));
    setIsSubmitting(false);
    if (result.success) {
      setEditDialogOpen(false);
      resetProductForm();
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct) return;

    setIsUpdating(true);
    await updateStock(selectedProduct.id, parseInt(newStock, 10) || 0);
    setIsUpdating(false);
    setStockDialogOpen(false);
    setSelectedProduct(null);
    setNewStock("");
  };

  const openStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.current_stock.toString());
    setStockDialogOpen(true);
  };

  const openConfirmDialog = (
    action: "archive" | "restore" | "delete",
    product: Product
  ) => {
    setSelectedActionProduct(product);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedActionProduct || !confirmAction) return;
    setIsSubmitting(true);
    const result =
      confirmAction === "delete"
        ? await deleteProduct(selectedActionProduct.id)
        : await updateProduct(selectedActionProduct.id, {
            status: confirmAction === "archive" ? "inactive" : "active",
          });
    setIsSubmitting(false);
    if (result.success) {
      setConfirmDialogOpen(false);
      setSelectedActionProduct(null);
      setConfirmAction(null);
    }
  };

  const formatCurrency = formatProductCurrency;

  const columns: ColumnDef<Product>[] = useMemo(() => {
    const baseColumns: ColumnDef<Product>[] = [
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
    ];

    if (canManage) {
      baseColumns.push({
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openStockDialog(row.original)}>
                <Edit className="h-4 w-4 mr-2" /> Update Stock
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openConfirmDialog(row.original.status === "active" ? "archive" : "restore", row.original)
                }
              >
                <Archive className="h-4 w-4 mr-2" />
                {row.original.status === "active" ? "Archive Product" : "Restore Product"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openConfirmDialog("delete", row.original)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }

    return baseColumns;
  }, [canManage, getStockStatus, formatCurrency]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            {canManage && (
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            )}
          </div>
        }
      />

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

      <ProductEditorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Add Product"
        description="Create a new product in the inventory catalog."
        submitLabel="Create Product"
        isSubmitting={isSubmitting}
        productForm={productForm}
        setProductForm={setProductForm}
        categories={categories}
        availableSubcategories={availableSubcategories}
        onSubmit={handleCreateProduct}
      />

      <ProductEditorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Product"
        description="Update the selected product details."
        submitLabel="Save Changes"
        isSubmitting={isSubmitting}
        productForm={productForm}
        setProductForm={setProductForm}
        categories={categories}
        availableSubcategories={availableSubcategories}
        onSubmit={handleUpdateProduct}
      />

      <ProductConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        selectedProduct={selectedActionProduct}
        confirmAction={confirmAction}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmAction}
      />

      <ProductStockDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        selectedProduct={selectedProduct}
        newStock={newStock}
        setNewStock={setNewStock}
        isUpdating={isUpdating}
        onUpdate={handleUpdateStock}
      />
    </div>
  );
}

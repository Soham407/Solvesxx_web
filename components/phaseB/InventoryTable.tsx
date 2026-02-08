"use client";

import { useState } from "react";
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  TrendingDown,
  TrendingUp,
  MoreVertical,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useInventory } from "@/hooks/useInventory";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { StockLevel, InventoryFilters } from "@/src/types/phaseB";

interface InventoryTableProps {
  onAddStock?: (productId: string, warehouseId: string) => void;
  onViewBatches?: (productId: string, warehouseId: string) => void;
  onCreateReorderRule?: (productId: string, warehouseId: string) => void;
}

export function InventoryTable({
  onAddStock,
  onViewBatches,
  onCreateReorderRule,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);

  const { warehouses } = useWarehouses();
  const {
    stockLevels,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    stats,
    setFilters,
    setPage,
    refresh,
  } = useInventory();

  // Build filters from current state
  const buildFilters = (): InventoryFilters => {
    const filters: InventoryFilters = {};
    if (searchTerm) filters.searchTerm = searchTerm;
    if (selectedWarehouse && selectedWarehouse !== "all") filters.warehouseId = selectedWarehouse;
    if (showLowStock) filters.needsReorder = true;
    return filters;
  };

  // Apply filters helper
  const applyFilters = () => {
    setFilters(buildFilters());
  };

  // Apply filters on form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedWarehouse("all");
    setShowLowStock(false);
    setFilters({});
  };

  // Toggle low stock filter
  const toggleLowStock = () => {
    const newValue = !showLowStock;
    setShowLowStock(newValue);
    // Apply filters immediately with the new value
    const filters: InventoryFilters = {};
    if (searchTerm) filters.searchTerm = searchTerm;
    if (selectedWarehouse && selectedWarehouse !== "all") filters.warehouseId = selectedWarehouse;
    if (newValue) filters.needsReorder = true;
    setFilters(filters);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Warehouses</p>
                  <p className="text-2xl font-bold">{stats.totalWarehouses}</p>
                </div>
                <Warehouse className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-warning">{stats.lowStockItems}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-warning/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-destructive">{stats.outOfStockItems}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Reorders</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.pendingReorders}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Inventory
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filter Form */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    // Apply filters immediately on typing
                    const newSearchTerm = e.target.value;
                    const filters: InventoryFilters = {};
                    if (newSearchTerm) filters.searchTerm = newSearchTerm;
                    if (selectedWarehouse && selectedWarehouse !== "all") filters.warehouseId = selectedWarehouse;
                    if (showLowStock) filters.needsReorder = true;
                    setFilters(filters);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select 
              value={selectedWarehouse} 
              onValueChange={(val) => {
                setSelectedWarehouse(val);
                // Apply filters immediately on warehouse change
                const filters: InventoryFilters = {};
                if (searchTerm) filters.searchTerm = searchTerm;
                if (val && val !== "all") filters.warehouseId = val;
                if (showLowStock) filters.needsReorder = true;
                setFilters(filters);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={showLowStock ? "destructive" : "outline"}
              size="sm"
              className="gap-1"
              onClick={toggleLowStock}
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </Button>
            <Button type="submit" size="icon" variant="secondary">
              <Filter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}

          {/* Inventory Table */}
          {!isLoading && !error && (
            <>
              {stockLevels.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No inventory items found</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLevels.map((stock, idx) => (
                        <TableRow
                          key={`${stock.product_id}-${stock.warehouse_id}-${idx}`}
                          className={cn(
                            stock.needs_reorder && "bg-warning/5"
                          )}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{stock.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {stock.product_code}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{stock.warehouse_name}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-bold",
                                Number(stock.total_quantity) === 0
                                  ? "text-destructive"
                                  : stock.needs_reorder
                                  ? "text-warning"
                                  : "text-success"
                              )}
                            >
                              {stock.total_quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground">
                              {stock.reorder_level ?? "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {Number(stock.total_quantity) === 0 ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Out of Stock
                              </Badge>
                            ) : stock.needs_reorder ? (
                              <Badge variant="outline" className="text-[10px] border-warning text-warning">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-success text-success">
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(onAddStock || onViewBatches || onCreateReorderRule) && stock.product_id && stock.warehouse_id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {onAddStock && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onAddStock(stock.product_id!, stock.warehouse_id!)
                                      }
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Stock
                                    </DropdownMenuItem>
                                  )}
                                  {onViewBatches && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onViewBatches(stock.product_id!, stock.warehouse_id!)
                                      }
                                    >
                                      <Package className="h-4 w-4 mr-2" />
                                      View Batches
                                    </DropdownMenuItem>
                                  )}
                                  {onCreateReorderRule && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        onCreateReorderRule(stock.product_id!, stock.warehouse_id!)
                                      }
                                    >
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Set Reorder Rule
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

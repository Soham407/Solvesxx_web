"use client";

import { useState } from "react";
import Link from "next/link";
import { useInventory } from "@/hooks/useInventory";
import { useChemicals } from "@/hooks/useChemicals";
import { useWarehouses } from "@/hooks/useWarehouses";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  TrendingDown, 
  ArrowRight,
  Boxes,
  Plus,
  RefreshCw,
  FlaskConical,
  Clock,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const stockLevelColumns = [
// ... (rest of columns)
  {
    accessorKey: "product_name",
    header: "Product",
    cell: ({ row }: { row: { original: any } }) => (
      <div>
        <div className="font-medium">{row.original.product_name || '-'}</div>
        <div className="text-sm text-muted-foreground">{row.original.product_code || ''}</div>
      </div>
    ),
  },
  {
    accessorKey: "warehouse_name",
    header: "Warehouse",
  },
  {
    accessorKey: "total_quantity",
    header: "Stock Level",
    cell: ({ row }: { row: { original: any } }) => {
      const quantity = Number(row.original.total_quantity) || 0;
      const reorderLevel = row.original.reorder_level ? Number(row.original.reorder_level) : null;
      const isLow = reorderLevel !== null && quantity <= reorderLevel;
      const isOut = quantity === 0;
      
      return (
        <div className="flex items-center gap-2">
          <span className={isOut ? "text-destructive font-bold" : isLow ? "text-orange-500 font-bold" : ""}>
            {quantity}
          </span>
          {isOut && <Badge variant="destructive">Out of Stock</Badge>}
          {isLow && !isOut && <Badge variant="outline" className="border-orange-500 text-orange-500">Low Stock</Badge>}
        </div>
      );
    },
  },
  {
    accessorKey: "reorder_level",
    header: "Reorder Point",
    cell: ({ row }: { row: { original: any } }) => (
      <span className="text-muted-foreground">
        {row.original.reorder_level ? Number(row.original.reorder_level) : "-"}
      </span>
    ),
  },
  {
    accessorKey: "needs_reorder",
    header: "Status",
    cell: ({ row }: { row: { original: any } }) => {
      const needsReorder = row.original.needs_reorder;
      const isOutOfStock = Number(row.original.total_quantity) === 0;
      
      if (isOutOfStock) {
        return <Badge variant="destructive">Out of Stock</Badge>;
      }
      if (needsReorder) {
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Reorder Needed</Badge>;
      }
      return <Badge variant="outline" className="border-green-500 text-green-500">OK</Badge>;
    },
  },
];

export default function InventoryDashboardPage() {
  const { warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { 
    stockLevels, 
    stats, 
    isLoading: isInventoryLoading, 
    setFilters, 
    refresh: refreshInventory 
  } = useInventory();

  const {
    chemicals,
    expiringChemicals,
    isLoading: isChemicalsLoading,
    issueChemical,
    refresh: refreshChemicals
  } = useChemicals();
  
  const isLoading = isInventoryLoading || isChemicalsLoading;
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");

  const refresh = () => {
    refreshInventory();
    refreshChemicals();
  };

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value);
    setFilters({ 
      warehouseId: value === "all" ? undefined : value 
    });
  };

  const handleSearch = (value: string) => {
    setFilters({ searchTerm: value });
  };

  const lowStockItems = stockLevels.filter(item => item.needs_reorder);
  const outOfStockItems = stockLevels.filter(item => Number(item.total_quantity) === 0);

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Inventory Dashboard"
        description="Manage stock levels, warehouses, and reorder alerts"
      >
        <div className="flex items-center gap-2">
          <Select value={selectedWarehouse} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="w-[200px]">
              <Warehouse className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouse_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Active in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWarehouses || 0}</div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.lowStockItems || 0}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Chemicals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiringChemicals.length}</div>
            <p className="text-xs text-muted-foreground">Action required</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="chemicals">
            Chemicals
            {expiringChemicals.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {expiringChemicals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Reorder Alerts
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                Current inventory status across all warehouses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={stockLevelColumns as any}
                data={stockLevels as any}
                searchKey="product_name"
                onSearch={handleSearch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chemicals" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {isChemicalsLoading ? (
              <div className="col-span-3 flex justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : chemicals.length > 0 ? (
              chemicals.map((chem) => {
                const isExpired = chem.severity === 'expired';
                const isExpiringSoon = chem.severity === 'critical' || chem.severity === 'warning';
                
                return (
                  <Card key={`${chem.product_id}-${chem.batch_number}`} className={cn("border-none shadow-card ring-1 ring-border p-4", isExpired && "opacity-80 bg-critical/5")}>
                    <CardHeader className="p-0 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            {chem.product_name}
                            {isExpired ? (
                              <Badge variant="destructive" className="text-[8px] h-4 uppercase">Expired</Badge>
                            ) : isExpiringSoon ? (
                              <Badge variant="outline" className="text-[8px] h-4 uppercase border-warning text-warning">Expiring Soon</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] h-4 uppercase border-success text-success">Valid</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-[10px] font-mono">{chem.product_code} {chem.batch_number && `| Batch: ${chem.batch_number}`}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Current Stock</span>
                        <span>{chem.current_stock} {chem.unit}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Expiry: {chem.expiry_date ? new Date(chem.expiry_date).toLocaleDateString() : "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            Source: {chem.source}
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant={isExpired ? "secondary" : "default"}
                          className="h-8 text-[10px] font-bold uppercase tracking-wider"
                          disabled={isExpired || Number(chem.current_stock) <= 0}
                          title={isExpired ? "Item expired — cannot issue" : ""}
                          onClick={() => issueChemical({
                            productId: chem.product_id,
                            batchNumber: chem.batch_number || undefined,
                            quantity: 1 // Default to 1 for quick issuance
                          })}
                        >
                          {isExpired ? "Blocked" : "Issue"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-none shadow-card ring-1 ring-border col-span-3 py-20 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <CardTitle className="text-lg font-bold">No Chemical Inventory</CardTitle>
                <CardDescription>No chemical products with expiry tracking found.</CardDescription>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Reorder Alerts
                </CardTitle>
                <CardDescription>
                  Items that need to be reordered
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory/purchase-orders">
                  Create Purchase Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Boxes className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Reorder Alerts</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    All inventory items are at adequate stock levels. Great job!
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={stockLevelColumns as any}
                  data={lowStockItems as any}
                  searchKey="product_name"
                />
              )}
            </CardContent>
          </Card>

          {outOfStockItems.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Critical: Out of Stock
                  </CardTitle>
                  <CardDescription>
                    These items have zero inventory and need immediate reordering
                  </CardDescription>
                </div>
                <Badge variant="destructive" className="text-lg">
                  {outOfStockItems.length} items
                </Badge>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={stockLevelColumns as any}
                  data={outOfStockItems as any}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Warehouses</CardTitle>
                <CardDescription>
                  Manage storage locations and view stock distribution
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/inventory/warehouses">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Warehouse
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {warehousesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Warehouses</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Set up warehouses to start tracking inventory by location
                  </p>
                  <Button asChild>
                    <Link href="/inventory/warehouses">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Warehouse
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {warehouses.map((warehouse) => (
                    <Card key={warehouse.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg">{warehouse.warehouse_name}</CardTitle>
                        <CardDescription>{warehouse.warehouse_code || "No code set"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {stockLevels.filter(s => s.warehouse_id === warehouse.id).length} products
                          </span>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/inventory/warehouses?id=${warehouse.id}`}>
                              View
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Link href="/inventory/products">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
              <CardDescription>Manage product catalog and details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary">
                View Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/purchase-orders">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>Create and manage purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary">
                View Orders
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/suppliers">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Suppliers
              </CardTitle>
              <CardDescription>Manage supplier information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary">
                View Suppliers
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

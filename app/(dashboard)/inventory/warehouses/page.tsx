"use client";

import { useState } from "react";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventory } from "@/hooks/useInventory";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/DataTable";
import { useToast } from "@/components/ui/use-toast";
import { 
  Warehouse, 
  Plus, 
  MapPin, 
  Package, 
  Edit2, 
  Trash2,
  Building2,
  RefreshCw
} from "lucide-react";

interface WarehouseFormData {
  warehouse_name: string;
  warehouse_code?: string;
}

export default function WarehousesPage() {
  const { warehouses, isLoading, createWarehouse, updateWarehouse, deleteWarehouse, refresh } = useWarehouses();
  const { stockLevels } = useInventory();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({
    warehouse_name: "",
    warehouse_code: "",
  });

  const handleCreate = async () => {
    if (!formData.warehouse_name.trim()) {
      toast({
        title: "Error",
        description: "Warehouse name is required",
        variant: "destructive",
      });
      return;
    }

    const result = await createWarehouse({
      warehouse_name: formData.warehouse_name,
      warehouse_code: formData.warehouse_code || `WH-${Date.now().toString(36).toUpperCase()}`,
      is_active: true,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      setIsCreateDialogOpen(false);
      setFormData({ warehouse_name: "", warehouse_code: "" });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create warehouse",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedWarehouse || !formData.warehouse_name.trim()) return;

    const result = await updateWarehouse(selectedWarehouse.id, {
      warehouse_name: formData.warehouse_name,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedWarehouse(null);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update warehouse",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (warehouse: any) => {
    if (!confirm(`Are you sure you want to delete "${warehouse.warehouse_name}"?`)) {
      return;
    }

    const result = await deleteWarehouse(warehouse.id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete warehouse",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      warehouse_name: warehouse.warehouse_name,
      warehouse_code: warehouse.warehouse_code || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStockCountForWarehouse = (warehouseId: string) => {
    return stockLevels.filter(s => s.warehouse_id === warehouseId).length;
  };

  const columns = [
    {
      accessorKey: "warehouse_name",
      header: "Warehouse Name",
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Warehouse className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.warehouse_name}</div>
            {row.original.warehouse_code && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {row.original.warehouse_code}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "warehouse_code",
      header: "Code",
      cell: ({ row }: { row: { original: any } }) => (
        <span className="text-muted-foreground">
          {row.original.warehouse_code || "-"}
        </span>
      ),
    },
    {
      accessorKey: "stock_count",
      header: "Stock Items",
      cell: ({ row }: { row: { original: any } }) => {
        const count = getStockCountForWarehouse(row.original.id);
        return (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">{count} products</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(row.original)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-8">
      <PageHeader
        title="Warehouses"
        description="Manage storage locations and inventory distribution"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Warehouse</DialogTitle>
                <DialogDescription>
                  Add a new storage location for inventory tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Warehouse Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Storage, Warehouse A"
                    value={formData.warehouse_name}
                    onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Warehouse Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g., WH-001 (auto-generated if empty)"
                    value={formData.warehouse_code}
                    onChange={(e) => setFormData({ ...formData, warehouse_code: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Warehouse</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockLevels.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Products per Warehouse</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.length > 0 ? Math.round(stockLevels.length / warehouses.length) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
          <CardDescription>
            Manage your storage locations and view inventory distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as any}
            data={warehouses as any}
            searchKey="warehouse_name"
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>
              Update warehouse details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Warehouse Name *</Label>
              <Input
                id="edit-name"
                value={formData.warehouse_name}
                onChange={(e) => setFormData({ ...formData, warehouse_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Warehouse Code</Label>
              <Input
                id="edit-code"
                value={formData.warehouse_code}
                disabled
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

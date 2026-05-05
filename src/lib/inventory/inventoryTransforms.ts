import type {
  InventoryDashboardStats,
  InventoryFilters,
  ReorderRule,
  StockBatch,
  StockLevel,
} from "@/src/types/operations";

export function buildInventoryDashboardStats(rows: StockLevel[], warehouseCount: number, productCount: number): InventoryDashboardStats {
  const lowStock = rows.filter((stock) => stock.needs_reorder === true);
  const outOfStock = rows.filter((stock) => Number(stock.total_quantity) === 0);

  return {
    totalProducts: productCount,
    lowStockItems: lowStock.length,
    outOfStockItems: outOfStock.length,
    totalWarehouses: warehouseCount,
    pendingReorders: lowStock.length,
  };
}

export function filterStockLevels(rows: StockLevel[], filters: InventoryFilters): StockLevel[] {
  return rows.filter((stock) => {
    if (filters.warehouseId && stock.warehouse_id !== filters.warehouseId) return false;
    if (filters.productId && stock.product_id !== filters.productId) return false;
    if (filters.needsReorder === true && stock.needs_reorder !== true) return false;
    return true;
  });
}

export function filterStockBatches(rows: StockBatch[], filters: InventoryFilters): StockBatch[] {
  return rows.filter((batch) => {
    if (filters.warehouseId && batch.warehouse_id !== filters.warehouseId) return false;
    if (filters.productId && batch.product_id !== filters.productId) return false;
    return batch.status === "active";
  });
}

export function filterReorderRules(rows: ReorderRule[]): ReorderRule[] {
  return rows.filter((rule) => rule.is_active === true);
}

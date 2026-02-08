"use client";

import { useState } from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  QrCode,
  Wrench,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAssets } from "@/hooks/useAssets";
import { useAssetCategories } from "@/hooks/useAssetCategories";
import type { AssetWithDetails, AssetFilters } from "@/src/types/phaseB";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  PAGINATION,
} from "@/src/lib/constants";

interface AssetListProps {
  onAssetSelect?: (asset: AssetWithDetails) => void;
  onCreateNew?: () => void;
  onEdit?: (asset: AssetWithDetails) => void;
  onViewQr?: (asset: AssetWithDetails) => void;
}

export function AssetList({
  onAssetSelect,
  onCreateNew,
  onEdit,
  onViewQr,
}: AssetListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { categories } = useAssetCategories();
  const {
    assets,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    stats,
    setFilters,
    setPage,
    deleteAsset,
    refresh,
  } = useAssets();

  // Apply filters
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: AssetFilters = {};
    if (searchTerm) filters.searchTerm = searchTerm;
    if (selectedCategory) filters.categoryId = selectedCategory;
    if (selectedStatus) filters.status = selectedStatus as AssetFilters["status"];
    setFilters(filters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus("");
    setFilters({});
  };

  // Handle delete
  const handleDelete = async (asset: AssetWithDetails) => {
    if (!asset.id) return;
    if (confirm(`Are you sure you want to decommission "${asset.name}"?`)) {
      await deleteAsset(asset.id);
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  // Status icon
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "functional":
        return <CheckCircle className="h-4 w-4" style={{ color: ASSET_STATUS_COLORS.functional }} />;
      case "under_maintenance":
        return <Wrench className="h-4 w-4" style={{ color: ASSET_STATUS_COLORS.under_maintenance }} />;
      case "faulty":
        return <AlertCircle className="h-4 w-4" style={{ color: ASSET_STATUS_COLORS.faulty }} />;
      case "decommissioned":
        return <XCircle className="h-4 w-4" style={{ color: ASSET_STATUS_COLORS.decommissioned }} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{stats.totalAssets}</p>
                </div>
                <Package className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Functional</p>
                  <p className="text-2xl font-bold text-success">{stats.functionalAssets}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Under Maintenance</p>
                  <p className="text-2xl font-bold text-warning">{stats.underMaintenance}</p>
                </div>
                <Wrench className="h-8 w-8 text-warning/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Faulty</p>
                  <p className="text-2xl font-bold text-destructive">{stats.faultyAssets}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive/20" />
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
              Assets
            </CardTitle>
            {onCreateNew && (
              <Button size="sm" className="gap-1" onClick={onCreateNew}>
                <Plus className="h-4 w-4" />
                Add Asset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filter Form */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                {Object.entries(ASSET_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}

          {/* Asset List */}
          {!isLoading && !error && (
            <div className="space-y-3">
              {assets.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">No assets found</p>
                </div>
              ) : (
                assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer",
                      onAssetSelect && "cursor-pointer"
                    )}
                    onClick={() => onAssetSelect?.(asset)}
                  >
                    {/* Icon */}
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 bg-primary/10"
                    >
                      <Package
                        className="h-6 w-6 text-primary"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{asset.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {asset.asset_code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {asset.category_name && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {asset.category_name}
                          </span>
                        )}
                        {asset.location_name && (
                          <span className="truncate">{asset.location_name}</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(asset.status)}
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: ASSET_STATUS_COLORS[asset.status || "functional"],
                          color: ASSET_STATUS_COLORS[asset.status || "functional"],
                        }}
                      >
                        {ASSET_STATUS_LABELS[asset.status || "functional"]}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewQr && (
                          <DropdownMenuItem onClick={() => onViewQr(asset)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(asset)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(asset)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Decommission
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
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
        </CardContent>
      </Card>
    </div>
  );
}

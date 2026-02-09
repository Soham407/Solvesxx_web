"use client";

import { useState } from "react";
import { useAssetCategories } from "@/hooks/useAssetCategories";
import { useAssets } from "@/hooks/useAssets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/shared/DataTable";
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  Palette,
  Tag,
  HardDrive,
  RefreshCw,
  ChevronRight,
  ChevronDown
} from "lucide-react";

// Predefined colors for categories
const CATEGORY_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Gray", value: "#6B7280" },
  { name: "Indigo", value: "#6366F1" },
];

interface CategoryFormData {
  category_name: string;
  description?: string;
  color: string;
  parent_category_id?: string;
}

export function AssetCategoryManager() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory, refresh } = useAssetCategories();
  const { assets } = useAssets();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<CategoryFormData>({
    category_name: "",
    description: "",
    color: CATEGORY_COLORS[0].value,
  });

  // Get asset count for a category
  const getAssetCount = (categoryId: string) => {
    return assets.filter((asset) => asset.category_id === categoryId).length;
  };

  // Get child categories
  const getChildCategories = (parentId: string) => {
    return categories.filter((cat) => cat.parent_category_id === parentId);
  };

  // Get root categories
  const getRootCategories = () => {
    return categories.filter((cat) => !cat.parent_category_id);
  };

  // Toggle category expansion
  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCreate = async () => {
    if (!formData.category_name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    // Generate a unique category code
    const categoryCode = `CAT-${Date.now().toString(36).toUpperCase()}`;
    
    const result = await createCategory({
      category_code: categoryCode,
      category_name: formData.category_name,
      description: formData.description,
      color: formData.color,
      parent_category_id: formData.parent_category_id || null,
      is_active: true,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.category_name.trim()) return;

    const result = await updateCategory(selectedCategory.id, {
      category_name: formData.category_name,
      description: formData.description,
      color: formData.color,
      parent_category_id: formData.parent_category_id || null,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (category: any) => {
    const assetCount = getAssetCount(category.id);
    
    if (assetCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category has ${assetCount} assets assigned. Please reassign them first.`,
        variant: "destructive",
      });
      return;
    }

    const childCount = getChildCategories(category.id).length;
    if (childCount > 0) {
      toast({
        title: "Cannot Delete",
        description: `This category has ${childCount} sub-categories. Please delete them first.`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.category_name}"?`)) {
      return;
    }

    const result = await deleteCategory(category.id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (category: any) => {
    setSelectedCategory(category);
    setFormData({
      category_name: category.category_name,
      description: category.description || "",
      color: category.color || CATEGORY_COLORS[0].value,
      parent_category_id: category.parent_category_id || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category_name: "",
      description: "",
      color: CATEGORY_COLORS[0].value,
    });
  };

  // Render category tree item
  const renderCategoryTree = (category: any, level: number = 0) => {
    const children = getChildCategories(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const assetCount = getAssetCount(category.id);

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors"
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleExpand(category.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: category.color || CATEGORY_COLORS[0].value }}
          >
            <Tag className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1">
            <div className="font-medium">{category.category_name}</div>
            {category.description && (
              <div className="text-sm text-muted-foreground">{category.description}</div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{assetCount} assets</Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditDialog(category)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(category)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderCategoryTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: row.original.color || CATEGORY_COLORS[0].value }}
          >
            <Tag className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium">{row.original.category_name}</div>
            {row.original.description && (
              <div className="text-sm text-muted-foreground">{row.original.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "color",
      header: "Color",
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-full border"
            style={{ backgroundColor: row.original.color || CATEGORY_COLORS[0].value }}
          />
          <span className="text-sm text-muted-foreground">
            {CATEGORY_COLORS.find((c) => c.value === row.original.color)?.name || "Custom"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "asset_count",
      header: "Assets",
      cell: ({ row }: { row: { original: any } }) => {
        const count = getAssetCount(row.original.id);
        return (
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">{count} assets</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex items-center gap-1">
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Asset Categories
            </CardTitle>
            <CardDescription>
              Manage asset categories and organize your equipment
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new category to organize your assets
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., HVAC, Electrical, Plumbing"
                      value={formData.category_name}
                      onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of this category"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Parent Category (Optional)</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={formData.parent_category_id || ""}
                      onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value || undefined })}
                    >
                      <option value="">None (Root Category)</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Category Color
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={`h-8 w-8 rounded-lg transition-all ${
                            formData.color === color.value
                              ? "ring-2 ring-offset-2 ring-primary scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create Category</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Categories</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Create categories to organize your assets by type, location, or department
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hierarchical View */}
              <div>
                <h3 className="text-sm font-medium mb-4">Hierarchical View</h3>
                <div className="border rounded-lg">
                  {getRootCategories().map((category) => renderCategoryTree(category))}
                </div>
              </div>

              {/* Flat List View */}
              <div>
                <h3 className="text-sm font-medium mb-4">All Categories</h3>
                <DataTable
                  columns={columns as any}
                  data={categories as any}
                  searchKey="category_name"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Parent Category</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.parent_category_id || ""}
                onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value || undefined })}
              >
                <option value="">None (Root Category)</option>
                {categories
                  .filter((cat) => cat.id !== selectedCategory?.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Category Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`h-8 w-8 rounded-lg transition-all ${
                      formData.color === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
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

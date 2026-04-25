"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderTree, Layers, MoreHorizontal, LayoutGrid, Box, Loader2, AlertCircle, Pencil, Archive, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ProductCategory, useProductCategories } from "@/hooks/useProductCategories";

interface CategoryFormData {
  category_name: string;
  category_code: string;
  description: string;
}

const EMPTY_FORM: CategoryFormData = {
  category_name: "",
  category_code: "",
  description: "",
};

export default function CategoriesPage() {
  const { toast } = useToast();
  const {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryArchived,
  } = useProductCategories();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | "delete" | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!formData.category_name.trim()) {
      toast({
        title: "Category name is required",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setSelectedCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (category: ProductCategory) => {
    setSelectedCategory(category);
    setFormData({
      category_name: category.category_name,
      category_code: category.category_code || "",
      description: category.description || "",
    });
    setEditDialogOpen(true);
  };

  const openConfirmDialog = (
    action: "archive" | "restore" | "delete",
    category: ProductCategory
  ) => {
    setSelectedCategory(category);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const result = await createCategory({
      category_name: formData.category_name.trim(),
      category_code: formData.category_code.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !validateForm()) return;
    setIsSubmitting(true);
    const result = await updateCategory(selectedCategory.id, {
      category_name: formData.category_name.trim(),
      category_code: formData.category_code.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setEditDialogOpen(false);
      resetForm();
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedCategory || !confirmAction) return;
    setIsSubmitting(true);
    const result =
      confirmAction === "delete"
        ? await deleteCategory(selectedCategory.id)
        : await setCategoryArchived(selectedCategory.id, confirmAction === "archive");
    setIsSubmitting(false);
    if (result.success) {
      setConfirmDialogOpen(false);
      setConfirmAction(null);
      setSelectedCategory(null);
    }
  };

  const columns: ColumnDef<ProductCategory>[] = [
    {
      accessorKey: "category_name",
      header: "Category Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <FolderTree className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.category_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">
              {row.original.category_code || "N/A"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1">
          {row.original.description || "No description provided"}
        </span>
      ),
    },
    {
      accessorKey: "itemCount",
      header: "Total Products",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Box className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{row.original.itemCount} SKUs</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "font-bold text-[10px] uppercase h-5",
            row.original.is_active ? "bg-success/10 text-success border-success/20" : ""
          )}
        >
          {row.original.is_active ? "Active" : "Archived"}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => openEditDialog(row.original)} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit Category
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openConfirmDialog(row.original.is_active ? "archive" : "restore", row.original)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {row.original.is_active ? "Archive Category" : "Restore Category"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openConfirmDialog("delete", row.original)}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const activeCount = categories.filter((category) => category.is_active).length;
  const archivedCount = categories.filter((category) => !category.is_active).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Inventory Categories"
        description="Define and manage top-level classifications for standardizing and reporting inventory."
        actions={
          <Button className="gap-2 shadow-sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" /> New Category
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Active Categories", value: activeCount, icon: FolderTree },
            { label: "Archived", value: archivedCount, icon: Layers },
            { label: "System Default", value: "0", icon: LayoutGrid },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-2xl font-bold ">{stat.value}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                    {stat.label}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={categories} searchKey="category_name" />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new top-level category to the inventory catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category_name">Category Name</Label>
              <Input
                id="category_name"
                value={formData.category_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_name: e.target.value }))}
                placeholder="e.g. Electrical Consumables"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_code">Category Code</Label>
              <Input
                id="category_code"
                value={formData.category_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_code: e.target.value }))}
                placeholder="e.g. ELEC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the selected category details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_category_name">Category Name</Label>
              <Input
                id="edit_category_name"
                value={formData.category_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_category_code">Category Code</Label>
              <Input
                id="edit_category_code"
                value={formData.category_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "delete"
                ? "Delete Category"
                : confirmAction === "archive"
                  ? "Archive Category"
                  : "Restore Category"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? "This will permanently remove the category."
                : confirmAction === "archive"
                  ? "This will hide the category from active catalog flows."
                  : "This will make the category active again."}
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-bold text-sm">{selectedCategory.category_name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedCategory.category_code || "No code"} • {selectedCategory.itemCount} linked products
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmAction === "delete"
                ? "Delete Category"
                : confirmAction === "archive"
                  ? "Archive Category"
                  : "Restore Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ListTree, Folder, MoreHorizontal, Subtitles, Tags, Loader2, AlertCircle, Pencil, Archive, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useProductCategories } from "@/hooks/useProductCategories";
import { ProductSubcategory, useProductSubcategories } from "@/hooks/useProductSubcategories";

interface SubcategoryFormData {
  category_id: string;
  subcategory_name: string;
  subcategory_code: string;
  description: string;
}

const EMPTY_FORM: SubcategoryFormData = {
  category_id: "",
  subcategory_name: "",
  subcategory_code: "",
  description: "",
};

export default function SubcategoriesPage() {
  const { toast } = useToast();
  const { categories } = useProductCategories();
  const {
    subcategories,
    isLoading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    setSubcategoryArchived,
  } = useProductSubcategories();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductSubcategory | null>(null);
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | "delete" | null>(null);
  const [formData, setFormData] = useState<SubcategoryFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!formData.subcategory_name.trim()) {
      toast({
        title: "Subcategory name is required",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.category_id) {
      toast({
        title: "Select a parent category",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setSelectedSubcategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (subcategory: ProductSubcategory) => {
    setSelectedSubcategory(subcategory);
    setFormData({
      category_id: subcategory.category_id || "",
      subcategory_name: subcategory.subcategory_name,
      subcategory_code: subcategory.subcategory_code || "",
      description: subcategory.description || "",
    });
    setEditDialogOpen(true);
  };

  const openConfirmDialog = (
    action: "archive" | "restore" | "delete",
    subcategory: ProductSubcategory
  ) => {
    setSelectedSubcategory(subcategory);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const result = await createSubcategory({
      category_id: formData.category_id,
      subcategory_name: formData.subcategory_name.trim(),
      subcategory_code: formData.subcategory_code.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    if (!selectedSubcategory || !validateForm()) return;
    setIsSubmitting(true);
    const result = await updateSubcategory(selectedSubcategory.id, {
      category_id: formData.category_id,
      subcategory_name: formData.subcategory_name.trim(),
      subcategory_code: formData.subcategory_code.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setEditDialogOpen(false);
      resetForm();
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedSubcategory || !confirmAction) return;
    setIsSubmitting(true);
    const result =
      confirmAction === "delete"
        ? await deleteSubcategory(selectedSubcategory.id)
        : await setSubcategoryArchived(selectedSubcategory.id, confirmAction === "archive");
    setIsSubmitting(false);
    if (result.success) {
      setConfirmDialogOpen(false);
      setConfirmAction(null);
      setSelectedSubcategory(null);
    }
  };

  const columns: ColumnDef<ProductSubcategory>[] = [
    {
      accessorKey: "subcategory_name",
      header: "Subcategory",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-info/5 flex items-center justify-center">
            <Tags className="h-4 w-4 text-info" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.subcategory_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">
              {row.original.subcategory_code || "N/A"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "parentCategory",
      header: "Master Category",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[10px] uppercase">
          {row.original.parentCategory}
        </Badge>
      ),
    },
    {
      accessorKey: "itemCount",
      header: "SKU Density",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.itemCount} Products</span>,
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => openEditDialog(row.original)} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit Subcategory
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openConfirmDialog(row.original.is_active ? "archive" : "restore", row.original)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {row.original.is_active ? "Archive Subcategory" : "Restore Subcategory"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openConfirmDialog("delete", row.original)}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete Subcategory
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const activeNodesCount = subcategories.filter((subcategory) => subcategory.is_active).length;
  const uncategorizedCount = subcategories.filter((subcategory) => subcategory.parentCategory === "Uncategorized").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Inventory Subcategories"
        description="Nested classifications for more granular inventory organization and stock tracking."
        actions={
          <Button className="gap-2 shadow-sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" /> Create Subcategory
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
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: "Active Nodes", value: activeNodesCount, icon: ListTree, color: "text-primary" },
            { label: "Deepest Link", value: "L2", icon: Subtitles, color: "text-info" },
            { label: "Uncategorized", value: uncategorizedCount, icon: Folder, color: "text-success" },
            { label: "Ref. Nodes", value: subcategories.reduce((sum, subcategory) => sum + subcategory.itemCount, 0), icon: Tags, color: "text-warning" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
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
        <DataTable columns={columns} data={subcategories} searchKey="subcategory_name" />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subcategory</DialogTitle>
            <DialogDescription>Add a new nested category under an existing category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Parent Category</Label>
              <Select
                value={formData.category_id || undefined}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger id="category_id">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory_name">Subcategory Name</Label>
              <Input
                id="subcategory_name"
                value={formData.subcategory_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory_name: e.target.value }))}
                placeholder="e.g. Switchgear"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory_code">Subcategory Code</Label>
              <Input
                id="subcategory_code"
                value={formData.subcategory_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory_code: e.target.value }))}
                placeholder="e.g. SWG"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory_description">Description</Label>
              <Input
                id="subcategory_description"
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
              Create Subcategory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>Update the selected subcategory details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_category_id">Parent Category</Label>
              <Select
                value={formData.category_id || undefined}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger id="edit_category_id">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_subcategory_name">Subcategory Name</Label>
              <Input
                id="edit_subcategory_name"
                value={formData.subcategory_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_subcategory_code">Subcategory Code</Label>
              <Input
                id="edit_subcategory_code"
                value={formData.subcategory_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, subcategory_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_subcategory_description">Description</Label>
              <Input
                id="edit_subcategory_description"
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
                ? "Delete Subcategory"
                : confirmAction === "archive"
                  ? "Archive Subcategory"
                  : "Restore Subcategory"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "delete"
                ? "This will permanently remove the subcategory."
                : confirmAction === "archive"
                  ? "This will hide the subcategory from active catalog flows."
                  : "This will make the subcategory active again."}
            </DialogDescription>
          </DialogHeader>
          {selectedSubcategory && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-bold text-sm">{selectedSubcategory.subcategory_name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedSubcategory.parentCategory} • {selectedSubcategory.itemCount} linked products
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
                ? "Delete Subcategory"
                : confirmAction === "archive"
                  ? "Archive Subcategory"
                  : "Restore Subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

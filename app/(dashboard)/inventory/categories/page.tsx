"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, FolderTree, Layers, MoreHorizontal, LayoutGrid, Box, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  id: string;
  category_name: string;
  category_code: string;
  description: string;
  itemCount: number;
  status: "Active" | "Archived";
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("product_categories")
        .select("*")
        .order("category_name");

      if (fetchError) throw fetchError;

      const formattedCategories: Category[] = (data || []).map((c: any) => ({
        id: c.id,
        category_name: c.category_name,
        category_code: c.category_code || "N/A",
        description: c.description || "No description provided",
        itemCount: 0, // In reality, we could do a count query on products
        status: c.is_active ? "Active" : "Archived",
      }));

      setCategories(formattedCategories);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError("Failed to load inventory categories");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<Category>[] = [
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
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.category_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-xs text-muted-foreground line-clamp-1">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "itemCount",
      header: "Total Products",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Box className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{row.getValue("itemCount")} SKUs</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", row.getValue("status") === "Active" ? "bg-success/10 text-success border-success/20" : "")}>
            {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const activeCount = categories.filter(c => c.status === "Active").length;
  const archivedCount = categories.filter(c => c.status === "Archived").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Inventory Categories"
        description="Define and manage top-level classifications for standardizing and reporting inventory."
        actions={
          <Button className="gap-2 shadow-sm">
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
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
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
    </div>
  );
}

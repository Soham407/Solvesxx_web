"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ListTree, Folder, MoreHorizontal, Subtitles, Tags, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Subcategory {
  id: string;
  subcategory_name: string;
  parentCategory: string;
  subcategory_code: string;
  itemCount: number;
}

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("product_subcategories")
        .select(`
          id,
          subcategory_name,
          subcategory_code,
          product_categories (
            category_name
          )
        `)
        .order("subcategory_name");

      if (fetchError) throw fetchError;

      const formattedSubcategories: Subcategory[] = (data || []).map((s: any) => {
        const catInfo = Array.isArray(s.product_categories) ? s.product_categories[0] : s.product_categories;
        
        return {
          id: s.id,
          subcategory_name: s.subcategory_name,
          parentCategory: catInfo?.category_name || "Uncategorized",
          subcategory_code: s.subcategory_code || "N/A",
          itemCount: 0, // Mocked for now; requires separate count aggregation
        };
      });

      setSubcategories(formattedSubcategories);
    } catch (err: any) {
      console.error("Error fetching subcategories:", err);
      setError("Failed to load inventory subcategories");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<Subcategory>[] = [
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
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.subcategory_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "parentCategory",
      header: "Master Category",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[10px] uppercase">
            {row.getValue("parentCategory")}
        </Badge>
      ),
    },
    {
      accessorKey: "itemCount",
      header: "SKU Density",
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("itemCount")} Products</span>,
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const activeNodesCount = subcategories.length;
  const uncategorizedCount = subcategories.filter(s => s.parentCategory === "Uncategorized").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Inventory Subcategories"
        description="Nested classifications for more granular inventory organization and stock tracking."
        actions={
          <Button className="gap-2 shadow-sm">
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
            { label: "Ref. Nodes", value: activeNodesCount * 3, icon: Tags, color: "text-warning" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                  <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
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
        <DataTable columns={columns} data={subcategories} searchKey="subcategory_name" />
      )}
    </div>
  );
}

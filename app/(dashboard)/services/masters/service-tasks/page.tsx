"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, LayoutTemplate, BriefcaseIcon, Link2, MoreHorizontal, Subtitles, ListTodo, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceMapping {
  id: string;
  serviceCategory: string;
  mappedTasks: string[];
  totalTasks: number;
}

export default function ServiceTaskMappingPage() {
  const [serviceMappings, setServiceMappings] = useState<ServiceMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServiceMappings();
  }, []);

  const fetchServiceMappings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("service_tasks")
        .select("*")
        .order("service_type");

      if (fetchError) throw fetchError;

      // Group by service_type
      const grouped = (data || []).reduce((acc: any, curr: any) => {
        const type = curr.service_type || "General";
        if (!acc[type]) {
          acc[type] = {
            id: `SM-${Object.keys(acc).length + 101}`,
            serviceCategory: type,
            mappedTasks: [],
            totalTasks: 0
          };
        }
        acc[type].mappedTasks.push(curr.task_name);
        acc[type].totalTasks += 1;
        return acc;
      }, {});

      // Convert to array
      const formattedMappings: ServiceMapping[] = Object.values(grouped);

      setServiceMappings(formattedMappings);
    } catch (err: any) {
      console.error("Error fetching service mappings:", err);
      setError("Failed to load service mappings");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<ServiceMapping>[] = [
    {
      accessorKey: "serviceCategory",
      header: "Service Cluster",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
            <LayoutTemplate className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.serviceCategory}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "mappedTasks",
      header: "Core Task Mapping",
      cell: ({ row }) => {
        const displayTasks = row.original.mappedTasks.slice(0, 4);
        return (
          <div className="flex flex-wrap gap-1 max-w-[300px]">
              {displayTasks.map(task => (
                  <Badge key={task} variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-muted/50 border-none">
                      {task}
                  </Badge>
              ))}
              {row.original.totalTasks > displayTasks.length && (
                  <span className="text-[10px] font-bold text-muted-foreground ml-1">+{row.original.totalTasks - displayTasks.length} More</span>
              )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalTasks",
      header: "Schema Depth",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{row.getValue("totalTasks")} Work Items</span>
        </div>
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

  const totalAssignments = serviceMappings.reduce((sum, mapping) => sum + mapping.totalTasks, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Service Wise Work Master"
        description="Categorize specific Work items into broader Service clusters for streamlined reporting and job assignment."
        actions={
          <Button className="gap-2 shadow-sm">
            <Link2 className="h-4 w-4" /> Map Jobs
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
            { label: "Mapped Services", value: serviceMappings.length, icon: Subtitles, sub: "High-level clusters" },
            { label: "Total Assignments", value: totalAssignments, icon: BriefcaseIcon, sub: "Linked work items" },
            { label: "Uncategorized", value: "0", icon: ListTodo, sub: "Pending mapping" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                  <div className="flex items-center justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-primary">
                          <stat.icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                  </div>
                  <div className="flex flex-col text-left">
                      <span className="text-2xl font-bold ">{stat.value}</span>
                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
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
        <DataTable columns={columns} data={serviceMappings} searchKey="serviceCategory" />
      )}
    </div>
  );
}

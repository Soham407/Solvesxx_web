"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Wrench, 
  Clock, 
  Star,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Briefcase,
  Link2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWorkMaster } from "@/hooks/useWorkMaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function WorkMasterPage() {
  const { 
    workItems, 
    serviceWorkLinks,
    isLoading, 
    error, 
    refresh 
  } = useWorkMaster();

  const stats = {
    total: workItems.length,
    linked: serviceWorkLinks.length,
    avgTime: workItems.length > 0 
      ? Math.round(workItems.reduce((acc, w) => acc + (w.standard_time_minutes || 0), 0) / workItems.length)
      : 0,
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "work_code",
      header: "Work Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-xs">{row.getValue("work_code")}</span>
            <span className="text-[10px] text-muted-foreground">{row.original.work_name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {row.getValue("description") || "No description"}
        </span>
      ),
    },
    {
      accessorKey: "standard_time_minutes",
      header: "Standard Time",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold">
            {row.getValue("standard_time_minutes") || "--"} min
          </span>
        </div>
      ),
    },
    {
      accessorKey: "skill_level_required",
      header: "Skill Level",
      cell: ({ row }) => {
        const level = row.getValue("skill_level_required") as string;
        return level ? (
          <Badge variant="outline" className="text-[10px] uppercase font-bold">
            <Star className="h-3 w-3 mr-1 fill-warning text-warning" />
            {level}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not specified</span>
        );
      },
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Work Item</DropdownMenuItem>
              <DropdownMenuItem>Link to Service</DropdownMenuItem>
              <DropdownMenuItem>View History</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Work Master"
        description="Define standardized work items, tasks, and job types that can be linked to service categories."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Work Item
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-critical/10 text-critical border border-critical/20">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex flex-col text-left">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.total}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Work Items</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.linked}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Service Links</span>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-4">
          <div className="flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold">{stats.avgTime}</span>
              )}
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Avg Time (min)</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Work Items Library</CardTitle>
          <CardDescription className="text-xs">
            Standardized tasks and job types for service delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={workItems} searchKey="work_code" />
          )}
        </CardContent>
      </Card>

      {/* Service-Work Links Section */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Service-Work Mappings</CardTitle>
          <CardDescription className="text-xs">
            Work items linked to specific service categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : serviceWorkLinks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {serviceWorkLinks.map((link) => (
                <div 
                  key={link.id} 
                  className="p-4 rounded-xl bg-muted/30 border border-dashed flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {link.service?.service_code}
                    </Badge>
                    <span className="text-xs font-medium">{link.service?.service_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    <span className="text-xs">{link.work?.work_name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No service-work mappings found. Link work items to services to see them here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

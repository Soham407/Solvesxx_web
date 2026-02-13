"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  Wind, 
  Settings, 
  Calendar,
  MoreHorizontal,
  Clock,
  Camera,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useInventory } from "@/hooks/useInventory";
import { ServiceRequestWithDetails } from "@/src/types/phaseB";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ACServicePage() {
  // Real Hooks
  const { 
    requests, 
    isLoading: requestsLoading, 
  } = useServiceRequests();

  const {
    technicians,
    isLoading: techniciansLoading,
  } = useTechnicians();

  const {
    stockLevels,
    isLoading: inventoryLoading,
  } = useInventory();

  // Filter requests for AC Services
  const acRequests = useMemo(() => {
    return requests.filter(r => 
      r.service_name?.toLowerCase().includes("ac") || 
      r.title?.toLowerCase().includes("ac") ||
      r.description?.toLowerCase().includes("ac")
    );
  }, [requests]);

  // Filter inventory for AC related items
  const acStock = useMemo(() => {
    const acTerms = ["ac ", "filter", "gas", "refrigerant", "capacitor", "compressor", "copper pipe"];
    return stockLevels.filter(item => 
      acTerms.some(term => 
        item.product_name?.toLowerCase().includes(term) || 
        item.product_code?.toLowerCase().includes(term)
      )
    );
  }, [stockLevels]);

  const stats = useMemo(() => {
    return {
      active: acRequests.filter(r => r.status === "in_progress" || r.status === "assigned").length,
      lowStock: acStock.filter(item => item.needs_reorder).length,
      avgTime: "3.2h",
      completed: acRequests.filter(r => r.status === "completed").length,
    };
  }, [acRequests, acStock]);

  const columns: ColumnDef<ServiceRequestWithDetails>[] = [
    {
      accessorKey: "request_number",
      header: "Job ID",
      cell: ({ row }) => <span className="font-bold text-xs">{row.original.request_number}</span>,
    },
    {
      accessorKey: "title",
      header: "Service Requester",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.title || "No Title"}</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase">{row.original.location_name || "General"}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Reported Complaint",
      cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "priority",
      header: "Severity",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.getValue("priority") === "urgent" || row.getValue("priority") === "high" 
                ? "bg-critical/5 text-critical border-critical/20" 
                : "bg-info/5 text-info border-info/20"
        )}>
            {row.getValue("priority")}
        </Badge>
      ),
    },
    {
        accessorKey: "status",
        header: "Workflow Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <div className="flex items-center gap-2">
                <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    status === "in_progress" ? "bg-primary animate-pulse" : 
                    status === "completed" ? "bg-success" : "bg-warning"
                )} />
                <span className="text-xs font-bold capitalize">{(status || "").replace('_', ' ')}</span>
            </div>
          );
        },
      },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Camera className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Air Conditioner Services"
        description="Technical staff management, spare parts tracking, and maintenance workflow coordination."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Schedule Visit
            </Button>
            <Button className="gap-2 shadow-lg shadow-primary/20">
               <Wrench className="h-4 w-4" /> New Job Order
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {[
          { label: "Active Jobs", value: stats.active, sub: "Currently assigned", icon: Wind, color: "text-primary" },
          { label: "Spare Parts Low", value: stats.lowStock, sub: "Reorder required", icon: Settings, color: "text-warning" },
          { label: "Avg Resolution", value: stats.avgTime, sub: "From log to fix", icon: Clock, color: "text-info" },
          { label: "Completed Hub", value: stats.completed, sub: "Total this month", icon: CheckCircle2, color: "text-success" },
        ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        {requestsLoading ? (
                             <Skeleton className="h-8 w-12" />
                        ) : (
                            <span className="text-2xl font-bold ">{stat.value}</span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
                </div>
            </Card>
        ))}
      </div>

      <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
                <TabsTrigger value="workflow" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Active Workflow</TabsTrigger>
                <TabsTrigger value="staff" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Technical Staff</TabsTrigger>
                <TabsTrigger value="inventory" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Spare Inventory</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workflow" className="pt-6">
                {requestsLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <DataTable columns={columns} data={acRequests} searchKey="title" />
                )}
            </TabsContent>

            <TabsContent value="staff" className="pt-6">
                {techniciansLoading ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-3">
                        {technicians.map((staff) => (
                            <Card key={staff.id} className="border-none shadow-card ring-1 ring-border">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                                {staff.full_name?.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <CardTitle className="text-sm font-bold">{staff.full_name}</CardTitle>
                                            <CardDescription className="text-[10px]">{staff.designation || 'Technician'}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] pt-3 border-t uppercase font-bold tracking-widest text-muted-foreground">
                                        <span>Primary Skills</span>
                                        <span className="text-foreground">{staff.skills?.slice(0, 2).join(', ')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {staff.certifications?.map((cert, j) => (
                                            <Badge key={j} variant="outline" className="text-[8px] bg-info/5 text-info border-info/20 font-bold uppercase">{cert}</Badge>
                                        ))}
                                        {staff.is_active && (
                                            <Badge variant="outline" className="text-[8px] bg-success/5 text-success border-success/20 font-bold uppercase">Active</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {technicians.length === 0 && (
                            <div className="col-span-3 py-10 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                <CardDescription>No technicians profile found. Add specialists in HRMS.</CardDescription>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="inventory" className="pt-6">
                {inventoryLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {acStock.map((item) => (
                            <Card key={item.product_id} className="border-none shadow-card ring-1 ring-border">
                                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-bold text-left">{item.product_name}</CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-left">{item.product_code}</CardDescription>
                                    </div>
                                    <Badge variant={item.needs_reorder ? "destructive" : "secondary"} className="text-[8px] uppercase font-bold">
                                        {item.needs_reorder ? "Low Stock" : "In Stock"}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col text-left">
                                            <span className="text-2xl font-bold">{item.total_quantity}</span>
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Available</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-bold text-primary">{item.reorder_level || 0}</span>
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Reorder at</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {acStock.length === 0 && (
                            <div className="col-span-full p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                <CardDescription>No dedicated AC inventory found. Map products to AC categories in Master Data.</CardDescription>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
      </Tabs>
    </div>
  );
}

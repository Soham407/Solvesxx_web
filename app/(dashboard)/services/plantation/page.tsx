"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Sprout, 
  Droplet, 
  Leaf, 
  Calendar, 
  UserCheck, 
  MoreHorizontal, 
  History,
  CloudSun,
  MapPin,
  ClipboardCheck,
  TrendingUp,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { usePlantationOps, HorticultureTask } from "@/hooks/usePlantationOps";
import { PlantationInventory } from "@/components/plantation/PlantationInventory";


export default function PlantationPage() {
  const { tasks, zones, seasonalPlans, isLoading } = usePlantationOps();

  const avgSoilHealth = zones.length > 0 
    ? Math.round(zones.reduce((acc, z) => acc + (z.soil_health || 98), 0) / zones.length) 
    : 98;
  const avgGreeneryDensity = zones.length > 0 
    ? Math.round(zones.reduce((acc, z) => acc + (z.greenery_density || 84), 0) / zones.length) 
    : 84;

  const columns: ColumnDef<HorticultureTask>[] = [
    {
      accessorKey: "zone_name",
      header: "Deployment Zone",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-success/50" />
          <span className="font-bold text-sm ">{row.getValue("zone_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "task_type",
      header: "Horticulture Task",
      cell: ({ row }) => <span className="text-sm font-medium text-muted-foreground">{row.getValue("task_type")}</span>,
    },
    {
      accessorKey: "gardener_name",
      header: "Gardener",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
             <Avatar className="h-6 w-6 border">
                <AvatarFallback className="bg-muted text-[8px] font-bold">{row.original.gardener_name?.substring(0,2)}</AvatarFallback>
             </Avatar>
             <span className="text-xs font-bold">{row.original.gardener_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          return (
            <Badge variant="outline" className={cn(
                "font-bold text-[10px] uppercase h-5",
                val === "Completed" ? "bg-success/10 text-success border-success/20" :
                val === "Overdue" ? "bg-critical/10 text-critical border-critical/20 animate-pulse-soft" : "bg-primary/10 text-primary border-primary/20"
            )}>
                {val}
            </Badge>
          );
      }
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

  const stats = [
    { label: "Active Cycles", value: tasks.filter(t => t.status !== 'Completed').length.toString(), sub: "Watering & Pruning", icon: Droplet, color: "text-info" },
    { label: "Gardeners", value: Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean))).length.toString(), sub: "On-site today", icon: UserCheck, color: "text-primary" },
    { label: "Soil Health", value: `${avgSoilHealth}%`, sub: "PH Verified", icon: Leaf, color: "text-success" },
    { label: "Zone Stats", value: zones.length.toString(), icon: CloudSun, color: "text-warning", sub: `Greenery density ${avgGreeneryDensity}%` },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10 font-sans">
      <PageHeader
        title="Plantation Services"
        description="Monitor horticulture activities, soil health, and greenery maintenance cycles across society zones."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <History className="h-4 w-4" /> History
            </Button>
            <Button className="gap-2 shadow-lg shadow-success/20 bg-success hover:bg-success/90">
               <Sprout className="h-4 w-4" /> Schedule Task
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
               <div className="flex items-center gap-4 text-left">
                    <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                    </div>
               </div>
            </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
              <Card className="border-none shadow-card ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b">
                      <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold flex items-center gap-2 italic">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            Pending Field Operations
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px] font-bold bg-success/5 text-success border-success/20">LIVE OPS</Badge>
                      </div>
                  </CardHeader>
                  <DataTable columns={columns} data={tasks} searchKey="zone_name" isLoading={isLoading} />
              </Card>
          </div>
          <div className="space-y-6">
              <Card className="border-none shadow-card ring-1 ring-border">
                  <CardHeader>
                      <CardTitle className="text-sm font-bold ">Horticulture Inventory</CardTitle>
                      <CardDescription className="text-xs">Seeds, Manure, and Tools.</CardDescription>
                  </CardHeader>
                   <CardContent className="space-y-4">
                       <PlantationInventory />
                       <Button variant="ghost" className="w-full text-[10px] font-bold uppercase text-primary tracking-widest mt-2" onClick={() => window.location.href = '/inventory/products'}>Open Store Manager</Button>
                   </CardContent>
              </Card>

              <Card className="border-none shadow-card ring-1 ring-border bg-linear-to-br from-success/5 to-transparent">
                  <CardHeader>
                      <CardTitle className="text-sm font-bold ">Seasonal Planner</CardTitle>
                      <CardDescription className="text-xs italic">Next 30 days forecast.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {seasonalPlans?.length > 0 ? (
                        seasonalPlans.map((plan) => (
                          <div key={plan.id} className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-xs">
                                {plan.month}
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-xs font-bold">{plan.title}</span>
                                  <span className="text-[10px] text-muted-foreground">{plan.description}</span>
                              </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No seasonal plans found.</div>
                      )}
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
}

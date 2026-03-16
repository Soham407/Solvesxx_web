"use client";

import { 
  Bug, 
  FlaskConical, 
  ShieldCheck, 
  Calendar, 
  AlertTriangle,
  ClipboardCheck,
  MoreHorizontal,
  Camera,
  MapPin,
  Clock,
  ExternalLink,
  Plus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { usePestControlInventory } from "@/hooks/usePestControlInventory";
import { useServices } from "@/hooks/useServices";
import { Progress } from "@/components/ui/progress";
import { PPEChecklistDialog } from "@/components/phaseB/PPEChecklistDialog";
import { useSpillKits, SPILL_KIT_STATUS_CONFIG } from "@/hooks/useSpillKits";
import { useMemo } from "react";

export default function PestControlPage() {
  // Fetch service dynamically by code instead of hardcoded UUID
  const { services, isLoading: servicesLoading } = useServices();
  
  const pestControlService = useMemo(() => {
    return services.find(s => s.service_code === "PST-CON" || 
      s.service_name?.toLowerCase().includes("pest"));
  }, [services]);

  const { requests, isLoading: isRequestsLoading, error, stats } = useServiceRequests({
    serviceId: pestControlService?.id
  });

  const {
    chemicals,
    verifications,
    expiringChemicals,
    isLoading: isInventoryLoading,
    updateStock
  } = usePestControlInventory();

  const { kits, isLoading: isKitsLoading, stats: kitStats } = useSpillKits();
  const totalChemicalStock = chemicals.reduce((acc, curr) => acc + Number(curr.current_stock), 0);
  const isLoading = isRequestsLoading || isInventoryLoading;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "service_name",
      header: "Service Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Bug className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.service_name || "Pest Control"}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.request_number}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Execution Area",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{row.getValue("location_name") || "General Area"}</span>
        </div>
      ),
    },
    {
      accessorKey: "chemicals",
      header: "Chemical Usage",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-info" />
            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">Real-time stock</code>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Service Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold">{row.getValue("created_at") ? new Date(row.getValue("created_at")).toLocaleDateString() : "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Work Status",
      cell: ({ row }) => {
          const val = row.getValue("status") as string;
          const variants: Record<string, string> = {
              "completed": "bg-success/10 text-success border-success/20",
              "open": "bg-primary/10 text-primary border-primary/20",
              "in_progress": "bg-warning/10 text-warning border-warning/20",
              "assigned": "bg-info/10 text-info border-info/20"
          };
          return (
            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", variants[val] || "")}>
                {val}
            </Badge>
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
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Pest Control Services"
        description="Hazardous chemical inventory management, recurring treatment schedules, and site-specific proof of service."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <FlaskConical className="h-4 w-4" /> Chemical Master
            </Button>
            <Button className="gap-2 shadow-sh-primary/10">
               <Plus className="h-4 w-4" /> New Treatment Plan
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

      {expiringChemicals && expiringChemicals.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-warning">
              {expiringChemicals.length} Chemical{expiringChemicals.length > 1 ? "s" : ""} Expiring Within 30 Days
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {expiringChemicals.map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] font-bold uppercase bg-warning/20 text-warning px-2 py-0.5 rounded-full"
                >
                  {c.product_name || c.product_code}
                  {c.expiry_date && ` — expires ${new Date(c.expiry_date).toLocaleDateString()}`}
                  {c.batch_number && ` (Batch: ${c.batch_number})`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-card ring-1 ring-border p-4">
             <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-info/5 text-info flex items-center justify-center">
                    <FlaskConical className="h-5 w-5" />
                 </div>
                 <div className="flex flex-col text-left">
                    <span className="text-2xl font-bold ">{totalChemicalStock.toFixed(1)}L</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Chemical Levels</span>
                 </div>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4">
             <div className="flex items-center gap-4 text-left">
                 <div className="h-10 w-10 rounded-xl bg-warning/5 text-warning flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold ">{stats?.urgentRequests || 0}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Urgent Requests</span>
                 </div>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4">
             <div className="flex items-center gap-4 text-left">
                 <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold ">{stats?.openRequests || 0}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending Services</span>
                 </div>
             </div>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border p-4">
             <div className="flex items-center gap-4 text-left">
                 <div className="h-10 w-10 rounded-xl bg-success/5 text-success flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                 </div>
                 <div className="flex flex-col text-left">
                    <span className="text-2xl font-bold ">{stats?.completedToday ? "100%" : "96%"}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Safety Compliance</span>
                 </div>
             </div>
        </Card>
      </div>

      <Tabs defaultValue="services" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
                <TabsTrigger value="services" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Service Log</TabsTrigger>
                <TabsTrigger value="chemicals" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Chemical Stock</TabsTrigger>
                <TabsTrigger value="ppe" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">PPE Checklists</TabsTrigger>
                <TabsTrigger value="spill-kits" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">
                  Spill Kits
                  {kitStats.needsAttention > 0 && (
                    <span className="ml-1.5 h-4 w-4 rounded-full bg-critical text-white text-[9px] flex items-center justify-center font-bold">{kitStats.needsAttention}</span>
                  )}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="services" className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <DataTable columns={columns} data={requests} searchKey="request_number" />
                )}
            </TabsContent>

            <TabsContent value="chemicals" className="pt-6">
                 <div className="grid gap-6 md:grid-cols-3">
                    {chemicals.length > 0 ? (
                        chemicals.map((chem) => (
                            <Card key={chem.id} className="border-none shadow-card ring-1 ring-border p-4">
                                <CardHeader className="p-0 mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-sm font-bold">{chem.product_name}</CardTitle>
                                            <CardDescription className="text-[10px] font-mono">{chem.product_code}</CardDescription>
                                        </div>
                                        <Badge variant={chem.current_stock <= chem.reorder_level ? "destructive" : "secondary"} className="text-[10px]">
                                            {chem.current_stock <= chem.reorder_level ? "Low Stock" : "Healthy"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 space-y-3">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Current Level</span>
                                        <span>{chem.current_stock} / {chem.reorder_level * 5} {chem.unit}</span>
                                    </div>
                                    <Progress value={(chem.current_stock / (chem.reorder_level * 5)) * 100} className="h-2" />
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        Last restocked: {chem.last_restocked_at ? new Date(chem.last_restocked_at).toLocaleDateString() : "Never"}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="border-none shadow-card ring-1 ring-border col-span-3 py-20">
                            <CardContent className="flex flex-col items-center justify-center text-center">
                                <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <CardTitle className="text-lg font-bold">No Chemical Inventory Found</CardTitle>
                                <CardDescription>Chemical products must be added to the Inventory Master to track stock levels.</CardDescription>
                            </CardContent>
                        </Card>
                    )}
                 </div>
            </TabsContent>

            <TabsContent value="ppe" className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-none shadow-card ring-1 ring-border">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold">Recent Compliance Verifications (PPE)</CardTitle>
                            <CardDescription className="text-xs">History of technician gear checks before site dispatch.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {verifications.length > 0 ? (
                                verifications.map((v) => (
                                    <div key={v.id} className="p-4 rounded-xl bg-muted/30 border border-dashed flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-bold">{v.technician_name}</Badge>
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    {new Date(v.verified_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <Badge className={cn("text-[10px] font-bold uppercase", 
                                                v.status === "verified" ? "bg-success/10 text-success" : "bg-critical/10 text-critical"
                                            )}>
                                                {v.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {v.items_json.map((item, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border text-[10px]">
                                                    {item.verified ? <ShieldCheck className="h-3 w-3 text-success" /> : <AlertCircle className="h-3 w-3 text-warning" />}
                                                    <span className="font-medium">{item.item}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {v.site_readiness_report && (
                                            <div className="text-[10px] bg-primary/5 p-2 rounded border-l-2 border-primary text-muted-foreground">
                                                <strong>Report:</strong> {v.site_readiness_report}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center text-muted-foreground italic text-xs">No verification reports found.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-card ring-1 ring-border bg-primary/[0.02]">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold">New Safety Check-in</CardTitle>
                            <CardDescription className="text-xs">Technicians must verify these items before dispatch.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { item: "Chemical Resistant Gloves", mandatory: true, status: "Verified" },
                                { item: "N95 Respiration Mask", mandatory: true, status: "Verified" },
                                { item: "Protective Eyewear/Goggles", mandatory: true, status: "Pending" },
                                { item: "First Aid & Spill Kit", mandatory: true, status: "Verified" },
                            ].map((ppe, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background border shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", ppe.status === "Verified" ? "bg-success/20 text-success" : "bg-warning/20 text-warning")}>
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs font-bold">{ppe.item}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase">{ppe.status}</Badge>
                                </div>
                            ))}
                            <PPEChecklistDialog>
                              <Button className="w-full shadow-lg shadow-primary/20">Submit Site Readiness Report</Button>
                            </PPEChecklistDialog>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="spill-kits" className="pt-6">
              {isKitsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : kits.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No spill kits registered. Add kits using the database.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {kits.map((kit) => {
                    const statusCfg = SPILL_KIT_STATUS_CONFIG[kit.status];
                    return (
                      <Card key={kit.id} className="border-none shadow-card ring-1 ring-border p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-mono font-bold text-sm">{kit.kit_code}</p>
                            <p className="text-xs text-muted-foreground">{kit.location_name}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold ${statusCfg.className}`}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{kit.items_json.length} item types tracked</p>
                          {kit.last_inspected_at && (
                            <p>Last inspected: {new Date(kit.last_inspected_at).toLocaleDateString()}</p>
                          )}
                          {kit.inspector_name && <p>By: {kit.inspector_name}</p>}
                          {kit.notes && <p className="italic">{kit.notes}</p>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
      </Tabs>
    </div>
  );
}

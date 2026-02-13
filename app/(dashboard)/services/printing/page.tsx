"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  UserSquare2, 
  Map as MapIcon, 
  Image as ImageIcon, 
  Plus, 
  MoreHorizontal,
  Layout,
  FileText,
  BadgeCent,
  Loader2,
  AlertCircle,
  BadgeCheck,
  Calendar
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { usePrintingMaster } from "@/hooks/usePrintingMaster";
import { formatCurrency } from "@/src/lib/utils/currency";

export default function PrintingAdvertisingPage() {
  const { requests, isLoading: isRequestsLoading, error } = useServiceRequests({
    serviceId: "e76b5c1c-333e-4b68-8a8b-3e5f7f38d330" // PRN-ADV service ID
  });

  const { adSpaces, isLoading: isMasterLoading } = usePrintingMaster();

  const totalRevenue = adSpaces
    .filter(s => s.status === 'occupied')
    .reduce((acc, curr) => acc + curr.base_rate_paise, 0);

  const isLoading = isRequestsLoading || isMasterLoading;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "request_number",
      header: "Job ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <Printer className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.service_name || "Printing Job"}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.getValue("request_number")}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Location",
      cell: ({ row }) => <span className="text-xs font-medium">{row.getValue("location_name") || "Operations Hub"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Requested On",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold">{new Date(row.original.created_at).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Printing & Advertising"
        description="Internal document generation, staff ID portal, and society ad-space monetization management."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
               <Printer className="h-4 w-4" /> Bulk Print
            </Button>
            <Button className="gap-2 shadow-sm">
               <Plus className="h-4 w-4" /> Register Ad Space
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-critical/10 text-critical border border-critical/20 mb-6">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-card ring-1 ring-border p-6 flex flex-col gap-4 group cursor-pointer hover:ring-primary/20 transition-all">
            <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <UserSquare2 className="h-5 w-5" />
                </div>
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-lg font-bold">Personnel ID Portal</span>
                <span className="text-xs text-muted-foreground">Automatically generate staff & guard cards.</span>
            </div>
        </Card>

        <Card className="border-none shadow-card ring-1 ring-border p-6 flex flex-col gap-4 group cursor-pointer hover:ring-primary/20 transition-all">
            <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-info/5 text-info flex items-center justify-center group-hover:bg-info group-hover:text-white transition-all">
                    <FileText className="h-5 w-5" />
                </div>
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-lg font-bold">Document Templates</span>
                <span className="text-xs text-muted-foreground">Water cut alerts, meeting minutes, etc.</span>
            </div>
        </Card>

        <Card className="border-none shadow-premium bg-linear-to-br from-indigo-600 to-indigo-800 text-white p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <BadgeCent className="h-5 w-5 font-bold" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Ad Revenue</span>
            </div>
            <div className="flex flex-col text-left">
                <span className="text-2xl font-bold ">{formatCurrency(totalRevenue)}</span>
                <span className="text-[10px] font-bold text-white/60 uppercase mt-0.5">Projected Monthly Earning</span>
            </div>
        </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
                <TabsTrigger value="history" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Usage Logs</TabsTrigger>
                <TabsTrigger value="adspace" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Ad-Space Master</TabsTrigger>
                <TabsTrigger value="printing" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Internal Printing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <DataTable columns={columns} data={requests} searchKey="request_number" />
                )}
            </TabsContent>

            <TabsContent value="adspace" className="pt-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {adSpaces.length > 0 ? (
                        adSpaces.map((space) => (
                            <Card key={space.id} className="border-none shadow-card ring-1 ring-border p-4">
                                <CardHeader className="p-0 mb-4 flex-row justify-between items-start space-y-0 text-left">
                                    <div className="flex flex-col gap-1">
                                        <CardTitle className="text-sm font-bold">{space.space_name}</CardTitle>
                                        <CardDescription className="text-[10px] flex items-center gap-1">
                                            <MapIcon className="h-2.5 w-2.5" /> {space.location_description}
                                        </CardDescription>
                                    </div>
                                    <Badge className={cn("text-[10px] h-5", 
                                        space.status === 'available' ? "bg-success/10 text-success border-success/20" :
                                        space.status === 'occupied' ? "bg-primary/10 text-primary border-primary/20" :
                                        "bg-warning/10 text-warning border-warning/20"
                                    )} variant="outline">
                                        {space.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-0 space-y-4">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Dimensions</span>
                                        <span className="font-bold">{space.dimensions || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Rate Card</span>
                                        <span className="font-bold text-primary">{formatCurrency(space.base_rate_paise)}/mo</span>
                                    </div>
                                    {space.asset_name && (
                                        <div className="text-[10px] bg-muted/50 p-2 rounded flex items-center gap-2">
                                            <Layout className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-muted-foreground">Linked to: <strong>{space.asset_name}</strong></span>
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" className="w-full text-[10px] h-8 font-bold border-dashed">
                                        Manage Inventory
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                            <CardDescription>Register society assets (lifts, notice boards) as ad-spaces to track revenue.</CardDescription>
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="printing" className="pt-6">
                <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                    <CardDescription>UI for automated generation of long-term Visitor Passes and ID Cards.</CardDescription>
                </div>
            </TabsContent>
      </Tabs>
    </div>
  );
}

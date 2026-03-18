"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Home, 
  Car, 
  Search, 
  MoreHorizontal, 
  Phone, 
  UserPlus,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Resident {
  id: string;
  full_name: string;
  flat_number: string;
  building_name: string;
  mobile: string;
  family_count?: number; 
  vehicle_numbers: string[];
  relation: "Owner" | "Tenant" | string;
  photo_url?: string;
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalFlats: 0,
    totalResidents: 0,
    totalVehicles: 0
  });

  // Flat data for form
  const [flats, setFlats] = useState<any[]>([]);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', relation: 'Owner', flat_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchResidents();
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    const { data } = await supabase.from('flats').select('id, flat_number, buildings(building_name)').eq('is_active', true);
    if (data) {
       setFlats(data.map((f: any) => ({
         id: f.id,
         flat_number: f.flat_number,
         building_name: Array.isArray(f.buildings) ? f.buildings[0]?.building_name : f.buildings?.building_name
       })));
    }
  };

  const fetchResidents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("residents")
        .select(`
          id,
          full_name,
          phone,
          relation,
          flat_id,
          flats (
            id,
            flat_number,
            building_id,
            buildings (
              id,
              building_name
            )
          )
        `)
        .eq("is_active", true)
        .order("full_name");

      if (fetchError) throw fetchError;

      let vehicleCount = 0;
      const uniqueFlats = new Set<string>();

      const formattedResidents: Resident[] = (data || []).map((r: any) => {
        // Handle array or object returns for flats relation
        const flatData = Array.isArray(r.flats) ? r.flats[0] : r.flats;
        const buildingData = flatData ? (Array.isArray(flatData.buildings) ? flatData.buildings[0] : flatData.buildings) : null;

        const flatNo = flatData?.flat_number || "N/A";
        const bldg = buildingData?.building_name || "";
        const flatIdent = `${bldg}-${flatNo}`;
        if (flatData?.id) {
          uniqueFlats.add(flatData.id);
        }
        
        // We will default to empty vehicles as it's not present in residents table natively (it's in a separate table/relation)
        const vehicles: string[] = []; // Update this to match schema if a vehicles table exists
        vehicleCount += vehicles.length;

        return {
          id: r.id,
          full_name: r.full_name,
          mobile: r.phone || r.alternate_phone || "",
          vehicle_numbers: vehicles,
          relation: r.relation || "Resident",
          photo_url: undefined, // Update with correct profile photo field if there is one
          flat_number: flatNo,
          building_name: bldg,
        };
      });

      setResidents(formattedResidents);
      setStats({
        totalFlats: uniqueFlats.size,
        totalResidents: formattedResidents.length,
        totalVehicles: vehicleCount
      });
    } catch (err: any) {
      console.error("Error fetching residents:", err);
      setError("Failed to load resident directory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (residents.length === 0) return;
    const headers = ["Name", "Mobile", "Flat", "Building", "Relation", "Vehicles"];
    const rows = residents.map(r => [
        `"${r.full_name}"`, 
        `"${r.mobile}"`, 
        `"${r.flat_number}"`, 
        `"${r.building_name}"`, 
        `"${r.relation}"`, 
        `"${(r.vehicle_numbers || []).join(", ")}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "residents_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateResident = async () => {
    if(!formData.full_name || !formData.flat_id) {
        setError("Full name and Flat selection are required");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const resArr = new Uint8Array(3);
      crypto.getRandomValues(resArr);
      const userCode = "RES-" + Array.from(resArr).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const { error: insertError } = await supabase.from('residents').insert({
         full_name: formData.full_name,
         phone: formData.phone,
         relation: formData.relation,
         flat_id: formData.flat_id,
         resident_code: userCode,
         is_active: true
      });
      if(insertError) throw insertError;
      setIsDialogOpen(false);
      setFormData({ full_name: '', phone: '', relation: 'Owner', flat_id: '' });
      fetchResidents();
    } catch(e: any) {
       console.error(e);
       setError(e.message || "Failed to register resident");
    } finally {
       setIsSubmitting(false);
    }
 };

  const columns: ColumnDef<Resident>[] = [
    {
      accessorKey: "flat_number",
      header: "Address / Flat",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Flat {row.original.flat_number}</span>
            <span className="text-[10px] text-muted-foreground">{row.original.building_name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Primary Resident",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar className="h-8 w-8 border">
            {row.original.photo_url ? (
               <AvatarImage src={row.original.photo_url} alt={row.original.full_name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {row.original.full_name.split(" ").map((n) => n[0]).join("").substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{row.original.mobile || "No Contact"}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "vehicle_numbers",
      header: "Authorized Vehicles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.vehicle_numbers && row.original.vehicle_numbers.length > 0 ? (
             row.original.vehicle_numbers.map((v, i) => (
               <Badge key={i} variant="outline" className="text-[9px] font-mono h-4 border-muted-foreground/20">
                 <Car className="h-2.5 w-2.5 mr-1" /> {v}
               </Badge>
             ))
          ) : (
            <span className="text-xs text-muted-foreground italic">No Vehicles</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "relation",
      header: "Occupancy",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.getValue("relation")?.toString().toLowerCase() === "owner" ? "bg-success/5 text-success border-success/20" : "bg-info/5 text-info border-info/20"
        )}>
            {row.original.relation}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Phone className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
             </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Family & Resident Database"
        description="Searchable directory of flat numbers, authorized family members, and registered vehicles for quick gate verification."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={residents.length === 0}>
               <Search className="h-4 w-4" /> Export CSV
            </Button>
            <Button className="gap-2 shadow-sm" onClick={() => setIsDialogOpen(true)}>
               <UserPlus className="h-4 w-4" /> Register Family
            </Button>
          </div>
        }
      />

      {error && (
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Registered Flats", value: stats.totalFlats, icon: Home, sub: "Active residents only" },
          { label: "Total Residents", value: stats.totalResidents, icon: Users, sub: "Primary members" },
          { label: "Verified Vehicles", value: stats.totalVehicles, icon: Car, sub: "Registered tags active" },
        ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary">
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col text-left">
                        {isLoading ? (
                           <div className="h-8 w-16 bg-muted animate-pulse rounded my-1" />
                        ) : (
                           <span className="text-2xl font-bold ">{stat.value}</span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.sub}</span>
                    </div>
                 </div>
            </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={residents} searchKey="full_name" />
      )}

      {/* Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Register Family / Resident</DialogTitle>
            <DialogDescription>
              Link a new primary resident to a flat to generate their access credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flat">Assign Flat *</Label>
              <Select value={formData.flat_id} onValueChange={(val) => setFormData({ ...formData, flat_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {flats.map((flat) => (
                    <SelectItem key={flat.id} value={flat.id}>
                      {flat.building_name ? `${flat.building_name} - ` : ''}Flat {flat.flat_number}
                    </SelectItem>
                  ))}
                  {flats.length === 0 && (
                     <SelectItem value="none" disabled>No active flats found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="relation">Occupancy Type</Label>
              <Select value={formData.relation} onValueChange={(val) => setFormData({ ...formData, relation: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Tenant">Tenant</SelectItem>
                  <SelectItem value="Family Member">Family Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateResident} disabled={isSubmitting || !formData.full_name || !formData.flat_id}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

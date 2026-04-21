"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Users,
  Home,
  Search,
  MoreHorizontal,
  Phone,
  UserPlus,
  Loader2,
  AlertCircle,
  KeyRound
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
  resident_code: string;
  full_name: string;
  flat_id: string | null;
  flat_number: string;
  building_name: string;
  mobile: string;
  call_phone: string | null;
  relation: "Owner" | "Tenant" | string;
  photo_url?: string;
  is_primary_contact?: boolean;
  auth_linked: boolean;
  role_name: string | null;
  must_change_password: boolean;
  active_push_tokens: number;
  unread_notifications: number;
  total_visitors: number;
  pending_visitors: number;
  denied_visitors: number;
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
  const [formData, setFormData] = useState({ full_name: '', phone: '', relation: 'Owner', flat_id: '', email: '', temp_password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

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
      const supportResponse = await fetch("/api/society/residents", { method: "GET" });
      const payload = await supportResponse.json();
      if (!supportResponse.ok) {
        throw new Error(payload.error || "Failed to load resident support data");
      }

      const residentIds = (payload.residents || []).map((resident: any) => resident.id).filter(Boolean);
      const directoryResult =
        residentIds.length > 0
          ? await supabase
              .from("resident_directory")
              .select("id, full_name, flat_number, building_name, is_primary_contact, masked_phone")
              .in("id", residentIds)
              .eq("is_active", true)
          : { data: [], error: null };

      if (directoryResult.error) {
        throw directoryResult.error;
      }

      const uniqueFlats = new Set<string>();
      const supportByResidentId = new Map<string, any>(
        (payload.residents || []).map((resident: any) => [resident.id, resident])
      );
      const directoryByResidentId = new Map<string, any>(
        ((directoryResult.data || []) as any[]).map((residentView) => [residentView.id, residentView])
      );

      const formattedResidents: Resident[] = (payload.residents || []).map((support: any) => {
        const residentView = directoryByResidentId.get(support.id) ?? null;
        const flatNo = support?.flat_number || residentView.flat_number || "N/A";
        const bldg = support?.building_name || residentView.building_name || "";
        uniqueFlats.add(`${bldg}-${flatNo}`);

        return {
          id: support.id,
          resident_code: support?.resident_code || "",
          full_name: residentView?.full_name || support?.full_name || "Resident",
          flat_id: support?.flat_id || null,
          mobile: support?.phone || residentView?.masked_phone || "",
          call_phone: support?.phone || null,
          relation: support?.relation || "Resident",
          photo_url: undefined, // Update with correct profile photo field if there is one
          is_primary_contact: Boolean(residentView?.is_primary_contact),
          flat_number: flatNo,
          building_name: bldg,
          auth_linked: Boolean(support?.auth_linked),
          role_name: support?.role_name || null,
          must_change_password: Boolean(support?.must_change_password),
          active_push_tokens: Number(support?.active_push_tokens || 0),
          unread_notifications: Number(support?.unread_notifications || 0),
          total_visitors: Number(support?.total_visitors || 0),
          pending_visitors: Number(support?.pending_visitors || 0),
          denied_visitors: Number(support?.denied_visitors || 0),
        };
      });

      setResidents(formattedResidents);
      setStats({
        totalFlats: uniqueFlats.size,
        totalResidents: formattedResidents.length,
        totalVehicles: formattedResidents.filter((resident) => resident.auth_linked).length
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
    const headers = ["Name", "Contact", "Flat", "Building", "Relation", "Login", "Push Tokens", "Unread Alerts"];
    const rows = residents.map(r => [
        `"${r.full_name}"`, 
        `"${r.mobile}"`, 
        `"${r.flat_number}"`, 
        `"${r.building_name}"`, 
        `"${r.relation}"`, 
        `"${r.auth_linked ? "Linked" : "No Login"}"`,
        `"${r.active_push_tokens}"`,
        `"${r.unread_notifications}"`
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
    if (formData.email && !formData.temp_password) {
        setError("Please enter a temporary password for the login account.");
        return;
    }
    if (formData.temp_password && formData.temp_password.length < 8) {
        setError("Temporary password must be at least 8 characters.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/society/residents", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           flat_id: formData.flat_id,
           full_name: formData.full_name,
           phone: formData.phone,
           relation: formData.relation,
           email: formData.email || undefined,
           temp_password: formData.temp_password || undefined,
         }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to register resident");

      setIsDialogOpen(false);
      setFormData({ full_name: '', phone: '', relation: 'Owner', flat_id: '', email: '', temp_password: '' });
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
      accessorKey: "mobile",
      header: "Phone",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.mobile || "Not provided"}</span>
          <span className="text-[10px] text-muted-foreground font-medium">{row.original.resident_code}</span>
        </div>
      ),
    },
    {
      accessorKey: "is_primary_contact",
      header: "Household Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
          {row.original.is_primary_contact ? "Primary Contact" : "Family Member"}
        </Badge>
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
      id: "provisioning",
      header: "Provisioning Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase font-bold px-2 py-0.5",
              row.original.auth_linked
                ? "bg-success/5 text-success border-success/20"
                : "bg-warning/5 text-warning border-warning/20"
            )}
          >
            {row.original.auth_linked ? "Auth Linked" : "No Login"}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
            {row.original.flat_id ? "Flat Linked" : "Flat Missing"}
          </Badge>
          {row.original.role_name && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
              {row.original.role_name}
            </Badge>
          )}
          {row.original.must_change_password && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5 bg-info/5 text-info border-info/20">
              Password Reset Pending
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "support",
      header: "Support Signals",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase font-bold px-2 py-0.5",
              row.original.active_push_tokens > 0
                ? "bg-success/5 text-success border-success/20"
                : "bg-warning/5 text-warning border-warning/20"
            )}
          >
            {row.original.active_push_tokens > 0
              ? `${row.original.active_push_tokens} Push Token`
              : "No Push Token"}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
            {row.original.unread_notifications} Unread Alerts
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5">
            {row.original.pending_visitors} Pending Visitors
          </Badge>
          {row.original.denied_visitors > 0 && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5 bg-critical/5 text-critical border-critical/20">
              {row.original.denied_visitors} Denied
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
             <Button
               variant="ghost"
               size="icon"
              className="h-8 w-8 text-primary"
              disabled={!row.original.call_phone}
              onClick={() => {
                 if (row.original.call_phone) {
                   window.location.href = `tel:${row.original.call_phone}`;
                 }
               }}
             >
                <Phone className="h-4 w-4" />
             </Button>
             <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8"
               onClick={() => setSelectedResident(row.original)}
             >
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
          { label: "Login Linked", value: stats.totalVehicles, icon: Phone, sub: "Accounts ready for app use" },
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
            {/* Optional login account section */}
            <div className="border-t pt-4 mt-2 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <KeyRound className="h-3.5 w-3.5" />
                Login Account <span className="normal-case font-normal">(optional)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Fill in to create app access for this resident. Leave blank for family members who don&apos;t need login.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="resident@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="temp_password">Temporary Password</Label>
                <Input
                  id="temp_password"
                  type="password"
                  value={formData.temp_password}
                  onChange={(e) => setFormData({ ...formData, temp_password: e.target.value })}
                  placeholder="Min. 8 characters"
                />
              </div>
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

      <Dialog open={Boolean(selectedResident)} onOpenChange={(open) => !open && setSelectedResident(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Resident Support Details</DialogTitle>
            <DialogDescription>
              Provisioning and support signals for this resident account.
            </DialogDescription>
          </DialogHeader>
          {selectedResident && (
            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">{selectedResident.full_name}</p>
                <p className="text-muted-foreground">
                  {selectedResident.building_name ? `${selectedResident.building_name} / ` : ""}Flat {selectedResident.flat_number}
                </p>
                <p className="text-muted-foreground">{selectedResident.mobile || "No contact number"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Login</div>
                  <div className="mt-1 font-semibold">{selectedResident.auth_linked ? "Linked" : "Missing"}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Flat Link</div>
                  <div className="mt-1 font-semibold">{selectedResident.flat_id ? "Present" : "Missing"}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Push Tokens</div>
                  <div className="mt-1 font-semibold">{selectedResident.active_push_tokens}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Unread Alerts</div>
                  <div className="mt-1 font-semibold">{selectedResident.unread_notifications}</div>
                </Card>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedResident.must_change_password && (
                  <Badge variant="outline" className="bg-info/5 text-info border-info/20">
                    Password Reset Pending
                  </Badge>
                )}
                {selectedResident.denied_visitors > 0 && (
                  <Badge variant="outline" className="bg-critical/5 text-critical border-critical/20">
                    {selectedResident.denied_visitors} denied visitors
                  </Badge>
                )}
                <Badge variant="outline">{selectedResident.pending_visitors} pending visitors</Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedResident(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

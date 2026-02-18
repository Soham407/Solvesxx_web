"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Home, Users, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Resident {
  id: string;
  full_name: string;
  flat_number: string;
  building_name: string;
  mobile: string;
  is_verified: boolean;
  photo_url?: string;
  vehicle_numbers?: string[];
  emergency_contact?: string;
}

export function FamilyDirectory() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("residents")
        .select(`
          id,
          full_name,
          mobile,
          is_verified,
          photo_url,
          vehicle_numbers,
          emergency_contact,
          flats!resident_flat_id_fkey (
            flat_number,
            building_id,
            buildings!building_id (
              building_name
            )
          )
        `)
        .eq("is_active", true)
        .order("full_name");

      if (fetchError) throw fetchError;

      const formattedResidents: Resident[] = (data || []).map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
        mobile: r.mobile,
        is_verified: r.is_verified,
        photo_url: r.photo_url,
        vehicle_numbers: r.vehicle_numbers || [],
        emergency_contact: r.emergency_contact,
        flat_number: r.flats?.flat_number || "N/A",
        building_name: r.flats?.buildings?.building_name || "N/A",
      }));

      setResidents(formattedResidents);
    } catch (err) {
      console.error("Error fetching residents:", err);
      setError("Failed to load resident directory");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<Resident>[] = [
    {
      accessorKey: "full_name",
      header: "Resident",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {row.original.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.original.full_name}</span>
            <span className="text-[10px] text-muted-foreground">
              {row.original.is_verified ? "Verified Resident" : "Unverified"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "flat_number",
      header: "Residence",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-xs font-medium">Flat {row.original.flat_number}</span>
            <span className="text-[10px] text-muted-foreground">{row.original.building_name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "mobile",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono">{row.original.mobile || "N/A"}</span>
        </div>
      ),
    },
    {
      accessorKey: "vehicle_numbers",
      header: "Vehicles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.vehicle_numbers && row.original.vehicle_numbers.length > 0 ? (
            row.original.vehicle_numbers.map((vehicle, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                {vehicle}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No vehicles</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "emergency_contact",
      header: "Emergency",
      cell: ({ row }) => (
        row.original.emergency_contact ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-critical" />
            <span className="text-xs font-mono">{row.original.emergency_contact}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not provided</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Society Resident Directory
          </CardTitle>
          <CardDescription className="text-xs">
            Verified residents for guard-side visitor verification. Total: {residents.length} residents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <DataTable columns={columns} data={residents} searchKey="full_name" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

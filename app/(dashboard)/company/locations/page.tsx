"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Navigation, Map as MapIcon, MoreHorizontal, Radio, Loader2, AlertCircle } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/src/lib/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationPoint {
  id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  geo_fence_radius: number;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("company_locations")
        .select("*")
        .order("location_name");

      if (fetchError) throw fetchError;
      setLocations(data || []);
    } catch (err: any) {
      console.error("Error fetching locations:", err);
      setError("Failed to load company locations");
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<LocationPoint>[] = [
    {
      accessorKey: "location_name",
      header: "Site / Point Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.location_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.location_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location_type",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium">
          {row.getValue("location_type") || "Generic Space"}
        </Badge>
      ),
    },
    {
      accessorKey: "geo_fence_radius",
      header: "Geo-Fence Radius",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <Radio className="h-3 w-3 text-warning animate-pulse" />
           <span className="text-xs font-bold text-foreground/80">{row.getValue("geo_fence_radius") || 0} Meters</span>
        </div>
      ),
    },
    {
      id: "coordinates",
      header: "GPS Mapping",
      cell: ({ row }) => {
        const lat = row.original.latitude;
        const lng = row.original.longitude;
        if (lat && lng) {
          return (
            <code className="text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
              {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
            </code>
          );
        }
        return <span className="text-[10px] text-muted-foreground italic">Not mapped</span>;
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${row.original.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
           <span className="text-sm font-bold">{row.original.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Adjust Radius</DropdownMenuItem>
            <DropdownMenuItem>View Guard Logs</DropdownMenuItem>
            <DropdownMenuItem>Test Geo-Fence</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Company Location Master"
        description="Catalog of physical sites and GPS-enabled geo-fencing points for staff tracking."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <MapIcon className="h-4 w-4" /> View Map Layout
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Register Site
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

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
             <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <DataTable columns={columns} data={locations} searchKey="location_name" />
        )}
      </div>
    </div>
  );
}

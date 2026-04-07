"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Edit, MapPin, MoreHorizontal, Plus, Radio } from "lucide-react";

import { CompanyLocationDialog } from "@/components/dialogs/CompanyLocationDialog";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyLocations } from "@/hooks/useCompanyLocations";
import { CompanyLocation } from "@/src/types/company";

export default function LocationsPage() {
  const { locations, isLoading, error, refresh, updateLocation } = useCompanyLocations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);

  const handleAdd = () => {
    setSelectedLocation(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (location: CompanyLocation) => {
    setSelectedLocation(location);
    setIsDialogOpen(true);
  };

  const handleStatusToggle = async (location: CompanyLocation) => {
    await updateLocation({
      id: location.id,
      payload: {
        is_active: location.is_active === false,
      },
    });
  };

  const columns: ColumnDef<CompanyLocation>[] = [
    {
      accessorKey: "location_name",
      header: "Site / Point Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.location_name}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              {row.original.location_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location_type",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium">
          {row.original.location_type || "Generic Space"}
        </Badge>
      ),
    },
    {
      accessorKey: "geo_fence_radius",
      header: "Geo-Fence Radius",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Radio className="h-3 w-3 text-warning" />
          <span className="text-xs font-bold text-foreground/80">
            {row.original.geo_fence_radius ?? 0} Meters
          </span>
        </div>
      ),
    },
    {
      id: "coordinates",
      header: "GPS Mapping",
      cell: ({ row }) => {
        const { latitude, longitude } = row.original;
        if (typeof latitude === "number" && typeof longitude === "number") {
          return (
            <code className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </code>
          );
        }

        return (
          <span className="text-[10px] italic text-muted-foreground">
            Not mapped
          </span>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.address || "Address not recorded"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              row.original.is_active ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          <span className="text-sm font-bold">
            {row.original.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Site
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusToggle(row.original)}>
              {row.original.is_active ? "Deactivate Site" : "Activate Site"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Company Location Master"
        description="Maintain physical sites and geo-fence points used across attendance, security, service, and inventory workflows."
        actions={
          <Button className="gap-2" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Register Site
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={locations}
        searchKey="location_name"
        isLoading={isLoading}
      />

      <CompanyLocationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        location={selectedLocation}
        onSuccess={refresh}
      />
    </div>
  );
}

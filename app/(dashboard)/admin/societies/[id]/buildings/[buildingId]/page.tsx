"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useFlats, FlatRow, CreateFlatPayload } from "@/hooks/useFlats";
import { supabase } from "@/src/lib/supabaseClient";
import type { BuildingRow } from "@/hooks/useBuildings";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

const FLAT_TYPES = ["1bhk", "2bhk", "3bhk", "penthouse"] as const;
const OWNERSHIP_TYPES = ["owner", "tenant"] as const;

const emptyForm: CreateFlatPayload = {
  flat_number: "",
  floor_number: undefined,
  flat_type: undefined,
  area_sqft: undefined,
  ownership_type: undefined,
};

function flatTypeBadge(type: string | null) {
  if (!type) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <Badge variant="outline" className="text-[10px] uppercase font-bold">
      {type.toUpperCase()}
    </Badge>
  );
}

function occupancyBadge(isOccupied: boolean | null) {
  return isOccupied ? (
    <Badge className="text-[10px] uppercase font-bold border-warning/20 bg-warning/10 text-warning">
      Occupied
    </Badge>
  ) : (
    <Badge className="text-[10px] uppercase font-bold border-success/20 bg-success/10 text-success">
      Vacant
    </Badge>
  );
}

export default function BuildingDetailPage() {
  const { id: societyId, buildingId } = useParams<{ id: string; buildingId: string }>();
  const router = useRouter();

  const [building, setBuilding] = useState<BuildingRow | null>(null);
  const [societyName, setSocietyName] = useState<string>("");
  const [buildingLoading, setBuildingLoading] = useState(true);

  const {
    flats,
    isLoading,
    stats,
    createFlat,
    updateFlat,
    deactivateFlat,
    isCreating,
    isUpdating,
  } = useFlats(societyId, buildingId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FlatRow | null>(null);
  const [form, setForm] = useState<CreateFlatPayload>(emptyForm);

  useEffect(() => {
    if (!buildingId || !societyId) return;
    setBuildingLoading(true);
    Promise.all([
      supabase.from("buildings").select("*").eq("id", buildingId).single(),
      supabase.from("societies").select("society_name").eq("id", societyId).single(),
    ]).then(([buildingRes, societyRes]) => {
      setBuilding(buildingRes.data as BuildingRow | null);
      setSocietyName((societyRes.data as any)?.society_name ?? "");
      setBuildingLoading(false);
    });
  }, [buildingId, societyId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(flat: FlatRow) {
    setEditing(flat);
    setForm({
      flat_number: flat.flat_number ?? "",
      floor_number: flat.floor_number ?? undefined,
      flat_type: (flat.flat_type as any) ?? undefined,
      area_sqft: flat.area_sqft ?? undefined,
      ownership_type: (flat.ownership_type as any) ?? undefined,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.flat_number.trim()) return;

    if (editing) {
      const result = await updateFlat({ id: editing.id, ...form });
      if (result.success) setDialogOpen(false);
    } else {
      const result = await createFlat(form);
      if (result.success) setDialogOpen(false);
    }
  }

  async function handleToggleOccupied(flat: FlatRow) {
    await updateFlat({ id: flat.id, is_occupied: !flat.is_occupied });
  }

  const columns = useMemo<ColumnDef<FlatRow>[]>(
    () => [
      {
        accessorKey: "flat_number",
        header: "Flat No.",
        cell: ({ row }) => (
          <span className="font-semibold font-mono">{row.original.flat_number}</span>
        ),
      },
      {
        accessorKey: "floor_number",
        header: "Floor",
        cell: ({ row }) => <span>{row.original.floor_number ?? "—"}</span>,
      },
      {
        accessorKey: "flat_type",
        header: "Type",
        cell: ({ row }) => flatTypeBadge(row.original.flat_type),
      },
      {
        accessorKey: "ownership_type",
        header: "Ownership",
        cell: ({ row }) =>
          row.original.ownership_type ? (
            <Badge variant="outline" className="text-[10px] uppercase font-bold">
              {row.original.ownership_type}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        accessorKey: "is_occupied",
        header: "Occupancy",
        cell: ({ row }) => occupancyBadge(row.original.is_occupied),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge className="text-[10px] uppercase font-bold border-success/20 bg-success/10 text-success">
              Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] uppercase font-bold">
              Inactive
            </Badge>
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
              <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit Flat</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleOccupied(row.original)}>
                Mark as {row.original.is_occupied ? "Vacant" : "Occupied"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.original.is_active && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deactivateFlat(row.original.id)}
                >
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const pageDescription = buildingLoading
    ? "Loading..."
    : building
      ? `${societyName ? societyName + " › " : ""}${building.building_code}`
      : "Building not found";

  return (
    <div className="space-y-6">
      <PageHeader
        title={building?.building_name ?? (buildingLoading ? "Loading..." : "Building")}
        description={pageDescription}
        backHref={`/admin/societies/${societyId}`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Flat
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Flats" value={stats.total} />
        <StatCard label="Occupied" value={stats.occupied} />
        <StatCard label="Vacant" value={stats.vacant} />
      </div>

      <DataTable
        columns={columns}
        data={flats}
        isLoading={isLoading}
        searchKey="flat_number"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Flat" : "Add Flat"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update flat details below."
                : `Add a new flat to ${building?.building_name ?? "this building"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flat Number *</Label>
                <Input
                  placeholder="101"
                  value={form.flat_number}
                  onChange={(e) => setForm({ ...form, flat_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Floor Number</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={form.floor_number ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      floor_number: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flat Type</Label>
                <Select
                  value={form.flat_type ?? ""}
                  onValueChange={(v) =>
                    setForm({ ...form, flat_type: v as CreateFlatPayload["flat_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ownership</Label>
                <Select
                  value={form.ownership_type ?? ""}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      ownership_type: v as CreateFlatPayload["ownership_type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Area (sq ft)</Label>
              <Input
                type="number"
                min={0}
                placeholder="850"
                value={form.area_sqft ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    area_sqft: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.flat_number.trim() || isCreating || isUpdating}
              >
                {editing ? "Save Changes" : "Add Flat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Layers } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { useBuildings, BuildingRow, CreateBuildingPayload } from "@/hooks/useBuildings";
import { supabase } from "@/src/lib/supabaseClient";
import type { SocietyRow } from "@/hooks/useSocietyAdmin";

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

const emptyForm: CreateBuildingPayload = {
  building_code: "",
  building_name: "",
  total_floors: undefined,
  total_flats: undefined,
};

export default function SocietyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [society, setSociety] = useState<SocietyRow | null>(null);
  const [societyLoading, setSocietyLoading] = useState(true);

  const {
    buildings,
    isLoading,
    stats,
    createBuilding,
    updateBuilding,
    deactivateBuilding,
    isCreating,
    isUpdating,
  } = useBuildings(id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuildingRow | null>(null);
  const [form, setForm] = useState<CreateBuildingPayload>(emptyForm);

  useEffect(() => {
    if (!id) return;
    setSocietyLoading(true);
    supabase
      .from("societies")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setSociety(data as SocietyRow | null);
        setSocietyLoading(false);
      });
  }, [id]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(building: BuildingRow) {
    setEditing(building);
    setForm({
      building_code: building.building_code ?? "",
      building_name: building.building_name ?? "",
      total_floors: building.total_floors ?? undefined,
      total_flats: building.total_flats ?? undefined,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.building_code.trim() || !form.building_name.trim()) return;

    if (editing) {
      const result = await updateBuilding({ id: editing.id, ...form });
      if (result.success) setDialogOpen(false);
    } else {
      const result = await createBuilding(form);
      if (result.success) setDialogOpen(false);
    }
  }

  const columns = useMemo<ColumnDef<BuildingRow>[]>(
    () => [
      {
        accessorKey: "building_name",
        header: "Building",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold">{row.original.building_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.building_code}</p>
          </div>
        ),
      },
      {
        accessorKey: "total_floors",
        header: "Floors",
        cell: ({ row }) => <span>{row.original.total_floors ?? "—"}</span>,
      },
      {
        accessorKey: "total_flats",
        header: "Flats (planned)",
        cell: ({ row }) => <span>{row.original.total_flats ?? "—"}</span>,
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
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/societies/${id}/buildings/${row.original.id}`)
                }
              >
                <Layers className="mr-2 h-4 w-4" />
                View Flats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                Edit Building
              </DropdownMenuItem>
              {row.original.is_active && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deactivateBuilding(row.original.id)}
                >
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [id, router],
  );

  const societyDescription = societyLoading
    ? "Loading..."
    : society
      ? `${society.society_code}${society.city ? ` · ${society.city}` : ""}${society.state ? `, ${society.state}` : ""}`
      : "Society not found";

  return (
    <div className="space-y-6">
      <PageHeader
        title={society?.society_name ?? (societyLoading ? "Loading..." : "Society")}
        description={societyDescription}
        backHref="/admin/societies"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Building
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Buildings" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Total Flats (planned)" value={stats.totalFlats} />
      </div>

      <DataTable
        columns={columns}
        data={buildings}
        isLoading={isLoading}
        searchKey="building_name"
        onRowClick={(row) => router.push(`/admin/societies/${id}/buildings/${row.id}`)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Building" : "Add Building"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update building details below."
                : `Add a new building to ${society?.society_name ?? "this society"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Building Code *</Label>
                <Input
                  placeholder="BLK-A"
                  value={form.building_code}
                  onChange={(e) =>
                    setForm({ ...form, building_code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Building Name *</Label>
                <Input
                  placeholder="Block A"
                  value={form.building_name}
                  onChange={(e) => setForm({ ...form, building_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Floors</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="10"
                  value={form.total_floors ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      total_floors: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Flats (planned)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="40"
                  value={form.total_flats ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      total_flats: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.building_code.trim() ||
                  !form.building_name.trim() ||
                  isCreating ||
                  isUpdating
                }
              >
                {editing ? "Save Changes" : "Add Building"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

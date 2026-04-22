"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CreateResidentPayload,
  ResidentRow,
  UpdateResidentPayload,
  useResidents,
} from "@/hooks/useResidents";
import { supabase } from "@/src/lib/supabaseClient";

interface SocietyOption {
  id: string;
  society_name: string;
}

interface BuildingOption {
  id: string;
  building_name: string;
}

interface FlatOption {
  id: string;
  flat_number: string;
}

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

const emptyCreateForm: CreateResidentPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  flat_id: "",
  society_id: "",
};

const emptyEditForm: UpdateResidentPayload = {
  id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};

export default function ResidentsPage() {
  const {
    residents,
    isLoading,
    stats,
    createResident,
    updateResident,
    deactivateResident,
    isCreating,
    isUpdating,
  } = useResidents();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateResidentPayload>(emptyCreateForm);
  const [editForm, setEditForm] = useState<UpdateResidentPayload>(emptyEditForm);
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [flats, setFlats] = useState<FlatOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSocieties() {
      const { data, error } = await supabase
        .from("societies")
        .select("id, society_name")
        .eq("is_active", true)
        .order("society_name");

      if (!active || error) {
        return;
      }

      setSocieties((data ?? []) as SocietyOption[]);
    }

    void loadSocieties();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBuildings() {
      if (!createForm.society_id) {
        setBuildings([]);
        return;
      }

      const { data, error } = await supabase
        .from("buildings")
        .select("id, building_name")
        .eq("society_id", createForm.society_id)
        .eq("is_active", true)
        .order("building_name");

      if (!active || error) {
        return;
      }

      setBuildings((data ?? []) as BuildingOption[]);
    }

    void loadBuildings();

    return () => {
      active = false;
    };
  }, [createForm.society_id]);

  useEffect(() => {
    let active = true;

    async function loadFlats() {
      if (!selectedBuildingId) {
        setFlats([]);
        return;
      }

      const { data, error } = await supabase
        .from("flats")
        .select("id, flat_number")
        .eq("building_id", selectedBuildingId)
        .eq("is_occupied", false)
        .eq("is_active", true)
        .order("flat_number");

      if (!active || error) {
        return;
      }

      setFlats((data ?? []) as FlatOption[]);
    }

    void loadFlats();

    return () => {
      active = false;
    };
  }, [selectedBuildingId]);

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setSelectedBuildingId("");
    setBuildings([]);
    setFlats([]);
    setCreateDialogOpen(true);
  }

  function openEdit(resident: ResidentRow) {
    setEditForm({
      id: resident.id,
      first_name: resident.first_name,
      last_name: resident.last_name,
      phone: resident.phone,
      email: resident.email,
    });
    setEditDialogOpen(true);
  }

  async function handleCreateSubmit() {
    if (
      !createForm.first_name.trim() ||
      !createForm.last_name.trim() ||
      !createForm.email.trim() ||
      !createForm.phone.trim() ||
      !createForm.society_id ||
      !createForm.flat_id
    ) {
      return;
    }

    const result = await createResident({
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim(),
      society_id: createForm.society_id,
      flat_id: createForm.flat_id,
    });

    if (result.success) {
      setCreateDialogOpen(false);
      setCreateForm(emptyCreateForm);
      setSelectedBuildingId("");
      setBuildings([]);
      setFlats([]);
    }
  }

  async function handleEditSubmit() {
    if (!editForm.id) {
      return;
    }

    const result = await updateResident({
      id: editForm.id,
      first_name: editForm.first_name?.trim(),
      last_name: editForm.last_name?.trim(),
      email: editForm.email?.trim(),
      phone: editForm.phone?.trim(),
    });

    if (result.success) {
      setEditDialogOpen(false);
      setEditForm(emptyEditForm);
    }
  }

  const columns = useMemo<ColumnDef<ResidentRow>[]>(
    () => [
      {
        accessorKey: "first_name",
        header: "Resident Name",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold">{row.original.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.original.resident_code ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "flat_number",
        header: "Flat Number",
        cell: ({ row }) => <span className="text-sm">{row.original.flat_number ?? "—"}</span>,
      },
      {
        accessorKey: "building_name",
        header: "Building",
        cell: ({ row }) => <span className="text-sm">{row.original.building_name ?? "—"}</span>,
      },
      {
        accessorKey: "society_name",
        header: "Society",
        cell: ({ row }) => <span className="text-sm">{row.original.society_name ?? "—"}</span>,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => <span className="text-sm">{row.original.phone || "—"}</span>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span className="text-sm">{row.original.email || "—"}</span>,
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
              <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
              {row.original.is_active ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm(`Deactivate ${row.original.full_name}?`)) {
                      void deactivateResident(row.original.id);
                    }
                  }}
                >
                  Deactivate
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deactivateResident],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resident Management"
        description="Manage resident accounts and flat assignments."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resident
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Total Residents" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
      </div>

      <DataTable
        columns={columns}
        data={residents}
        isLoading={isLoading}
        searchKey="first_name"
      />

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create Resident</DialogTitle>
            <DialogDescription>
              Create a resident account and link it to a vacant flat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={createForm.first_name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, first_name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={createForm.last_name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, last_name: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Society *</Label>
              <Select
                value={createForm.society_id || undefined}
                onValueChange={(value) => {
                  setCreateForm((current) => ({
                    ...current,
                    society_id: value,
                    flat_id: "",
                  }));
                  setSelectedBuildingId("");
                  setFlats([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select society" />
                </SelectTrigger>
                <SelectContent>
                  {societies.map((society) => (
                    <SelectItem key={society.id} value={society.id}>
                      {society.society_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Building *</Label>
              <Select
                value={selectedBuildingId || undefined}
                onValueChange={(value) => {
                  setSelectedBuildingId(value);
                  setCreateForm((current) => ({ ...current, flat_id: "" }));
                }}
                disabled={!createForm.society_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.building_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Flat *</Label>
              <Select
                value={createForm.flat_id || undefined}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, flat_id: value }))
                }
                disabled={!selectedBuildingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vacant flat" />
                </SelectTrigger>
                <SelectContent>
                  {flats.map((flat) => (
                    <SelectItem key={flat.id} value={flat.id}>
                      {flat.flat_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={
                  isCreating ||
                  !createForm.first_name.trim() ||
                  !createForm.last_name.trim() ||
                  !createForm.email.trim() ||
                  !createForm.phone.trim() ||
                  !createForm.society_id ||
                  !createForm.flat_id
                }
              >
                {isCreating ? "Creating..." : "Create Resident"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Resident</DialogTitle>
            <DialogDescription>Update resident contact details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={editForm.first_name ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, first_name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={editForm.last_name ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, last_name: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editForm.email ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={editForm.phone ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={
                  isUpdating ||
                  !editForm.first_name?.trim() ||
                  !editForm.last_name?.trim() ||
                  !editForm.email?.trim() ||
                  !editForm.phone?.trim()
                }
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

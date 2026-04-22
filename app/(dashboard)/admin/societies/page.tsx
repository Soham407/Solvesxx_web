"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Building2 } from "lucide-react";

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

import { useSocietyAdmin, SocietyRow, CreateSocietyPayload } from "@/hooks/useSocietyAdmin";

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

const emptyForm: CreateSocietyPayload = {
  society_code: "",
  society_name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
};

export default function SocietiesPage() {
  const router = useRouter();
  const {
    societies,
    isLoading,
    stats,
    createSociety,
    updateSociety,
    deactivateSociety,
    isCreating,
    isUpdating,
  } = useSocietyAdmin();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocietyRow | null>(null);
  const [form, setForm] = useState<CreateSocietyPayload>(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(society: SocietyRow) {
    setEditing(society);
    setForm({
      society_code: society.society_code ?? "",
      society_name: society.society_name ?? "",
      address: society.address ?? "",
      city: society.city ?? "",
      state: society.state ?? "",
      pincode: society.pincode ?? "",
      contact_person: society.contact_person ?? "",
      contact_phone: society.contact_phone ?? "",
      contact_email: society.contact_email ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.society_code.trim() || !form.society_name.trim()) return;

    if (editing) {
      const result = await updateSociety({ id: editing.id, ...form });
      if (result.success) setDialogOpen(false);
    } else {
      const result = await createSociety(form);
      if (result.success) setDialogOpen(false);
    }
  }

  const columns = useMemo<ColumnDef<SocietyRow>[]>(
    () => [
      {
        accessorKey: "society_name",
        header: "Society",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold">{row.original.society_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.original.society_code}</p>
          </div>
        ),
      },
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => {
          const parts = [row.original.city, row.original.state].filter(Boolean);
          return <span className="text-sm">{parts.join(", ") || "—"}</span>;
        },
      },
      {
        accessorKey: "contact_person",
        header: "Contact",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-sm">{row.original.contact_person || "—"}</p>
            <p className="text-xs text-muted-foreground">{row.original.contact_phone || ""}</p>
          </div>
        ),
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
                onClick={() => router.push(`/admin/societies/${row.original.id}`)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                View Buildings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                Edit Society
              </DropdownMenuItem>
              {row.original.is_active && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deactivateSociety(row.original.id)}
                >
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Society Management"
        description="Manage residential societies, buildings, and flats."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Society
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Societies" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Total Flats (planned)" value={stats.totalFlats} />
      </div>

      <DataTable
        columns={columns}
        data={societies}
        isLoading={isLoading}
        searchKey="society_name"
        onRowClick={(row) => router.push(`/admin/societies/${row.id}`)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Society" : "Create Society"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update society details below."
                : "Add a new residential society to the platform."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Society Code *</Label>
                <Input
                  placeholder="SOC-001"
                  value={form.society_code}
                  onChange={(e) => setForm({ ...form, society_code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Society Name *</Label>
                <Input
                  placeholder="Green Valley Heights"
                  value={form.society_name}
                  onChange={(e) => setForm({ ...form, society_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Street address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  placeholder="400001"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  placeholder="Name"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                placeholder="society@example.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.society_code.trim() ||
                  !form.society_name.trim() ||
                  isCreating ||
                  isUpdating
                }
              >
                {editing ? "Save Changes" : "Create Society"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

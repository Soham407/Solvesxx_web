"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Building2, CheckCircle2, Download, MoreHorizontal, Plus, Upload } from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSocietyAdmin, SocietyRow, CreateSocietyPayload } from "@/hooks/useSocietyAdmin";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedImportRow {
  society_code: string;
  society_name: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  building_code: string;
  building_name: string;
  total_floors: string;
  flat_number: string;
  flat_type: string;
  floor_number: string;
  area_sqft: string;
  ownership_type: string;
  [key: string]: string;
}

interface ImportResult {
  societiesCreated: number;
  societiesSkipped: number;
  buildingsCreated: number;
  buildingsSkipped: number;
  flatsCreated: number;
  flatsSkipped: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseCSVText(text: string): ParsedImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])) as ParsedImportRow;
    });
}

function computePreview(rows: ParsedImportRow[]) {
  const societies = new Set(rows.map((r) => r.society_code)).size;
  const buildings = new Set(
    rows.filter((r) => r.building_code).map((r) => `${r.society_code}:${r.building_code}`),
  ).size;
  const flats = rows.filter((r) => r.flat_number).length;
  return { societies, buildings, flats };
}

function downloadTemplate() {
  const header =
    "society_code,society_name,city,state,pincode,address,building_code,building_name,total_floors,flat_number,flat_type,floor_number,area_sqft,ownership_type";
  const rows = [
    "SOC-001,Green Valley Heights,Mumbai,Maharashtra,400001,123 Main Street,BLK-A,Block A,5,101,2bhk,1,850,owner",
    "SOC-001,Green Valley Heights,Mumbai,Maharashtra,400001,123 Main Street,BLK-A,Block A,5,102,3bhk,1,1200,owner",
    "SOC-001,Green Valley Heights,Mumbai,Maharashtra,400001,123 Main Street,BLK-B,Block B,3,201,1bhk,2,650,tenant",
  ];
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "societies_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function SummaryCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={`text-2xl font-bold ${muted ? "text-muted-foreground" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ── Default form ───────────────────────────────────────────────────────────────

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SocietiesPage() {
  const router = useRouter();
  const {
    societies,
    isLoading,
    stats,
    createSociety,
    updateSociety,
    deactivateSociety,
    refresh,
    isCreating,
    isUpdating,
  } = useSocietyAdmin();

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocietyRow | null>(null);
  const [form, setForm] = useState<CreateSocietyPayload>(emptyForm);

  // Import dialog
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [importPreview, setImportPreview] = useState({ societies: 0, buildings: 0, flats: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
      if (result.success) {
        setDialogOpen(false);
        // Auto-navigate to the new society so the user can add buildings immediately
        if (result.data?.id) {
          router.push(`/admin/societies/${result.data.id}`);
        }
      }
    }
  }

  // ── Import helpers ───────────────────────────────────────────────────────────

  function resetImport() {
    setImportRows([]);
    setImportPreview({ societies: 0, buildings: 0, flats: 0 });
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(file: File) {
    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);
      if (rows.length === 0) {
        setImportError("No data rows found. Make sure the file has a header row and at least one data row.");
        return;
      }
      if (!rows[0].society_code) {
        setImportError("Column 'society_code' not found. Download the template for the correct format.");
        return;
      }
      setImportError(null);
      setImportRows(rows);
      setImportPreview(computePreview(rows));
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleImport() {
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/admin/societies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error ?? "Import failed");
        return;
      }
      setImportResult(json.data);
      refresh();
    } catch {
      setImportError("Network error — please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  // ── Table columns ────────────────────────────────────────────────────────────

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
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/societies/${row.original.id}`);
              }}
            >
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              Buildings
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>
        ),
      },
    ],
    [router],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Society Management"
        description="Manage residential societies, buildings, and flats."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetImport(); setImportDialogOpen(true); }}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Society
            </Button>
          </div>
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

      {/* ── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Society" : "Create Society"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update society details below."
                : "Fill in the details — you'll be taken to the buildings page right after."}
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
                {editing ? "Save Changes" : "Create & Add Buildings →"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetImport();
          setImportDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Import via CSV</DialogTitle>
            <DialogDescription>
              Bulk-create societies, buildings, and flats from a single spreadsheet.
              Existing entries (matched by code) are skipped automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Step 1 — File upload */}
          {importRows.length === 0 && !importResult && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drop CSV here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Columns: society_code, building_code, flat_number, …
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
              <Button
                variant="link"
                size="sm"
                className="px-0 text-muted-foreground"
                onClick={downloadTemplate}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download template CSV
              </Button>
            </div>
          )}

          {/* Step 2 — Preview */}
          {importRows.length > 0 && !importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Societies" value={importPreview.societies} />
                <SummaryCard label="Buildings" value={importPreview.buildings} />
                <SummaryCard label="Flats" value={importPreview.flats} />
              </div>
              <p className="text-sm text-muted-foreground">
                {importRows.length} rows parsed · existing entries will be skipped
              </p>
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
              <div className="flex justify-between pt-1">
                <Button variant="outline" onClick={resetImport}>
                  Change File
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? "Importing…" : `Import ${importRows.length} rows`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Result */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Import complete</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Societies created" value={importResult.societiesCreated} />
                <SummaryCard label="Societies skipped" value={importResult.societiesSkipped} muted />
                <SummaryCard label="Buildings created" value={importResult.buildingsCreated} />
                <SummaryCard label="Buildings skipped" value={importResult.buildingsSkipped} muted />
                <SummaryCard label="Flats created" value={importResult.flatsCreated} />
                <SummaryCard label="Flats skipped" value={importResult.flatsSkipped} muted />
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  onClick={() => {
                    resetImport();
                    setImportDialogOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

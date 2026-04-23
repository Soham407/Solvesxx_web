"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useSecurityGuards, type SecurityGuard } from "@/hooks/useSecurityGuards";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

interface SocietyOption {
  id: string;
  society_name: string;
}

interface LocationOption {
  id: string;
  location_name: string;
  location_code: string;
}

interface ShiftOption {
  id: string;
  shift_name: string;
  shift_code: string;
}

interface ChecklistOption {
  id: string;
  checklist_name: string;
  checklist_code: string;
  frequency: string;
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

export default function AdminGuardsPage() {
  const { guards, isLoading, refresh } = useSecurityGuards();

  // Society-only dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<SecurityGuard | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");

  // Full assignment dialog
  const [fullAssignDialogOpen, setFullAssignDialogOpen] = useState(false);
  const [fullGuard, setFullGuard] = useState<SecurityGuard | null>(null);
  const [fullSocietyId, setFullSocietyId] = useState("");
  const [fullLocationId, setFullLocationId] = useState("");
  const [fullShiftId, setFullShiftId] = useState("");
  const [fullIsActive, setFullIsActive] = useState(false);

  // Checklist assignment dialog
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistGuard, setChecklistGuard] = useState<SecurityGuard | null>(null);
  const [checklists, setChecklists] = useState<ChecklistOption[]>([]);
  const [assignedChecklistIds, setAssignedChecklistIds] = useState<Set<string>>(new Set());
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(false);

  // Shared options
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setIsLoadingOptions(true);

      try {
        const [societiesResult, locationsResult, shiftsResult] = await Promise.all([
          supabase
            .from("societies")
            .select("id, society_name")
            .eq("is_active", true)
            .order("society_name", { ascending: true }),
          supabase
            .from("company_locations")
            .select("id, location_name, location_code")
            .eq("is_active", true)
            .order("location_name", { ascending: true }),
          supabase
            .from("shifts")
            .select("id, shift_name, shift_code")
            .eq("is_active", true)
            .order("shift_name", { ascending: true }),
        ]);

        if (!active) return;

        if (societiesResult.error) throw societiesResult.error;
        if (locationsResult.error) throw locationsResult.error;
        if (shiftsResult.error) throw shiftsResult.error;

        setSocieties((societiesResult.data ?? []) as SocietyOption[]);
        setLocations((locationsResult.data ?? []) as LocationOption[]);
        setShifts((shiftsResult.data ?? []) as ShiftOption[]);
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Failed to load options");
        }
      } finally {
        if (active) setIsLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  function openAssignDialog(guard: SecurityGuard) {
    setSelectedGuard(guard);
    setSelectedSocietyId(guard.society_id ?? "");
    setAssignDialogOpen(true);
  }

  function openFullAssignDialog(guard: SecurityGuard) {
    setFullGuard(guard);
    setFullSocietyId(guard.society_id ?? "");
    setFullLocationId(guard.assigned_location_id ?? "");
    setFullShiftId(guard.currentShift?.id ?? "");
    setFullIsActive(guard.is_active ?? false);
    setFullAssignDialogOpen(true);
  }

  async function handleAssignSociety() {
    if (!selectedGuard || !selectedSocietyId) {
      toast.error("Select a society to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/guards/${selectedGuard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ society_id: selectedSocietyId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to assign society");
      }

      toast.success(`Guard linked to ${payload.society_name}`);
      setAssignDialogOpen(false);
      setSelectedGuard(null);
      setSelectedSocietyId("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign society");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFullAssign() {
    if (!fullGuard) return;

    if (!fullSocietyId) {
      toast.error("Select a society.");
      return;
    }
    if (!fullLocationId) {
      toast.error("Select a location.");
      return;
    }
    if (fullIsActive && !fullShiftId) {
      toast.error("Active guards must have a shift assigned.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/guards/${fullGuard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          society_id: fullSocietyId,
          assigned_location_id: fullLocationId,
          shift_id: fullShiftId || "",
          is_active: fullIsActive,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to assign guard");
      }

      toast.success(
        `Guard assigned to ${payload.location_name}${payload.shift_name ? ` · ${payload.shift_name}` : ""}`,
      );
      setFullAssignDialogOpen(false);
      setFullGuard(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign guard");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openChecklistDialog(guard: SecurityGuard) {
    setChecklistGuard(guard);
    setChecklistDialogOpen(true);
    setIsLoadingChecklists(true);

    try {
      const [checklistsResult, assignmentsResult] = await Promise.all([
        supabase
          .from("daily_checklists")
          .select("id, checklist_name, checklist_code, frequency")
          .eq("is_active", true)
          .order("checklist_name", { ascending: true }),
        guard.employee_id
          ? supabase
              .from("checklist_assignments")
              .select("checklist_id")
              .eq("employee_id", guard.employee_id)
              .eq("is_active", true)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (checklistsResult.error) throw checklistsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setChecklists((checklistsResult.data ?? []) as ChecklistOption[]);
      setAssignedChecklistIds(
        new Set((assignmentsResult.data ?? []).map((a: { checklist_id: string }) => a.checklist_id)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load checklists");
      setChecklistDialogOpen(false);
    } finally {
      setIsLoadingChecklists(false);
    }
  }

  function toggleChecklist(checklistId: string) {
    setAssignedChecklistIds((prev) => {
      const next = new Set(prev);
      if (next.has(checklistId)) {
        next.delete(checklistId);
      } else {
        next.add(checklistId);
      }
      return next;
    });
  }

  async function handleSaveChecklists() {
    if (!checklistGuard?.employee_id) return;

    setIsSubmitting(true);

    try {
      const employeeId = checklistGuard.employee_id;
      const selectedIds = Array.from(assignedChecklistIds);
      const allIds = checklists.map((c) => c.id);
      const deselectedIds = allIds.filter((id) => !assignedChecklistIds.has(id));

      // Upsert selected checklists as active
      if (selectedIds.length > 0) {
        const { error: upsertError } = await supabase
          .from("checklist_assignments")
          .upsert(
            selectedIds.map((checklistId) => ({
              checklist_id: checklistId,
              employee_id: employeeId,
              is_active: true,
            })),
            { onConflict: "checklist_id,employee_id" },
          );

        if (upsertError) throw upsertError;
      }

      // Deactivate removed checklists
      if (deselectedIds.length > 0) {
        const { error: deactivateError } = await supabase
          .from("checklist_assignments")
          .update({ is_active: false })
          .eq("employee_id", employeeId)
          .in("checklist_id", deselectedIds);

        if (deactivateError) throw deactivateError;
      }

      toast.success(`Checklists updated for ${checklistGuard.employee?.first_name ?? "guard"}`);
      setChecklistDialogOpen(false);
      setChecklistGuard(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save checklists");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pageStats = useMemo(
    () => ({
      total: guards.length,
      active: guards.filter((guard) => guard.is_active).length,
      assigned: guards.filter((guard) => Boolean(guard.society?.society_name)).length,
    }),
    [guards],
  );

  const columns = useMemo<ColumnDef<SecurityGuard>[]>(
    () => [
      {
        accessorKey: "employee.first_name",
        header: "Guard Name",
        cell: ({ row }) => {
          const fullName =
            [row.original.employee?.first_name, row.original.employee?.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() || "Guard";

          return (
            <div className="space-y-0.5">
              <p className="font-semibold">{fullName}</p>
              <p className="text-xs text-muted-foreground font-mono">{row.original.guard_code}</p>
            </div>
          );
        },
      },
      {
        id: "employee_code",
        header: "Employee Code",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.employee?.employee_code ?? "—"}</span>
        ),
      },
      {
        id: "shift",
        header: "Shift",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.currentShift?.shift_name ?? row.original.shift_timing ?? "—"}
          </span>
        ),
      },
      {
        id: "society",
        header: "Assigned Society",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.society?.society_name ?? "Unassigned"}</span>
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
              <DropdownMenuItem onClick={() => openFullAssignDialog(row.original)}>
                Assign Location & Shift
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void openChecklistDialog(row.original)}>
                Assign Checklists
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openAssignDialog(row.original)}>
                Change Society Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guard Management"
        description="Review security guard profiles and link each guard to the correct society."
        actions={
          <Button variant="outline" onClick={() => void refresh()}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Refresh Guards
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Guards" value={pageStats.total} />
        <StatCard label="Active" value={pageStats.active} />
        <StatCard label="Society Assigned" value={pageStats.assigned} />
      </div>

      <DataTable
        columns={columns}
        data={guards}
        isLoading={isLoading}
        searchKey="guard_code"
      />

      {/* Society-only dialog */}
      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) {
            setSelectedGuard(null);
            setSelectedSocietyId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Change Society</DialogTitle>
            <DialogDescription>
              Re-link this guard to a different society without changing their location or shift.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-bold">
                {[selectedGuard?.employee?.first_name, selectedGuard?.employee?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Guard"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedGuard?.employee?.employee_code ?? selectedGuard?.guard_code}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_guard_assign_society">Society</Label>
              <Select
                value={selectedSocietyId}
                onValueChange={setSelectedSocietyId}
                disabled={isLoadingOptions}
              >
                <SelectTrigger id="admin_guard_assign_society">
                  <SelectValue
                    placeholder={isLoadingOptions ? "Loading..." : "Select society"}
                  />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleAssignSociety()}
              disabled={isSubmitting || isLoadingOptions || !selectedSocietyId}
            >
              {isSubmitting ? "Saving..." : "Update Society"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist assignment dialog */}
      <Dialog
        open={checklistDialogOpen}
        onOpenChange={(open) => {
          setChecklistDialogOpen(open);
          if (!open) setChecklistGuard(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Assign Checklists</DialogTitle>
            <DialogDescription>
              Select which daily checklists this guard is responsible for completing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-bold">
                {[checklistGuard?.employee?.first_name, checklistGuard?.employee?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Guard"}
              </p>
              <p className="text-xs text-muted-foreground">
                {checklistGuard?.employee?.employee_code ?? checklistGuard?.guard_code}
              </p>
            </div>

            {isLoadingChecklists ? (
              <p className="text-sm text-muted-foreground py-2">Loading checklists...</p>
            ) : checklists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No active checklists found. Create checklists first from the admin checklist
                management page.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {checklists.map((checklist) => (
                  <div
                    key={checklist.id}
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                    onClick={() => toggleChecklist(checklist.id)}
                  >
                    <Checkbox
                      id={`cl-${checklist.id}`}
                      checked={assignedChecklistIds.has(checklist.id)}
                      onCheckedChange={() => toggleChecklist(checklist.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{checklist.checklist_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {checklist.checklist_code} · {checklist.frequency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveChecklists()}
              disabled={isSubmitting || isLoadingChecklists || !checklistGuard?.employee_id}
            >
              {isSubmitting ? "Saving..." : "Save Checklists"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full assignment dialog */}
      <Dialog
        open={fullAssignDialogOpen}
        onOpenChange={(open) => {
          setFullAssignDialogOpen(open);
          if (!open) setFullGuard(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Assign Location & Shift</DialogTitle>
            <DialogDescription>
              Set this guard&apos;s society, assigned gate/location, shift, and active status in one
              step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-bold">
                {[fullGuard?.employee?.first_name, fullGuard?.employee?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Guard"}
              </p>
              <p className="text-xs text-muted-foreground">
                {fullGuard?.employee?.employee_code ?? fullGuard?.guard_code}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_assign_society">Society *</Label>
              <Select
                value={fullSocietyId}
                onValueChange={setFullSocietyId}
                disabled={isLoadingOptions}
              >
                <SelectTrigger id="full_assign_society">
                  <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select society"} />
                </SelectTrigger>
                <SelectContent>
                  {societies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.society_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_assign_location">Location / Gate *</Label>
              <Select
                value={fullLocationId}
                onValueChange={setFullLocationId}
                disabled={isLoadingOptions}
              >
                <SelectTrigger id="full_assign_location">
                  <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select location"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.location_name}
                      <span className="ml-1 text-muted-foreground text-xs">({l.location_code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_assign_shift">
                Shift{fullIsActive ? " *" : ""}
              </Label>
              <Select
                value={fullShiftId}
                onValueChange={setFullShiftId}
                disabled={isLoadingOptions}
              >
                <SelectTrigger id="full_assign_shift">
                  <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select shift"} />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((sh) => (
                    <SelectItem key={sh.id} value={sh.id}>
                      {sh.shift_name}
                      <span className="ml-1 text-muted-foreground text-xs">({sh.shift_code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive guards cannot log in or record GPS data.
                </p>
              </div>
              <Switch checked={fullIsActive} onCheckedChange={setFullIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFullAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleFullAssign()}
              disabled={isSubmitting || isLoadingOptions || !fullSocietyId || !fullLocationId}
            >
              {isSubmitting ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

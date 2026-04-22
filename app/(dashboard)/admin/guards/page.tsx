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
import { useSecurityGuards, type SecurityGuard } from "@/hooks/useSecurityGuards";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";

interface SocietyOption {
  id: string;
  society_name: string;
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<SecurityGuard | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [isLoadingSocieties, setIsLoadingSocieties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSocieties() {
      setIsLoadingSocieties(true);

      try {
        const { data, error } = await supabase
          .from("societies")
          .select("id, society_name")
          .eq("is_active", true)
          .order("society_name", { ascending: true });

        if (error) {
          throw error;
        }

        if (active) {
          setSocieties((data ?? []) as SocietyOption[]);
        }
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Failed to load societies");
        }
      } finally {
        if (active) {
          setIsLoadingSocieties(false);
        }
      }
    }

    void loadSocieties();

    return () => {
      active = false;
    };
  }, []);

  function openAssignDialog(guard: SecurityGuard) {
    setSelectedGuard(guard);
    setSelectedSocietyId(guard.society_id ?? "");
    setAssignDialogOpen(true);
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
              <DropdownMenuItem onClick={() => openAssignDialog(row.original)}>
                Assign to Society
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
            <DialogTitle>Assign Guard to Society</DialogTitle>
            <DialogDescription>
              Link this guard profile to the society they are responsible for.
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
                disabled={isLoadingSocieties}
              >
                <SelectTrigger id="admin_guard_assign_society">
                  <SelectValue
                    placeholder={isLoadingSocieties ? "Loading societies..." : "Select society"}
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
              disabled={isSubmitting || isLoadingSocieties || !selectedSocietyId}
            >
              {isSubmitting ? "Saving..." : "Assign Society"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

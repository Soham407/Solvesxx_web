"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Clock,
  Users,
  ShieldCheck,
  UserPlus,
  Loader2,
  Moon,
  Sun,
  AlertCircle,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useShifts } from "@/hooks/useShifts";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DisplayShift {
  id: string;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
  is_active: boolean;
  assignedCount: number;
}

function getGuardDisplayName(guard: {
  employee?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  guard_code: string;
}) {
  const firstName = guard.employee?.first_name?.trim();
  const lastName = guard.employee?.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || guard.guard_code || "Unknown Guard";
}

function getGuardInitials(guard: {
  employee?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  guard_code: string;
}) {
  const firstInitial = guard.employee?.first_name?.trim()?.charAt(0) || "";
  const lastInitial = guard.employee?.last_name?.trim()?.charAt(0) || "";
  const initials = `${firstInitial}${lastInitial}`.trim();

  return initials || guard.guard_code.slice(0, 2).toUpperCase() || "GU";
}

// Calculate shift duration from start/end times
function calculateDuration(start: string, end: string): string {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60; // Handle overnight shifts

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hours`;
}

// Format time for display (24h -> 12h)
function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function ShiftMasterPage() {
  const { toast } = useToast();
  const {
    shifts,
    guards,
    isLoading,
    isCreating,
    isAssigning,
    createShift,
    assignGuardToShift,
    getStats,
    refresh,
  } = useShifts();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string>("");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [newShift, setNewShift] = useState({
    shift_code: "",
    shift_name: "",
    start_time: "",
    end_time: "",
    shift_type: "day",
    break_duration_minutes: "60",
    description: "",
  });

  const stats = getStats();

  const resetCreateShiftForm = () => {
    setNewShift({
      shift_code: "",
      shift_name: "",
      start_time: "",
      end_time: "",
      shift_type: "day",
      break_duration_minutes: "60",
      description: "",
    });
  };

  const openAssignDialog = (shiftId?: string) => {
    setSelectedShiftId(shiftId || "");
    setIsAssignDialogOpen(true);
  };

  // Transform shifts for display with count of assigned guards
  const displayShifts: DisplayShift[] = shifts.map((shift) => ({
    id: shift.id,
    shift_code: shift.shift_code,
    shift_name: shift.shift_name,
    start_time: shift.start_time,
    end_time: shift.end_time,
    is_night_shift: shift.is_night_shift ?? false,
    is_active: shift.is_active ?? true,
    assignedCount: guards.filter((g) => g.current_shift?.id === shift.id).length,
  }));

  // Handle guard assignment
  const handleAssignGuard = async () => {
    if (!selectedGuardId || !selectedShiftId) {
      toast({
        title: "Selection Required",
        description: "Please select both a guard and a shift.",
        variant: "destructive",
      });
      return;
    }

    const guard = guards.find((g) => g.employee_id === selectedGuardId);
    const shift = shifts.find((s) => s.id === selectedShiftId);

    const result = await assignGuardToShift(selectedGuardId, selectedShiftId);

    if (result.success) {
      toast({
        title: "Guard Assigned",
        description: `${guard ? getGuardDisplayName(guard) : "Selected guard"} has been assigned to ${shift?.shift_name}.`,
      });
      setIsAssignDialogOpen(false);
      setSelectedGuardId("");
      setSelectedShiftId("");
    } else {
      toast({
        title: "Assignment Failed",
        description: result.error || "Could not assign guard to shift.",
        variant: "destructive",
      });
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.shift_code || !newShift.shift_name || !newShift.start_time || !newShift.end_time) {
      toast({
        title: "Shift details required",
        description: "Shift code, shift name, start time, and end time are mandatory.",
        variant: "destructive",
      });
      return;
    }

    const result = await createShift({
      shift_code: newShift.shift_code.trim().toUpperCase(),
      shift_name: newShift.shift_name.trim(),
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      is_night_shift: newShift.shift_type === "night",
      break_duration_minutes: Number.parseInt(newShift.break_duration_minutes, 10) || 0,
      description: newShift.description.trim() || undefined,
    });

    if (result.success) {
      toast({
        title: "Shift created",
        description: `${newShift.shift_name.trim()} is now available for assignment.`,
      });
      setIsCreateDialogOpen(false);
      resetCreateShiftForm();
    } else {
      toast({
        title: "Shift creation failed",
        description: result.error || "Could not create the shift.",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<DisplayShift>[] = [
    {
      accessorKey: "shift_name",
      header: "Shift Identity",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              row.original.is_night_shift
                ? "bg-critical/10 text-critical"
                : "bg-primary/10 text-primary"
            )}
          >
            {row.original.is_night_shift ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.shift_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">
              {row.original.shift_code}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "timings",
      header: "Shift Timings",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-[10px] font-bold bg-muted/50 border-none"
          >
            {formatTime(row.original.start_time)}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] font-bold bg-muted/50 border-none"
          >
            {formatTime(row.original.end_time)}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Total Duration",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-muted-foreground">
          {calculateDuration(row.original.start_time, row.original.end_time)}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Shift Type",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5",
            row.original.is_night_shift
              ? "bg-critical/5 text-critical border-critical/20"
              : "bg-info/5 text-info border-info/20"
          )}
        >
          {row.original.is_night_shift ? "Night" : "Day"}
        </Badge>
      ),
    },
    {
      accessorKey: "assignedCount",
      header: "Strength",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-bold">
            {row.original.assignedCount}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => openAssignDialog(row.original.id)}
        >
          <UserPlus className="mr-2 h-3.5 w-3.5" />
          Assign Guard
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Shift Master"
          description="Define and manage operational shift timings, rotations, and personnel deployment strength."
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Shift Master"
        description="Define and manage operational shift timings, rotations, and personnel deployment strength."
        actions={
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" /> Create Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Shift</DialogTitle>
                  <DialogDescription>
                    Define the shift timing before assigning guards to it.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift_code">Shift Code</Label>
                      <Input
                        id="shift_code"
                        value={newShift.shift_code}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, shift_code: event.target.value }))
                        }
                        placeholder="SHIFT-DAY-A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shift_name">Shift Name</Label>
                      <Input
                        id="shift_name"
                        value={newShift.shift_name}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, shift_name: event.target.value }))
                        }
                        placeholder="Morning Patrol"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={newShift.start_time}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, start_time: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={newShift.end_time}
                        onChange={(event) =>
                          setNewShift((prev) => ({ ...prev, end_time: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift_type">Shift Type</Label>
                      <Select
                        value={newShift.shift_type}
                        onValueChange={(value) =>
                          setNewShift((prev) => ({ ...prev, shift_type: value }))
                        }
                      >
                        <SelectTrigger id="shift_type">
                          <SelectValue placeholder="Select shift type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day Shift</SelectItem>
                          <SelectItem value="night">Night Shift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="break_duration_minutes">Break Duration (Minutes)</Label>
                      <Input
                        id="break_duration_minutes"
                        type="number"
                        min="0"
                        value={newShift.break_duration_minutes}
                        onChange={(event) =>
                          setNewShift((prev) => ({
                            ...prev,
                            break_duration_minutes: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift_description">Description</Label>
                    <Textarea
                      id="shift_description"
                      value={newShift.description}
                      onChange={(event) =>
                        setNewShift((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Coverage, rotation, or dispatch notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetCreateShiftForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateShift}
                    disabled={
                      isCreating ||
                      !newShift.shift_code ||
                      !newShift.shift_name ||
                      !newShift.start_time ||
                      !newShift.end_time
                    }
                    className="gap-2"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Shift
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Assign Guard
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Guard to Shift</DialogTitle>
                  <DialogDescription>
                    Select a guard and assign them to a shift. This will replace any existing assignment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Guard</label>
                    <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a guard..." />
                      </SelectTrigger>
                      <SelectContent>
                        {guards.map((guard) => (
                          <SelectItem key={guard.employee_id} value={guard.employee_id}>
                            <div className="flex items-center gap-2">
                              <span>
                                {getGuardDisplayName(guard)}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                ({guard.guard_code})
                              </span>
                              {guard.current_shift && (
                                <Badge variant="outline" className="text-[8px] ml-2">
                                  {guard.current_shift.shift_name}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Shift</label>
                    <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a shift..." />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts
                          .filter((s) => s.is_active)
                          .map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              <div className="flex items-center gap-2">
                                {shift.is_night_shift ? (
                                  <Moon className="h-3 w-3 text-critical" />
                                ) : (
                                  <Sun className="h-3 w-3 text-primary" />
                                )}
                                <span>{shift.shift_name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignGuard}
                    disabled={isAssigning || !selectedGuardId || !selectedShiftId}
                    className="gap-2"
                  >
                    {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          {
            label: "Active Shifts",
            value: stats.activeShifts.toString(),
            icon: Clock,
            color: "text-primary",
          },
          {
            label: "Guards Assigned",
            value: stats.totalAssigned.toString(),
            icon: Users,
            color: "text-info",
          },
          {
            label: "Night Shift",
            value: stats.nightShiftCount.toString(),
            icon: ShieldCheck,
            color: "text-critical",
          },
          {
            label: "Unassigned",
            value: stats.unassignedCount.toString(),
            icon: AlertCircle,
            color: stats.unassignedCount > 0 ? "text-warning" : "text-success",
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center",
                  stat.color
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  {stat.label}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Guards Assignment Section */}
      {guards.length > 0 && (
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Guard Shift Assignments
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {guards.length} Guards
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {guards.map((guard, index) => (
                <div
                  key={guard.id || index}
                  className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {getGuardInitials(guard)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {getGuardDisplayName(guard)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {guard.guard_code} • Grade {guard.grade || "N/A"}
                    </p>
                  </div>
                  {guard.current_shift ? (
                    <Badge
                      className={cn(
                        "text-[10px] font-bold",
                        guard.current_shift.is_night_shift
                          ? "bg-critical/10 text-critical border-critical/20"
                          : "bg-success/10 text-success border-success/20"
                      )}
                    >
                      {guard.current_shift.is_night_shift ? (
                        <Moon className="h-3 w-3 mr-1" />
                      ) : (
                        <Sun className="h-3 w-3 mr-1" />
                      )}
                      {guard.current_shift.shift_name}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold text-warning border-warning/20 bg-warning/10"
                    >
                      Unassigned
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={displayShifts} searchKey="shift_name" />
    </div>
  );
}

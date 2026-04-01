"use client";

import { useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Sprout,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  PlantationTask,
  PlantationTaskStatus,
  PlantationZone,
  usePlantation,
} from "@/hooks/usePlantation";
import { cn } from "@/lib/utils";
import {
  canManagePlantation,
  canUpdatePlantationTask,
  getPlantationStats,
  getPlantationTaskBuckets,
  getUnassignedPlantationPlans,
  groupPlantationPlansByZone,
  normalizePlantTypes,
  shouldShowPlantationPageLoader,
} from "./page-state";

const TASK_STATUS_META: Record<
  PlantationTaskStatus,
  { label: string; badgeClassName: string; columnClassName: string }
> = {
  pending: {
    label: "Pending",
    badgeClassName: "bg-warning/10 text-warning border-warning/20",
    columnClassName: "border-warning/20 bg-warning/5",
  },
  in_progress: {
    label: "In Progress",
    badgeClassName: "bg-primary/10 text-primary border-primary/20",
    columnClassName: "border-primary/20 bg-primary/5",
  },
  completed: {
    label: "Completed",
    badgeClassName: "bg-success/10 text-success border-success/20",
    columnClassName: "border-success/20 bg-success/5",
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString();
}

export default function PlantationPage() {
  const { role, isLoading: isAuthLoading } = useAuth();
  const {
    zones,
    plans,
    tasks,
    locations,
    technicians,
    currentEmployeeId,
    isLoading,
    createZone,
    createPlan,
    createTask,
    updateTaskStatus,
    uploadEvidence,
    refresh,
  } = usePlantation(role);

  const canManage = canManagePlantation(role);

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const [zoneForm, setZoneForm] = useState({
    name: "",
    locationId: "",
    areaSqft: "",
    plantTypes: "",
  });
  const [planForm, setPlanForm] = useState({
    zoneId: "",
    season: "",
    planDescription: "",
    startDate: "",
    endDate: "",
  });
  const [taskForm, setTaskForm] = useState({
    planId: "",
    zoneId: "",
    taskName: "",
    taskType: "",
    assignedTo: "",
    scheduledDate: "",
    notes: "",
  });

  const [statusTaskId, setStatusTaskId] = useState<string | null>(null);
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const evidenceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const zoneColumns: ColumnDef<PlantationZone>[] = [
    {
      accessorKey: "name",
      header: "Zone",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-success" />
          <span className="font-semibold">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{row.original.location_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "area_sqft",
      header: "Area",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.area_sqft ? `${row.original.area_sqft.toLocaleString()} sq ft` : "Not set"}
        </span>
      ),
    },
    {
      accessorKey: "plant_types",
      header: "Plant Types",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.plant_types.length > 0 ? (
            row.original.plant_types.map((plantType) => (
              <Badge key={plantType} variant="outline" className="bg-success/5 text-success border-success/20">
                {plantType}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No plant types added</span>
          )}
        </div>
      ),
    },
  ];

  const { pendingTasks, inProgressTasks, completedTasks } = getPlantationTaskBuckets(tasks);
  const planGroups = groupPlantationPlansByZone(zones, plans);
  const unassignedPlans = getUnassignedPlantationPlans(plans);

  const taskColumns: Array<{ status: PlantationTaskStatus; tasks: PlantationTask[] }> = [
    { status: "pending", tasks: pendingTasks },
    { status: "in_progress", tasks: inProgressTasks },
    { status: "completed", tasks: completedTasks },
  ];

  const stats = getPlantationStats(zones, plans, tasks).map((stat) => ({
    ...stat,
    icon:
      stat.label === "Zones"
        ? Leaf
        : stat.label === "Seasonal Plans"
          ? CalendarDays
          : stat.label === "Pending Tasks"
            ? ClipboardList
            : CheckCircle2,
  }));

  async function handleCreateZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createZone({
      name: zoneForm.name,
      locationId: zoneForm.locationId || null,
      areaSqft: zoneForm.areaSqft ? Number(zoneForm.areaSqft) : null,
      plantTypes: normalizePlantTypes(zoneForm.plantTypes),
    });

    if (!result.success) return;

    setZoneDialogOpen(false);
    setZoneForm({
      name: "",
      locationId: "",
      areaSqft: "",
      plantTypes: "",
    });
  }

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createPlan({
      zoneId: planForm.zoneId || null,
      season: planForm.season,
      planDescription: planForm.planDescription,
      startDate: planForm.startDate || null,
      endDate: planForm.endDate || null,
    });

    if (!result.success) return;

    setPlanDialogOpen(false);
    setPlanForm({
      zoneId: "",
      season: "",
      planDescription: "",
      startDate: "",
      endDate: "",
    });
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await createTask({
      planId: taskForm.planId || null,
      zoneId: taskForm.zoneId || null,
      taskName: taskForm.taskName,
      taskType: taskForm.taskType,
      assignedTo: taskForm.assignedTo || null,
      scheduledDate: taskForm.scheduledDate || null,
      notes: taskForm.notes || null,
    });

    if (!result.success) return;

    setTaskDialogOpen(false);
    setTaskForm({
      planId: "",
      zoneId: "",
      taskName: "",
      taskType: "",
      assignedTo: "",
      scheduledDate: "",
      notes: "",
    });
  }

  async function handleStatusChange(taskId: string, status: PlantationTaskStatus) {
    setStatusTaskId(taskId);
    try {
      await updateTaskStatus(taskId, status);
    } finally {
      setStatusTaskId(null);
    }
  }

  async function handleEvidenceChange(taskId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadTaskId(taskId);
    try {
      await uploadEvidence(taskId, file);
    } finally {
      setUploadTaskId(null);
    }
  }

  if (
    shouldShowPlantationPageLoader({
      isLoading,
      isAuthLoading,
      zones,
      plans,
      tasks,
    })
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Plantation Services"
        description="Manage horticulture zones, seasonal care plans, and technician-owned plantation work from one operational board."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={refresh} disabled={isLoading || isAuthLoading}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            {canManage && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setZoneDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Zone
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setPlanDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Plan
                </Button>
                <Button className="gap-2" onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-card ring-1 ring-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-xs text-muted-foreground">{stat.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="zones" className="w-full">
        <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="zones"
            className="rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Zones
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Seasonal Plans
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-[0.18em] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="pt-6">
          <Card className="border-none shadow-card ring-1 ring-border">
            <CardHeader>
              <CardTitle>Plantation Zones</CardTitle>
              <CardDescription>
                Zone-level footprint and plant mix for each plantation area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={zoneColumns} data={zones} searchKey="name" isLoading={isLoading || isAuthLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="pt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {planGroups.map(({ zone, plans: zonePlans }) => (
              <Card key={zone.id} className="border-none shadow-card ring-1 ring-border">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{zone.name}</CardTitle>
                      <CardDescription>{zone.location_name}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {zonePlans.length} plan{zonePlans.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {zone.plant_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {zone.plant_types.map((plantType) => (
                        <Badge key={plantType} variant="outline" className="bg-success/5 text-success border-success/20">
                          {plantType}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {zonePlans.length > 0 ? (
                    zonePlans.map((plan) => (
                      <div key={plan.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold">{plan.season}</p>
                            <p className="text-sm text-muted-foreground">{plan.plan_description}</p>
                          </div>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(plan.start_date)}
                          </span>
                          <span>to</span>
                          <span>{plan.end_date ? formatDate(plan.end_date) : "Open ended"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                      No seasonal plans mapped to this zone yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {unassignedPlans.length > 0 && (
              <Card className="border-none shadow-card ring-1 ring-border">
                <CardHeader>
                  <CardTitle>Unassigned Plans</CardTitle>
                  <CardDescription>Plans created without a linked zone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unassignedPlans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold">{plan.season}</p>
                          <p className="text-sm text-muted-foreground">{plan.plan_description}</p>
                        </div>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          Unassigned
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="pt-6">
          <div className="grid gap-4 xl:grid-cols-3">
            {taskColumns.map(({ status, tasks: columnTasks }) => (
              <Card
                key={status}
                className={cn("border-none shadow-card ring-1", TASK_STATUS_META[status].columnClassName)}
              >
                <CardHeader className="border-b border-border/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>{TASK_STATUS_META[status].label}</CardTitle>
                      <CardDescription>{columnTasks.length} task{columnTasks.length === 1 ? "" : "s"}</CardDescription>
                    </div>
                    <Badge variant="outline" className={TASK_STATUS_META[status].badgeClassName}>
                      {columnTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {columnTasks.length > 0 ? (
                    columnTasks.map((task) => (
                      <Card key={task.id} className="border border-border/70 shadow-none">
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-semibold">{task.task_name}</p>
                              <p className="text-sm text-muted-foreground">{task.task_type}</p>
                            </div>
                            <Badge variant="outline" className={TASK_STATUS_META[task.status].badgeClassName}>
                              {TASK_STATUS_META[task.status].label}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{task.zone_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              <span>{formatDate(task.scheduled_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sprout className="h-4 w-4" />
                              <span>{task.assigned_to_name}</span>
                            </div>
                            {task.plan_season && (
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                <span>{task.plan_season}</span>
                              </div>
                            )}
                          </div>

                          {task.notes && (
                            <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                              {task.notes}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-muted-foreground">
                              {task.photo_evidence.length} photo{task.photo_evidence.length === 1 ? "" : "s"} uploaded
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {canUpdatePlantationTask(task, role, currentEmployeeId) && task.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(task.id, "in_progress")}
                                  disabled={statusTaskId === task.id}
                                >
                                  {statusTaskId === task.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Start"
                                  )}
                                </Button>
                              )}
                              {canUpdatePlantationTask(task, role, currentEmployeeId) &&
                                task.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(task.id, "completed")}
                                  disabled={statusTaskId === task.id}
                                >
                                  {statusTaskId === task.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Complete"
                                  )}
                                </Button>
                              )}
                              {canUpdatePlantationTask(task, role, currentEmployeeId) && (
                                <>
                                  <input
                                    ref={(element) => {
                                      evidenceInputRefs.current[task.id] = element;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => handleEvidenceChange(task.id, event)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => evidenceInputRefs.current[task.id]?.click()}
                                    disabled={uploadTaskId === task.id}
                                  >
                                    {uploadTaskId === task.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Camera className="h-4 w-4" />
                                    )}
                                    Upload Photo
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-8 text-center text-sm text-muted-foreground">
                      No {TASK_STATUS_META[status].label.toLowerCase()} tasks.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Plantation Zone</DialogTitle>
            <DialogDescription>Add a new horticulture zone with location and plant coverage.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateZone}>
            <div className="space-y-2">
              <Label htmlFor="zone-name">Zone Name</Label>
              <Input
                id="zone-name"
                value={zoneForm.name}
                onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Main Lawn"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={zoneForm.locationId || "none"}
                onValueChange={(value) =>
                  setZoneForm((current) => ({ ...current, locationId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-area">Area (sq ft)</Label>
              <Input
                id="zone-area"
                type="number"
                min="0"
                value={zoneForm.areaSqft}
                onChange={(event) => setZoneForm((current) => ({ ...current, areaSqft: event.target.value }))}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant-types">Plant Types</Label>
              <Input
                id="plant-types"
                value={zoneForm.plantTypes}
                onChange={(event) => setZoneForm((current) => ({ ...current, plantTypes: event.target.value }))}
                placeholder="Shrubs, Palms, Flowering plants"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setZoneDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Zone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Seasonal Plan</DialogTitle>
            <DialogDescription>Attach a seasonal maintenance plan to a plantation zone.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreatePlan}>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select
                value={planForm.zoneId || "none"}
                onValueChange={(value) =>
                  setPlanForm((current) => ({ ...current, zoneId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-season">Season</Label>
              <Input
                id="plan-season"
                value={planForm.season}
                onChange={(event) => setPlanForm((current) => ({ ...current, season: event.target.value }))}
                placeholder="Summer 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Plan Description</Label>
              <Textarea
                id="plan-description"
                value={planForm.planDescription}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, planDescription: event.target.value }))
                }
                placeholder="Irrigation cadence, pruning scope, and seasonal planting."
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-start">Start Date</Label>
                <Input
                  id="plan-start"
                  type="date"
                  value={planForm.startDate}
                  onChange={(event) => setPlanForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-end">End Date</Label>
                <Input
                  id="plan-end"
                  type="date"
                  value={planForm.endDate}
                  onChange={(event) => setPlanForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Plantation Task</DialogTitle>
            <DialogDescription>Schedule a technician task against a seasonal plan or zone.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateTask}>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={taskForm.planId || "none"}
                onValueChange={(value) =>
                  setTaskForm((current) => ({ ...current, planId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select seasonal plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.zone_name} - {plan.season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select
                value={taskForm.zoneId || "none"}
                onValueChange={(value) =>
                  setTaskForm((current) => ({ ...current, zoneId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  value={taskForm.taskName}
                  onChange={(event) => setTaskForm((current) => ({ ...current, taskName: event.target.value }))}
                  placeholder="Morning irrigation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-type">Task Type</Label>
                <Input
                  id="task-type"
                  value={taskForm.taskType}
                  onChange={(event) => setTaskForm((current) => ({ ...current, taskType: event.target.value }))}
                  placeholder="watering"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned Technician</Label>
              <Select
                value={taskForm.assignedTo || "none"}
                onValueChange={(value) =>
                  setTaskForm((current) => ({ ...current, assignedTo: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {technicians.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled-date">Scheduled Date</Label>
              <Input
                id="scheduled-date"
                type="date"
                value={taskForm.scheduledDate}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, scheduledDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                value={taskForm.notes}
                onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Extra handling notes, watering windows, or seasonal instructions."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

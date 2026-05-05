import type { AppRole } from "@/src/lib/auth/roles";

export type PlantationTaskStatus = "pending" | "in_progress" | "completed";

export interface HorticultureZone {
  id: string;
  society_id: string;
  zone_name: string;
  area_sqft: number;
  health_status: "healthy" | "needs_attention" | "being_maintained" | "dormant";
  description: string;
  last_maintained_at: string | null;
  created_at: string;
  updated_at: string;
  soil_health?: number;
  greenery_density?: number;
}

export interface HorticultureTask {
  id: string;
  zone_id: string;
  task_type: string;
  frequency: string;
  assigned_to: string | null;
  priority: "High" | "Normal";
  status: "Scheduled" | "In Progress" | "Completed" | "Overdue";
  next_due_date: string | null;
  last_completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  zone_name?: string;
  gardener_name?: string;
}

export interface SeasonalPlan {
  id: string;
  month: string;
  title: string;
  description: string;
}

export interface HorticultureZoneRow {
  id: string;
  location_id: string | null;
  name: string | null;
  area_sqft: number | null;
  plant_types: string[] | null;
  created_at: string;
}

export interface HorticultureTaskRow extends HorticultureTask {
  horticulture_zones?: {
    zone_name: string | null;
  } | null;
  employees?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface SeasonalPlanRow {
  id: string;
  zone_id: string | null;
  season: string | null;
  plan_description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PlantationZone {
  id: string;
  name: string;
  location_id: string | null;
  location_name: string;
  area_sqft: number | null;
  plant_types: string[];
  created_at: string | null;
}

export interface PlantationPlan {
  id: string;
  zone_id: string | null;
  zone_name: string;
  season: string;
  plan_description: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string | null;
}

export interface PlantationTask {
  id: string;
  plan_id: string | null;
  plan_season: string | null;
  zone_id: string | null;
  zone_name: string;
  task_name: string;
  task_type: string;
  assigned_to: string | null;
  assigned_to_name: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: PlantationTaskStatus;
  notes: string | null;
  photo_evidence: string[];
  created_at: string | null;
}

export interface CreatePlantationZonePayload {
  name: string;
  locationId?: string | null;
  areaSqft?: number | null;
  plantTypes?: string[];
}

export interface CreatePlantationPlanPayload {
  zoneId?: string | null;
  season: string;
  planDescription: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
}

export interface CreatePlantationTaskPayload {
  planId?: string | null;
  zoneId?: string | null;
  taskName: string;
  taskType: string;
  assignedTo?: string | null;
  scheduledDate?: string | null;
  notes?: string | null;
}

export interface UpdatePlantationTaskStatusPayload {
  taskId: string;
  status: PlantationTaskStatus;
}

export interface PlantationOption {
  id: string;
  label: string;
}

export interface RawZoneRecord {
  id: string;
  name?: string | null;
  location_id?: string | null;
  area_sqft?: number | string | null;
  plant_types?: string[] | null;
  created_at?: string | null;
  location?: { location_name?: string } | Array<{ location_name?: string }> | null;
}

export interface RawPlanRecord {
  id: string;
  zone_id?: string | null;
  season?: string | null;
  plan_description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  zone?: { name?: string } | Array<{ name?: string }> | null;
}

export interface RawTaskRecord {
  id: string;
  plan_id?: string | null;
  zone_id?: string | null;
  task_name?: string | null;
  task_type?: string | null;
  assigned_to?: string | null;
  scheduled_date?: string | null;
  completed_date?: string | null;
  status?: string | null;
  notes?: string | null;
  photo_evidence?: string[] | null;
  created_at?: string | null;
  zone?: { name?: string } | Array<{ name?: string }> | null;
  plan?: { season?: string } | Array<{ season?: string }> | null;
  assignee?: { first_name?: string; last_name?: string } | Array<{ first_name?: string; last_name?: string }> | null;
}

type PlantationTaskSummary = {
  pendingTasks: PlantationTask[];
  inProgressTasks: PlantationTask[];
  completedTasks: PlantationTask[];
};

type LoaderState = {
  isAuthLoading: boolean;
  isLoading: boolean;
  plans: PlantationPlan[];
  tasks: PlantationTask[];
  zones: PlantationZone[];
};

interface PlantationTechnicianUserRow {
  employee_id: string | null;
  full_name: string | null;
}

interface CurrentUserEmployeeRow {
  employee_id: string | null;
}

export function getRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function normalizePlantTypes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function canManagePlantation(role: AppRole | null | undefined) {
  return role === "admin" || role === "super_admin" || role === "site_supervisor";
}

export function mapPlantationZone(zone: RawZoneRecord): PlantationZone {
  const location = getRelation<{ location_name?: string }>(zone?.location);

  return {
    id: zone.id,
    name: zone.name ?? "Unnamed Zone",
    location_id: zone.location_id ?? null,
    location_name: location?.location_name ?? "Unassigned",
    area_sqft: typeof zone.area_sqft === "number" ? zone.area_sqft : zone.area_sqft ? Number(zone.area_sqft) : null,
    plant_types: Array.isArray(zone.plant_types) ? zone.plant_types.filter(Boolean) : [],
    created_at: zone.created_at ?? null,
  };
}

export function mapPlantationPlan(plan: RawPlanRecord): PlantationPlan {
  const zone = getRelation<{ name?: string }>(plan?.zone);

  return {
    id: plan.id,
    zone_id: plan.zone_id ?? null,
    zone_name: zone?.name ?? "Unassigned Zone",
    season: plan.season ?? "General",
    plan_description: plan.plan_description ?? "",
    start_date: plan.start_date ?? null,
    end_date: plan.end_date ?? null,
    status: plan.status ?? "planned",
    created_by: plan.created_by ?? null,
    created_at: plan.created_at ?? null,
  };
}

export function mapPlantationTask(task: RawTaskRecord): PlantationTask {
  const zone = getRelation<{ name?: string }>(task?.zone);
  const plan = getRelation<{ season?: string }>(task?.plan);
  const assignee = getRelation<{ first_name?: string; last_name?: string }>(task?.assignee);
  const assignedName = [assignee?.first_name, assignee?.last_name].filter(Boolean).join(" ").trim();

  return {
    id: task.id,
    plan_id: task.plan_id ?? null,
    plan_season: plan?.season ?? null,
    zone_id: task.zone_id ?? null,
    zone_name: zone?.name ?? "Unassigned Zone",
    task_name: task.task_name ?? "Untitled Task",
    task_type: task.task_type ?? "general",
    assigned_to: task.assigned_to ?? null,
    assigned_to_name: assignedName || "Unassigned",
    scheduled_date: task.scheduled_date ?? null,
    completed_date: task.completed_date ?? null,
    status: (task.status ?? "pending") as PlantationTaskStatus,
    notes: task.notes ?? null,
    photo_evidence: Array.isArray(task.photo_evidence) ? task.photo_evidence.filter(Boolean) : [],
    created_at: task.created_at ?? null,
  };
}

export function mapHorticultureZone(zone: HorticultureZoneRow): HorticultureZone {
  return {
    id: zone.id,
    society_id: zone.location_id ?? "",
    zone_name: zone.name || "Unknown Zone",
    area_sqft: zone.area_sqft || 0,
    health_status: "healthy",
    description: (zone.plant_types || []).join(", "),
    last_maintained_at: null,
    created_at: zone.created_at,
    updated_at: zone.created_at,
  };
}

export function mapHorticultureTask(task: HorticultureTaskRow): HorticultureTask {
  return {
    id: task.id,
    zone_id: task.zone_id,
    task_type: task.task_type,
    frequency: task.frequency,
    assigned_to: task.assigned_to,
    priority: "Normal",
    status: "Scheduled",
    next_due_date: task.next_due_date,
    last_completed_at: task.last_completed_at,
    notes: task.notes,
    created_at: task.created_at,
    updated_at: task.updated_at,
    zone_name: task.horticulture_zones?.zone_name || "Unknown Zone",
    gardener_name: task.employees
      ? `${task.employees.first_name} ${task.employees.last_name}`.trim()
      : "Unassigned",
  };
}

export function mapSeasonalPlan(plan: SeasonalPlanRow): SeasonalPlan {
  return {
    id: plan.id,
    month: plan.season || "Unknown",
    title: plan.plan_description || "Seasonal Plan",
    description: plan.plan_description || "",
  };
}

export function buildPlantationTaskStatusUpdate(
  status: PlantationTaskStatus,
  now: Date = new Date()
) {
  return {
    status,
    completed_date: status === "completed" ? now.toISOString().split("T")[0] : null,
  };
}

export function buildPlantationEvidencePath(
  taskId: string,
  fileName: string,
  timestamp: number = Date.now()
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `plantation/${taskId}/${timestamp}_${safeName}`;
}

export function getPlantationTaskBuckets(tasks: PlantationTask[]): PlantationTaskSummary {
  return {
    pendingTasks: tasks.filter((task) => task.status === "pending"),
    inProgressTasks: tasks.filter((task) => task.status === "in_progress"),
    completedTasks: tasks.filter((task) => task.status === "completed"),
  };
}

export function groupPlantationPlansByZone(zones: PlantationZone[], plans: PlantationPlan[]) {
  return zones.map((zone) => ({
    zone,
    plans: plans.filter((plan) => plan.zone_id === zone.id),
  }));
}

export function getUnassignedPlantationPlans(plans: PlantationPlan[]) {
  return plans.filter((plan) => !plan.zone_id);
}

export function getPlantationStats(
  zones: PlantationZone[],
  plans: PlantationPlan[],
  tasks: PlantationTask[]
) {
  const { pendingTasks, completedTasks } = getPlantationTaskBuckets(tasks);

  return [
    { label: "Zones", value: zones.length, detail: "Active plantation zones" },
    { label: "Seasonal Plans", value: plans.length, detail: "Planned cycles" },
    { label: "Pending Tasks", value: pendingTasks.length, detail: "Awaiting action" },
    { label: "Completed Tasks", value: completedTasks.length, detail: "Closed tasks" },
  ];
}

export function canUpdatePlantationTask(
  task: PlantationTask,
  role: AppRole | null | undefined,
  currentEmployeeId: string | null
) {
  if (canManagePlantation(role)) return true;
  if (role !== "pest_control_technician") return false;
  return !!currentEmployeeId && task.assigned_to === currentEmployeeId;
}

export function shouldShowPlantationPageLoader({
  isAuthLoading,
  isLoading,
  plans,
  tasks,
  zones,
}: LoaderState) {
  return (isLoading || isAuthLoading) && zones.length === 0 && plans.length === 0 && tasks.length === 0;
}

export type {
  PlantationTechnicianUserRow,
  CurrentUserEmployeeRow,
  PlantationTaskSummary,
};

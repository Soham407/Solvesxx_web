import type { PlantationPlan, PlantationTask, PlantationZone } from "@/hooks/usePlantation";
import type { AppRole } from "@/src/lib/auth/roles";

type LoaderState = {
  isAuthLoading: boolean;
  isLoading: boolean;
  plans: PlantationPlan[];
  tasks: PlantationTask[];
  zones: PlantationZone[];
};

export function normalizePlantTypes(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function canManagePlantation(role: AppRole | null | undefined) {
  return role === "admin" || role === "super_admin" || role === "site_supervisor";
}

export function getPlantationTaskBuckets(tasks: PlantationTask[]) {
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

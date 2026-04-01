"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import type { Database } from "@/supabase-types";
import type { AppRole } from "@/src/lib/auth/roles";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";

const supabase = supabaseClient as unknown as SupabaseClient<Database>;

export type PlantationTaskStatus = "pending" | "in_progress" | "completed";

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

export interface PlantationOption {
  id: string;
  label: string;
}

interface UpdatePlantationTaskStatusPayload {
  taskId: string;
  status: PlantationTaskStatus;
}

interface UploadPlantationEvidencePayload {
  taskId: string;
  file: File;
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

interface PlantationTechnicianUserRow {
  employee_id: string | null;
  full_name: string | null;
}

interface CurrentUserEmployeeRow {
  employee_id: string | null;
}

function canManagePlantationOptions(role: AppRole | null | undefined) {
  return role === "admin" || role === "super_admin" || role === "site_supervisor";
}

export function getRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
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

export function usePlantation(role?: AppRole | null) {
  const {
    data: zones,
    isLoading: zonesLoading,
    refresh: refreshZones,
  } = useSupabaseQuery<PlantationZone>(async () => {
    const { data, error } = await supabase
      .from("horticulture_zones")
      .select(`
        id,
        name,
        location_id,
        area_sqft,
        plant_types,
        created_at,
        location:company_locations(location_name)
      `)
      .order("name", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as RawZoneRecord[]).map(mapPlantationZone);
  });

  const {
    data: plans,
    isLoading: plansLoading,
    refresh: refreshPlans,
  } = useSupabaseQuery<PlantationPlan>(async () => {
    const { data, error } = await supabase
      .from("horticulture_seasonal_plans")
      .select(`
        id,
        zone_id,
        season,
        plan_description,
        start_date,
        end_date,
        status,
        created_by,
        created_at,
        zone:horticulture_zones(name)
      `)
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as RawPlanRecord[]).map(mapPlantationPlan);
  });

  const {
    data: tasks,
    isLoading: tasksLoading,
    refresh: refreshTasks,
  } = useSupabaseQuery<PlantationTask>(async () => {
    const { data, error } = await supabase
      .from("horticulture_tasks")
      .select(`
        id,
        plan_id,
        zone_id,
        task_name,
        task_type,
        assigned_to,
        scheduled_date,
        completed_date,
        status,
        notes,
        photo_evidence,
        created_at,
        zone:horticulture_zones(name),
        plan:horticulture_seasonal_plans(season),
        assignee:employees(first_name, last_name)
      `)
      .order("scheduled_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as RawTaskRecord[]).map(mapPlantationTask);
  });

  const {
    data: locations,
    isLoading: locationsLoading,
  } = useSupabaseQuery<PlantationOption>(
    async () => {
      if (!canManagePlantationOptions(role)) return [];

      const { data, error } = await supabase
        .from("company_locations")
        .select("id, location_name")
        .eq("is_active", true)
        .order("location_name", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((location) => ({
        id: location.id,
        label: location.location_name ?? "Unnamed location",
      }));
    },
    [role]
  );

  const {
    data: technicians,
    isLoading: techniciansLoading,
  } = useSupabaseQuery<PlantationOption>(
    async () => {
      if (!canManagePlantationOptions(role)) return [];

      const { data, error } = await supabase
        .from("users")
        .select(`
          employee_id,
          full_name,
          roles!inner(role_name)
        `)
        .eq("is_active", true)
        .eq("roles.role_name", "pest_control_technician")
        .not("employee_id", "is", null)
        .order("full_name", { ascending: true });

      if (error) throw error;

      return ((data ?? []) as PlantationTechnicianUserRow[]).map((profile) => ({
        id: profile.employee_id as string,
        label: profile.full_name?.trim() || "Unnamed technician",
      }));
    },
    [role]
  );

  const {
    data: currentEmployeeRows,
    isLoading: currentEmployeeLoading,
  } = useSupabaseQuery<CurrentUserEmployeeRow>(
    async () => {
      if (role !== "pest_control_technician") return [];

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("employee_id")
        .eq("id", user.id)
        .limit(1);

      if (error) throw error;

      return (data ?? []) as CurrentUserEmployeeRow[];
    },
    [role]
  );

  const currentEmployeeId = currentEmployeeRows[0]?.employee_id ?? null;

  const refresh = () => {
    refreshZones();
    refreshPlans();
    refreshTasks();
  };

  const { execute: createZoneMutation, isLoading: creatingZone } = useSupabaseMutation<
    CreatePlantationZonePayload,
    PlantationZone
  >(
    async (payload) => {
      const insertPayload = {
        name: payload.name.trim(),
        location_id: payload.locationId || null,
        area_sqft: payload.areaSqft ?? null,
        plant_types: (payload.plantTypes ?? []).filter(Boolean),
      };

      const { data, error } = await supabase
        .from("horticulture_zones")
        .insert(insertPayload)
        .select(`
          id,
          name,
          location_id,
          area_sqft,
          plant_types,
          created_at,
          location:company_locations(location_name)
        `)
        .single();

      if (error) throw error;
      return mapPlantationZone(data as RawZoneRecord);
    },
    { successMessage: "Plantation zone created." }
  );

  const { execute: createPlanMutation, isLoading: creatingPlan } = useSupabaseMutation<
    CreatePlantationPlanPayload,
    PlantationPlan
  >(
    async (payload) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const insertPayload = {
        zone_id: payload.zoneId || null,
        season: payload.season.trim(),
        plan_description: payload.planDescription.trim(),
        start_date: payload.startDate || null,
        end_date: payload.endDate || null,
        status: payload.status || "planned",
        created_by: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from("horticulture_seasonal_plans")
        .insert(insertPayload)
        .select(`
          id,
          zone_id,
          season,
          plan_description,
          start_date,
          end_date,
          status,
          created_by,
          created_at,
          zone:horticulture_zones(name)
        `)
        .single();

      if (error) throw error;
      return mapPlantationPlan(data as RawPlanRecord);
    },
    { successMessage: "Seasonal plan created." }
  );

  const { execute: createTaskMutation, isLoading: creatingTask } = useSupabaseMutation<
    CreatePlantationTaskPayload,
    PlantationTask
  >(
    async (payload) => {
      const insertPayload = {
        plan_id: payload.planId || null,
        zone_id: payload.zoneId || null,
        task_name: payload.taskName.trim(),
        task_type: payload.taskType.trim(),
        assigned_to: payload.assignedTo || null,
        scheduled_date: payload.scheduledDate || null,
        notes: payload.notes?.trim() || null,
      };

      const { data, error } = await supabase
        .from("horticulture_tasks")
        .insert(insertPayload)
        .select(`
          id,
          plan_id,
          zone_id,
          task_name,
          task_type,
          assigned_to,
          scheduled_date,
          completed_date,
          status,
          notes,
          photo_evidence,
          created_at,
          zone:horticulture_zones(name),
          plan:horticulture_seasonal_plans(season),
          assignee:employees(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      return mapPlantationTask(data as RawTaskRecord);
    },
    { successMessage: "Plantation task created." }
  );

  const { execute: updateTaskStatusMutation, isLoading: updatingTask } = useSupabaseMutation<
    UpdatePlantationTaskStatusPayload,
    PlantationTaskStatus
  >(
    async ({ taskId, status }) => {
      const updates = buildPlantationTaskStatusUpdate(status);

      const { error } = await supabase
        .from("horticulture_tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
      return status;
    },
    { successMessage: "Task status updated." }
  );

  const { execute: uploadEvidenceMutation, isLoading: uploadingEvidence } = useSupabaseMutation<
    UploadPlantationEvidencePayload,
    string[]
  >(
    async ({ taskId, file }) => {
      const filePath = buildPlantationEvidencePath(taskId, file.name);

      const { error: uploadError } = await supabase.storage
        .from("service-evidence")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("service-evidence")
        .getPublicUrl(filePath);

      const { data: currentTask, error: taskError } = await supabase
        .from("horticulture_tasks")
        .select("photo_evidence")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      const nextEvidence = [
        ...(Array.isArray(currentTask?.photo_evidence) ? currentTask.photo_evidence.filter(Boolean) : []),
        publicUrlData.publicUrl,
      ];

      const { error: updateError } = await supabase
        .from("horticulture_tasks")
        .update({ photo_evidence: nextEvidence })
        .eq("id", taskId);

      if (updateError) throw updateError;

      return nextEvidence;
    },
    { successMessage: "Evidence uploaded." }
  );

  const createZone = async (payload: CreatePlantationZonePayload) => {
    const result = await createZoneMutation(payload);
    if (result.success) refresh();
    return result;
  };

  const createPlan = async (payload: CreatePlantationPlanPayload) => {
    const result = await createPlanMutation(payload);
    if (result.success) refresh();
    return result;
  };

  const createTask = async (payload: CreatePlantationTaskPayload) => {
    const result = await createTaskMutation(payload);
    if (result.success) refresh();
    return result;
  };

  const updateTaskStatus = async (taskId: string, status: PlantationTaskStatus) => {
    const result = await updateTaskStatusMutation({ taskId, status });
    if (result.success) refresh();
    return result;
  };

  const uploadEvidence = async (taskId: string, file: File) => {
    const result = await uploadEvidenceMutation({ taskId, file });
    if (result.success) refresh();
    return result;
  };

  return {
    zones,
    plans,
    tasks,
    locations,
    technicians,
    currentEmployeeId,
    isLoading:
      zonesLoading ||
      plansLoading ||
      tasksLoading ||
      locationsLoading ||
      techniciansLoading ||
      currentEmployeeLoading ||
      creatingZone ||
      creatingPlan ||
      creatingTask ||
      updatingTask ||
      uploadingEvidence,
    createZone,
    createPlan,
    createTask,
    updateTaskStatus,
    uploadEvidence,
    refresh,
  };
}

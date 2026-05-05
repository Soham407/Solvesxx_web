"use client";

import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import type { AppRole } from "@/src/lib/auth/roles";
import {
  buildPlantationEvidencePath,
  buildPlantationTaskStatusUpdate,
  canManagePlantation,
  mapPlantationPlan,
  mapPlantationTask,
  mapPlantationZone,
  type CreatePlantationPlanPayload,
  type CreatePlantationTaskPayload,
  type CreatePlantationZonePayload,
  type CurrentUserEmployeeRow,
  type PlantationOption,
  type PlantationPlan,
  type PlantationTask,
  type PlantationTaskStatus,
  type PlantationTechnicianUserRow,
  type PlantationZone,
  type RawPlanRecord,
  type RawTaskRecord,
  type RawZoneRecord,
  type UpdatePlantationTaskStatusPayload,
} from "@/src/lib/plantation/plantationTransforms";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";

const supabase = supabaseClient;
export type {
  CreatePlantationPlanPayload,
  CreatePlantationTaskPayload,
  CreatePlantationZonePayload,
  CurrentUserEmployeeRow,
  PlantationOption,
  PlantationPlan,
  PlantationTask,
  PlantationTaskStatus,
  PlantationTechnicianUserRow,
  PlantationZone,
  RawPlanRecord,
  RawTaskRecord,
  RawZoneRecord,
  UpdatePlantationTaskStatusPayload,
} from "@/src/lib/plantation/plantationTransforms";

export {
  buildPlantationEvidencePath,
  buildPlantationTaskStatusUpdate,
  canManagePlantation,
  mapPlantationPlan,
  mapPlantationTask,
  mapPlantationZone,
} from "@/src/lib/plantation/plantationTransforms";

interface UploadPlantationEvidencePayload {
  taskId: string;
  file: File;
}

export function usePlantation(role?: AppRole | null) {
  function normalizeRawZoneRows(rows: unknown): RawZoneRecord[] {
    return Array.isArray(rows) ? (rows as RawZoneRecord[]) : [];
  }

  function normalizeRawPlanRows(rows: unknown): RawPlanRecord[] {
    return Array.isArray(rows) ? (rows as RawPlanRecord[]) : [];
  }

  function normalizeRawTaskRows(rows: unknown): RawTaskRecord[] {
    return Array.isArray(rows) ? (rows as RawTaskRecord[]) : [];
  }

  function normalizeTechnicianRows(rows: unknown): PlantationTechnicianUserRow[] {
    return Array.isArray(rows) ? (rows as PlantationTechnicianUserRow[]) : [];
  }

  function normalizeCurrentEmployeeRows(rows: unknown): CurrentUserEmployeeRow[] {
    return Array.isArray(rows) ? (rows as CurrentUserEmployeeRow[]) : [];
  }

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
    return normalizeRawZoneRows(data).map(mapPlantationZone);
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
    return normalizeRawPlanRows(data).map(mapPlantationPlan);
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
    return normalizeRawTaskRows(data).map(mapPlantationTask);
  });

  const {
    data: locations,
    isLoading: locationsLoading,
  } = useSupabaseQuery<PlantationOption>(
    async () => {
      if (!canManagePlantation(role)) return [];

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
      if (!canManagePlantation(role)) return [];

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

      return normalizeTechnicianRows(data).map((profile) => ({
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

      return normalizeCurrentEmployeeRows(data);
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

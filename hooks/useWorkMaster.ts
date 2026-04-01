"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";
const supabase = supabaseTyped as any;

export interface WorkMaster {
  id: string;
  work_code: string;
  work_name: string;
  description: string | null;
  standard_time_minutes: number | null;
  skill_level_required: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  priority?: string | null;
}

export interface ServiceWiseWork {
  id: string;
  service_id: string;
  work_id: string;
  is_active: boolean;
  created_at: string;
  // Joined data
  work?: WorkMaster;
  service?: {
    service_name: string;
    service_code: string;
  };
}

interface UseWorkMasterState {
  workItems: WorkMaster[];
  serviceWorkLinks: ServiceWiseWork[];
  isLoading: boolean;
  error: string | null;
}

function normalizeWorkItem(row: any, index: number): WorkMaster {
  const generatedCode = row.work_code || `WM-${String(index + 1).padStart(3, "0")}`;

  return {
    id: row.id,
    work_code: generatedCode,
    work_name: row.work_name || "Untitled Work Item",
    description: row.description || null,
    standard_time_minutes:
      row.standard_time_minutes ?? row.estimated_duration_minutes ?? null,
    skill_level_required: row.skill_level_required || null,
    is_active: row.is_active ?? true,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    priority: row.priority || "medium",
  };
}

function formatServiceTypeLabel(serviceType: string | null | undefined) {
  if (!serviceType) {
    return {
      service_name: "General",
      service_code: "GEN",
    };
  }

  const normalized = String(serviceType).trim();
  const serviceName = normalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    service_name: serviceName || "General",
    service_code: normalized.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "GEN",
  };
}

export function useWorkMaster() {
  const [state, setState] = useState<UseWorkMasterState>({
    workItems: [],
    serviceWorkLinks: [],
    isLoading: true,
    error: null,
  });

  // Fetch all work master items
  const fetchWorkItems = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("work_master")
        .select("*")
        .order("work_name") as any;

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        workItems: ((data as any[]) || [])
          .map((row, index) => normalizeWorkItem(row, index))
          .filter((item) => item.is_active !== false),
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching work master:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch work master items",
      }));
    }
  }, []);

  // Fetch service-work links
  const fetchServiceWorkLinks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services_wise_work")
        .select(`
          *,
          work:work_id (*)
        `)
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        serviceWorkLinks: ((data as any[]) || [])
          .filter((row) => row.is_active !== false)
          .map((row) => ({
            id: row.id,
            service_id: row.service_id || row.service_type || "",
            work_id: row.work_id,
            is_active: row.is_active ?? true,
            created_at: row.created_at,
            work: row.work ? normalizeWorkItem(row.work, 0) : undefined,
            service: formatServiceTypeLabel(row.service_type),
          })),
      }));
    } catch (err: any) {
      console.error("Error fetching service-work links:", err);
    }
  }, []);

  // Create work master item
  const createWorkItem = useCallback(async (
    workData: Omit<WorkMaster, "id" | "created_at" | "updated_at">
  ): Promise<boolean> => {
    try {
      let { error } = await supabase
        .from("work_master")
        .insert({
          work_code: workData.work_code,
          work_name: workData.work_name,
          skill_level_required: workData.skill_level_required,
          standard_time_minutes: workData.standard_time_minutes,
          estimated_duration_minutes: workData.standard_time_minutes,
          description: workData.description,
          is_active: workData.is_active,
          priority: workData.priority || "medium",
        });

      if (error && /Could not find the .* column|column .* does not exist/i.test(error.message || "")) {
        const fallbackResult = await supabase
          .from("work_master")
          .insert({
            work_name: workData.work_name,
            description: workData.description,
          });
        error = fallbackResult.error;
      }

      if (error) throw error;

      await fetchWorkItems();
      return true;
    } catch (err) {
      console.error("Error creating work item:", err);
      return false;
    }
  }, [fetchWorkItems]);

  // Link work to service
  const linkWorkToService = useCallback(async (
    serviceId: string,
    workId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("services_wise_work")
        .insert({
          service_type: serviceId,
          work_id: workId,
        });

      if (error) throw error;

      await fetchServiceWorkLinks();
      return true;
    } catch (err) {
      console.error("Error linking work to service:", err);
      return false;
    }
  }, [fetchServiceWorkLinks]);

  const refresh = useCallback(() => {
    fetchWorkItems();
    fetchServiceWorkLinks();
  }, [fetchWorkItems, fetchServiceWorkLinks]);

  useEffect(() => {
    fetchWorkItems();
    fetchServiceWorkLinks();
  }, [fetchWorkItems, fetchServiceWorkLinks]);

  return {
    ...state,
    createWorkItem,
    linkWorkToService,
    refresh,
  };
}

export default useWorkMaster;

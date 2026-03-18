"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

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
        .eq("is_active", true)
        .order("work_name") as any;

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        workItems: (data as any) || [],
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
          work:work_id (*),
          service:service_id (service_name, service_code)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false }) as any;

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        serviceWorkLinks: (data as any) || [],
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
      const { error } = await supabase
        .from("work_master")
        .insert(workData);

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
          // @ts-ignore
          service_id: serviceId,
          work_id: workId,
          is_active: true,
        });

      if (error) throw error;

      await fetchServiceWorkLinks();
      return true;
    } catch (err) {
      console.error("Error linking work to service:", err);
      return false;
    }
  }, [fetchServiceWorkLinks]);

  // Update work master item
  const updateWorkItem = useCallback(async (
    id: string,
    updates: Partial<Omit<WorkMaster, "id" | "created_at" | "updated_at">>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("work_master")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchWorkItems();
      return true;
    } catch (err) {
      console.error("Error updating work item:", err);
      return false;
    }
  }, [fetchWorkItems]);

  // Soft delete work master item (archive)
  const deleteWorkItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("work_master")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      await fetchWorkItems();
      return true;
    } catch (err) {
      console.error("Error deleting work item:", err);
      return false;
    }
  }, [fetchWorkItems]);

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
    updateWorkItem,
    deleteWorkItem,
    refresh,
  };
}

export default useWorkMaster;

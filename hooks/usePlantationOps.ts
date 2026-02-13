"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

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
  
  // Joined Data
  zone_name?: string;
  gardener_name?: string;
}

interface UsePlantationOpsState {
  zones: HorticultureZone[];
  tasks: HorticultureTask[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function usePlantationOps() {
  const [state, setState] = useState<UsePlantationOpsState>({
    zones: [],
    tasks: [],
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch Zones
      const { data: zonesData, error: zonesError } = await supabase
        .from("horticulture_zones")
        .select("*")
        .order("zone_name", { ascending: true });

      if (zonesError) throw zonesError;

      // Fetch Tasks with Joined Data
      const { data: tasksData, error: tasksError } = await supabase
        .from("horticulture_tasks")
        .select(`
          *,
          horticulture_zones (zone_name),
          employees (first_name, last_name)
        `)
        .order("next_due_date", { ascending: true });

      if (tasksError) throw tasksError;

      const formattedTasks: HorticultureTask[] = (tasksData || []).map((task: any) => ({
        ...task,
        zone_name: task.horticulture_zones?.zone_name || "Unknown Zone",
        gardener_name: task.employees 
          ? `${task.employees.first_name} ${task.employees.last_name}`.trim() 
          : "Unassigned"
      }));

      setState({
        zones: zonesData || [],
        tasks: formattedTasks,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching plantation ops:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch plantation data",
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}

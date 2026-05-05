"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient;
import {
  mapHorticultureTask,
  mapHorticultureZone,
  mapSeasonalPlan,
  type HorticultureTask,
  type HorticultureTaskRow,
  type HorticultureZone,
  type HorticultureZoneRow,
  type SeasonalPlan,
  type SeasonalPlanRow,
} from "@/src/lib/plantation/plantationTransforms";

export type {
  HorticultureTask,
  HorticultureTaskRow,
  HorticultureZone,
  HorticultureZoneRow,
  SeasonalPlan,
  SeasonalPlanRow,
} from "@/src/lib/plantation/plantationTransforms";

interface UsePlantationOpsState {
  zones: HorticultureZone[];
  tasks: HorticultureTask[];
  seasonalPlans: SeasonalPlan[];
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
    seasonalPlans: [],
    isLoading: true,
    error: null,
  });

  function normalizeZoneRows(rows: unknown): HorticultureZoneRow[] {
    return Array.isArray(rows) ? (rows as HorticultureZoneRow[]) : [];
  }

  function normalizeTaskRows(rows: unknown): HorticultureTaskRow[] {
    return Array.isArray(rows) ? (rows as HorticultureTaskRow[]) : [];
  }

  function normalizeSeasonalPlanRows(rows: unknown): SeasonalPlanRow[] {
    return Array.isArray(rows) ? (rows as SeasonalPlanRow[]) : [];
  }

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

      // Fetch Seasonal Plans
      const { data: seasonalData, error: seasonalError } = await supabase
        .from("horticulture_seasonal_plans")
        .select("*")
        .order("created_at", { ascending: true });

      if (seasonalError) console.warn("Failed to fetch seasonal plans", seasonalError);

      const formattedZones: HorticultureZone[] = normalizeZoneRows(zonesData).map(mapHorticultureZone);

      const formattedTasks: HorticultureTask[] = normalizeTaskRows(tasksData).map(mapHorticultureTask);

      const formattedSeasonalPlans: SeasonalPlan[] = normalizeSeasonalPlanRows(seasonalData).map(mapSeasonalPlan);

      setState({
        zones: formattedZones,
        tasks: formattedTasks,
        seasonalPlans: formattedSeasonalPlans,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error("Error fetching plantation ops:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch plantation data",
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface AdSpace {
  id: string;
  space_name: string;
  location_description: string | null;
  asset_id: string | null;
  dimensions: string | null;
  base_rate_paise: number;
  status: "available" | "occupied" | "maintenance";
  created_at: string;
  updated_at: string;
  
  // Joined Data
  asset_name?: string;
  asset_tag?: string;
}

interface UsePrintingMasterState {
  adSpaces: AdSpace[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function usePrintingMaster() {
  const [state, setState] = useState<UsePrintingMasterState>({
    adSpaces: [],
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH AD SPACES
  // ============================================
  const fetchAdSpaces = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("printing_ad_spaces")
        .select(`
          *,
          assets!asset_id (
            asset_name,
            asset_tag
          )
        `)
        .order("space_name", { ascending: true });

      if (error) throw error;

      const adSpacesWithDetails: AdSpace[] = (data || []).map((item: any) => ({
        ...item,
        asset_name: item.assets?.asset_name || null,
        asset_tag: item.assets?.asset_tag || null,
      }));

      setState((prev) => ({
        ...prev,
        adSpaces: adSpacesWithDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching printing ad spaces:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch ad spaces",
      }));
    }
  }, []);

  // ============================================
  // UPDATE AD SPACE STATUS
  // ============================================
  const updateAdSpaceStatus = useCallback(async (spaceId: string, status: AdSpace["status"]) => {
    try {
      const { error } = await supabase
        .from("printing_ad_spaces")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", spaceId);

      if (error) throw error;

      await fetchAdSpaces();
      return true;
    } catch (err: any) {
      console.error("Error updating ad space status:", err);
      return false;
    }
  }, [fetchAdSpaces]);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    fetchAdSpaces();
  }, [fetchAdSpaces]);

  return {
    ...state,
    fetchAdSpaces,
    updateAdSpaceStatus,
    refresh: fetchAdSpaces
  };
}

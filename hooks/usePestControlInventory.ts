"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface PestControlChemical {
  id: string;
  product_id: string;
  current_stock: number;
  unit: string;
  reorder_level: number;
  last_restocked_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined Data
  product_name?: string;
  product_code?: string;
}

export interface PPEVerification {
  id: string;
  technician_id: string;
  service_request_id: string | null;
  items_json: Array<{ item: string; verified: boolean; mandatory: boolean }>;
  status: "pending" | "verified" | "failed";
  site_readiness_report: string | null;
  verified_at: string;
  created_at: string;
  
  // Joined Data
  technician_name?: string;
}

interface UsePestControlInventoryState {
  chemicals: PestControlChemical[];
  verifications: PPEVerification[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function usePestControlInventory() {
  const [state, setState] = useState<UsePestControlInventoryState>({
    chemicals: [],
    verifications: [],
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH CHEMICALS
  // ============================================
  const fetchChemicals = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("pest_control_chemicals")
        .select(`
          *,
          products!product_id (
            product_name,
            product_code
          )
        `)
        .eq("is_active", true)
        .order("current_stock", { ascending: true });

      if (error) throw error;

      const chemicalsWithDetails: PestControlChemical[] = (data || []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name || "Unknown Product",
        product_code: item.products?.product_code || "N/A",
      }));

      setState((prev) => ({
        ...prev,
        chemicals: chemicalsWithDetails,
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching PC chemicals:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch chemicals",
      }));
    }
  }, []);

  // ============================================
  // FETCH PPE VERIFICATIONS
  // ============================================
  const fetchPPEVerifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pest_control_ppe_verifications")
        .select(`
          *,
          employees!technician_id (
            first_name,
            last_name
          )
        `)
        .order("verified_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const verificationsWithDetails: PPEVerification[] = (data || []).map((item: any) => ({
        ...item,
        technician_name: item.employees
          ? `${item.employees.first_name} ${item.employees.last_name}`.trim()
          : "Unknown Technician",
      }));

      setState((prev) => ({
        ...prev,
        verifications: verificationsWithDetails,
      }));
    } catch (err: any) {
      console.error("Error fetching PPE verifications:", err);
    }
  }, []);

  // ============================================
  // SUBMIT PPE VERIFICATION
  // ============================================
  const submitPPEVerification = useCallback(async (input: {
    technician_id: string;
    service_request_id?: string;
    items: Array<{ item: string; verified: boolean; mandatory: boolean }>;
    site_readiness_report?: string;
    status: "verified" | "failed";
  }) => {
    try {
      const { error } = await supabase
        .from("pest_control_ppe_verifications")
        .insert({
          technician_id: input.technician_id,
          service_request_id: input.service_request_id,
          items_json: input.items,
          status: input.status,
          site_readiness_report: input.site_readiness_report,
        });

      if (error) throw error;

      await fetchPPEVerifications();
      return true;
    } catch (err: any) {
      console.error("Error submitting PPE verification:", err);
      return false;
    }
  }, [fetchPPEVerifications]);

  // ============================================
  // UPDATE STOCK
  // ============================================
  const updateStock = useCallback(async (chemicalId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from("pest_control_chemicals")
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq("id", chemicalId);

      if (error) throw error;

      await fetchChemicals();
      return true;
    } catch (err: any) {
      console.error("Error updating PC chemical stock:", err);
      return false;
    }
  }, [fetchChemicals]);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    fetchChemicals();
    fetchPPEVerifications();
  }, [fetchChemicals, fetchPPEVerifications]);

  return {
    ...state,
    fetchChemicals,
    fetchPPEVerifications,
    submitPPEVerification,
    updateStock,
    refresh: () => {
      fetchChemicals();
      fetchPPEVerifications();
    }
  };
}

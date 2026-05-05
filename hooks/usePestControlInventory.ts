"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { Json } from "@/src/types/supabase";

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
  expiry_date: string | null;
  batch_number: string | null;
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

type PestControlChemicalRow = PestControlChemical & {
  products?: { product_name?: string | null; product_code?: string | null } | null;
};

type PPEVerificationRow = Omit<PPEVerification, "items_json"> & {
  items_json: Json;
  employees?: { first_name?: string | null; last_name?: string | null } | null;
};

function mapChemicalRows(rows: PestControlChemicalRow[]): PestControlChemical[] {
  return rows.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    current_stock: item.current_stock,
    unit: item.unit,
    reorder_level: item.reorder_level,
    last_restocked_at: item.last_restocked_at,
    is_active: item.is_active ?? true,
    expiry_date: item.expiry_date,
    batch_number: item.batch_number,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    product_name: item.products?.product_name || "Unknown Product",
    product_code: item.products?.product_code || "N/A",
  }));
}

function mapVerificationRows(rows: PPEVerificationRow[]): PPEVerification[] {
  return rows.map((item) => ({
    id: item.id,
    technician_id: item.technician_id,
    service_request_id: item.service_request_id,
    items_json: parseChecklistItems(item.items_json),
    status: item.status,
    site_readiness_report: item.site_readiness_report,
    verified_at: item.verified_at,
    created_at: item.created_at,
    technician_name: item.employees
      ? `${item.employees.first_name} ${item.employees.last_name}`.trim()
      : "Unknown Technician",
  }));
}

function parseChecklistItems(items: Json): Array<{ item: string; verified: boolean; mandatory: boolean }> {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (item as { item?: unknown }).item === "string" &&
        typeof (item as { verified?: unknown }).verified === "boolean" &&
        typeof (item as { mandatory?: unknown }).mandatory === "boolean"
      ) {
        const record = item as { item: string; verified: boolean; mandatory: boolean };
        return record;
      }

      return null;
    })
    .filter((item): item is { item: string; verified: boolean; mandatory: boolean } => item !== null);
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

      const chemicalsWithDetails: PestControlChemical[] = mapChemicalRows((data || []) as PestControlChemicalRow[]);

      setState((prev) => ({
        ...prev,
        chemicals: chemicalsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching PC chemicals:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch chemicals",
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

      const verificationsWithDetails: PPEVerification[] = mapVerificationRows((data || []) as PPEVerificationRow[]);

      setState((prev) => ({
        ...prev,
        verifications: verificationsWithDetails,
      }));
    } catch (err: unknown) {
      console.error("Error fetching PPE verifications:", err);
    }
  }, []);

  // ============================================
  // SUBMIT PPE VERIFICATION
  // ============================================
  const submitPPEVerification = useCallback(async (input: {
    technician_id: string;
    service_request_id?: string;
    job_session_id?: string;
    items: Array<{ item: string; verified: boolean; mandatory: boolean }>;
    site_readiness_report?: string;
    status: "verified" | "failed";
  }) => {
    try {
      let jobSessionId = input.job_session_id || null;
      if (!jobSessionId && input.service_request_id) {
        const { data: latestSession } = await supabase
          .from("job_sessions")
          .select("id")
          .eq("service_request_id", input.service_request_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        jobSessionId = latestSession?.id || null;
      }

      const { error } = await supabase
        .from("pest_control_ppe_verifications")
        .insert({
          technician_id: input.technician_id,
          service_request_id: input.service_request_id,
          job_session_id: jobSessionId,
          items_json: input.items as Json,
          status: input.status,
          site_readiness_report: input.site_readiness_report,
        });

      if (error) throw error;

      await fetchPPEVerifications();
      return true;
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error("Error updating PC chemical stock:", err);
      return false;
    }
  }, [fetchChemicals]);

  // ============================================
  // ISSUE CHEMICAL
  // ============================================
  const issueChemical = useCallback(async (input: {
    chemicalId: string;
    quantity: number;
    recipientId?: string;
    notes?: string;
  }) => {
    try {
      const chem = state.chemicals.find(c => c.id === input.chemicalId);
      if (!chem) throw new Error("Chemical not found in inventory.");

      // 1. Pre-flight Check: Expiry
      if (chem.expiry_date && new Date(chem.expiry_date) < new Date()) {
        return { 
          success: false, 
          error: `Cannot issue expired chemical: ${chem.product_name} expired on ${new Date(chem.expiry_date).toLocaleDateString()}` 
        };
      }

      // 2. Pre-flight Check: Stock level
      if (Number(chem.current_stock) < input.quantity) {
        return { success: false, error: "Insufficient stock." };
      }

      // 3. Record Stock Transaction
      const { error: txError } = await supabase
        .from("stock_transactions")
        .insert({
          product_id: chem.product_id,
          transaction_type: "issue",
          quantity: -Math.abs(input.quantity),
          unit_of_measurement: chem.unit,
          transaction_date: new Date().toISOString().split('T')[0],
          batch_number: chem.batch_number,
          notes: input.notes || `Issued to technician ${input.recipientId || ""}`,
          transaction_number: `TX-PC-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

      if (txError) throw txError;

      // 4. Update Chemical Stock
      const { error: updateError } = await supabase
        .from("pest_control_chemicals")
        .update({ 
          current_stock: Number(chem.current_stock) - Number(input.quantity),
          updated_at: new Date().toISOString()
        })
        .eq("id", input.chemicalId);

      if (updateError) throw updateError;

      await fetchChemicals();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error issuing PC chemical:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to issue chemical." };
    }
  }, [state.chemicals, fetchChemicals]);

  // ============================================
  // UPDATE EXPIRY & BATCH
  // ============================================
  const updateExpiry = useCallback(async (chemicalId: string, input: { expiry_date: string; batch_number: string }) => {
    try {
      const { error } = await supabase
        .from("pest_control_chemicals")
        .update({ 
          expiry_date: input.expiry_date,
          batch_number: input.batch_number,
          updated_at: new Date().toISOString()
        })
        .eq("id", chemicalId);

      if (error) throw error;

      await fetchChemicals();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error updating chemical expiry:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to update expiry information." };
    }
  }, [fetchChemicals]);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    fetchChemicals();
    fetchPPEVerifications();
  }, [fetchChemicals, fetchPPEVerifications]);

  // Chemicals expiring within 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringChemicals = state.chemicals.filter((c) => {
    if (!c.expiry_date) return false;
    const exp = new Date(c.expiry_date);
    const today = new Date();
    return exp > today && exp <= thirtyDaysFromNow;
  });

  // Blocked Chemicals (Already Expired)
  const blockedChemicals = state.chemicals.filter((c) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date) < new Date();
  });

  return {
    ...state,
    expiringChemicals,
    blockedChemicals,
    fetchChemicals,
    fetchPPEVerifications,
    submitPPEVerification,
    updateStock,
    issueChemical,
    updateExpiry,
    refresh: () => {
      fetchChemicals();
      fetchPPEVerifications();
    }
  };
}

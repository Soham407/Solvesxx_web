"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface VendorWiseService {
  id: string;
  supplier_id: string;
  service_id: string;
  vendor_rate: number | null; // in paise
  response_time_sla: string | null;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  supplier?: {
    supplier_name: string;
    supplier_code: string;
    mobile: string;
  };
  service?: {
    service_name: string;
    service_code: string;
    service_category: string;
  };
}

interface UseVendorWiseServicesState {
  vendorServices: VendorWiseService[];
  isLoading: boolean;
  error: string | null;
}

export function useVendorWiseServices() {
  const [state, setState] = useState<UseVendorWiseServicesState>({
    vendorServices: [],
    isLoading: true,
    error: null,
  });

  // Fetch all vendor-service links
  const fetchVendorServices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("vendor_wise_services")
        .select(`
          *,
          supplier:supplier_id (
            supplier_name,
            supplier_code,
            mobile
          ),
          service:service_id (
            service_name,
            service_code,
            service_category
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        vendorServices: data || [],
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error fetching vendor services:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch vendor services",
      }));
    }
  }, []);

  // Create vendor-service link
  const createVendorService = useCallback(async (
    vendorServiceData: Omit<VendorWiseService, "id" | "created_at" | "updated_at">
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("vendor_wise_services")
        .insert(vendorServiceData);

      if (error) throw error;

      await fetchVendorServices();
      return true;
    } catch (err) {
      console.error("Error creating vendor service:", err);
      return false;
    }
  }, [fetchVendorServices]);

  // Update vendor-service
  const updateVendorService = useCallback(async (
    id: string,
    updates: Partial<VendorWiseService>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("vendor_wise_services")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchVendorServices();
      return true;
    } catch (err) {
      console.error("Error updating vendor service:", err);
      return false;
    }
  }, [fetchVendorServices]);

  // Get vendors by service
  const getVendorsByService = useCallback((serviceId: string) => {
    return state.vendorServices.filter(vs => vs.service_id === serviceId);
  }, [state.vendorServices]);

  // Get services by vendor
  const getServicesByVendor = useCallback((supplierId: string) => {
    return state.vendorServices.filter(vs => vs.supplier_id === supplierId);
  }, [state.vendorServices]);

  const refresh = useCallback(() => {
    fetchVendorServices();
  }, [fetchVendorServices]);

  useEffect(() => {
    fetchVendorServices();
  }, [fetchVendorServices]);

  return {
    ...state,
    createVendorService,
    updateVendorService,
    getVendorsByService,
    getServicesByVendor,
    refresh,
  };
}

export default useVendorWiseServices;

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  mapVendorWiseServiceRow,
  type VendorServiceCreateInput,
  type VendorWiseService,
  type VendorWiseServiceRow,
} from "@/src/lib/vendor-services/vendorServiceTransforms";

export type { VendorWiseService } from "@/src/lib/vendor-services/vendorServiceTransforms";

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
          supplier:suppliers (
            supplier_name,
            supplier_code
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        vendorServices: ((data as VendorWiseServiceRow[] | null) || []).map(mapVendorWiseServiceRow),
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching vendor services:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch vendor services",
      }));
    }
  }, []);

  // Create vendor-service link
  const createVendorService = useCallback(async (
    vendorServiceData: VendorServiceCreateInput
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("vendor_wise_services")
        .insert({
          supplier_id: vendorServiceData.supplier_id,
          service_type: vendorServiceData.service_type,
          is_active: vendorServiceData.is_active,
        });

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
          supplier_id: updates.supplier_id,
          service_type: updates.service_type,
          is_active: updates.is_active,
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

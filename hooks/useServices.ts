"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { Service, ServiceInsert, ServiceUpdate } from "@/src/types/phaseB";

interface UseServicesState {
  services: Service[];
  isLoading: boolean;
  error: string | null;
}

interface UseServicesReturn extends UseServicesState {
  createService: (data: ServiceInsert) => Promise<{ success: boolean; error?: string; data?: Service }>;
  updateService: (id: string, data: ServiceUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  getServiceById: (id: string) => Service | undefined;
  getServicesByCategory: (category: string) => Service[];
  refresh: () => void;
}

/**
 * Hook for managing service types/definitions
 */
export function useServices(): UseServicesReturn {
  const [state, setState] = useState<UseServicesState>({
    services: [],
    isLoading: true,
    error: null,
  });

  // Fetch all active services
  const fetchServices = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("service_name");

      if (error) throw error;

      setState({
        services: data || [],
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch services";
      console.error("Error fetching services:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Create new service
  const createService = useCallback(
    async (data: ServiceInsert): Promise<{ success: boolean; error?: string; data?: Service }> => {
      try {
        const { data: newService, error } = await supabase
          .from("services")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          services: [...prev.services, newService].sort((a, b) =>
            a.service_name.localeCompare(b.service_name)
          ),
        }));

        return { success: true, data: newService };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create service";
        console.error("Error creating service:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Update service
  const updateService = useCallback(
    async (id: string, data: ServiceUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("services").update(data).eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          services: prev.services.map((svc) =>
            svc.id === id ? { ...svc, ...data } : svc
          ),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update service";
        console.error("Error updating service:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Soft delete service
  const deleteService = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("services")
          .update({ is_active: false })
          .eq("id", id);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          services: prev.services.filter((svc) => svc.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete service";
        console.error("Error deleting service:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Get service by ID
  const getServiceById = useCallback(
    (id: string): Service | undefined => {
      return state.services.find((svc) => svc.id === id);
    },
    [state.services]
  );

  // Get services by category
  const getServicesByCategory = useCallback(
    (category: string): Service[] => {
      return state.services.filter((svc) => svc.service_category === category);
    },
    [state.services]
  );

  // Refresh data
  const refresh = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  // Initialize on mount
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    ...state,
    createService,
    updateService,
    deleteService,
    getServiceById,
    getServicesByCategory,
    refresh,
  };
}

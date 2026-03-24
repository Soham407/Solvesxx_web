"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
const supabase = supabaseClient as any;
import type {
  ServiceRequest,
  ServiceRequestInsert,
  ServiceRequestUpdate,
  ServiceRequestWithDetails,
  ServiceRequestFilters,
  ServiceDashboardStats,
} from "@/src/types/operations";
import { PAGINATION } from "@/src/lib/constants";
import { sanitizeLikeInput } from "@/lib/sanitize";

interface UseServiceRequestsState {
  requests: ServiceRequestWithDetails[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  stats: ServiceDashboardStats | null;
}

interface UseServiceRequestsReturn extends UseServiceRequestsState {
  createRequest: (data: Omit<ServiceRequestInsert, "request_number">) => Promise<{ success: boolean; error?: string; data?: ServiceRequest }>;
  updateRequest: (id: string, data: ServiceRequestUpdate) => Promise<{ success: boolean; error?: string }>;
  assignRequest: (id: string, technicianId: string) => Promise<{ success: boolean; error?: string }>;
  completeRequest: (id: string, resolutionNotes?: string) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  startTask: (id: string, beforePhotoUrl?: string) => Promise<{ success: boolean; error?: string }>;
  completeTask: (id: string, afterPhotoUrl: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  getRequestById: (id: string) => Promise<ServiceRequestWithDetails | null>;
  setFilters: (filters: ServiceRequestFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  fetchStats: () => Promise<void>;
}

/**
 * Hook for managing service requests with full workflow support
 */
export function useServiceRequests(initialFilters?: ServiceRequestFilters): UseServiceRequestsReturn {
  const [state, setState] = useState<UseServiceRequestsState>({
    requests: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    isLoading: true,
    error: null,
    stats: null,
  });

  const [filters, setFiltersState] = useState<ServiceRequestFilters>(initialFilters || {});

  // Fetch requests with filters and pagination
  const fetchRequests = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("service_requests_with_details")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }
      if (filters.assetId) {
        query = query.eq("asset_id", filters.assetId);
      }
      if (filters.serviceId) {
        query = query.eq("service_id", filters.serviceId);
      }
      if (filters.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters.societyId) {
        query = query.eq("society_id", filters.societyId);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,request_number.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,description.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`
        );
      }

      // Pagination
      const from = (state.currentPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        requests: (data as ServiceRequestWithDetails[]) || [],
        totalCount: count || 0,
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch requests";
      console.error("Error fetching service requests:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters, state.currentPage, state.pageSize]);

  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get all requests for stats calculation
      const { data: allRequests, error: reqError } = await supabase
        .from("service_requests")
        .select("status, priority, created_at, completed_at");

      if (reqError) throw reqError;

      const requests = allRequests || [];
      const completedToday = requests.filter(
        (r) => r.status === "completed" && r.completed_at?.startsWith(today)
      ).length;

      // Calculate average resolution time for completed requests
      const completedWithTimes = requests.filter(
        (r) => r.status === "completed" && r.created_at && r.completed_at
      );
      const avgResolutionTime =
        completedWithTimes.length > 0
          ? completedWithTimes.reduce((acc, r) => {
              const created = new Date(r.created_at!).getTime();
              const completed = new Date(r.completed_at!).getTime();
              return acc + (completed - created) / (1000 * 60 * 60);
            }, 0) / completedWithTimes.length
          : 0;

      const stats: ServiceDashboardStats = {
        openRequests: requests.filter((r) => r.status === "open").length,
        inProgressRequests: requests.filter((r) => r.status === "in_progress").length,
        completedToday,
        overdueRequests: 0, // TODO: Calculate based on SLA
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        urgentRequests: requests.filter((r) => r.priority === "urgent" && r.status !== "completed").length,
      };

      setState((prev) => ({ ...prev, stats }));
    } catch (err: unknown) {
      console.error("Error fetching service request stats:", err);
    }
  }, []);

  // Create new request (request_number is auto-generated by trigger)
  const createRequest = useCallback(
    async (
      data: Omit<ServiceRequestInsert, "request_number">
    ): Promise<{ success: boolean; error?: string; data?: ServiceRequest }> => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Not authenticated");

        const fallbackRequestNumber = `REQ-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;
        const insertData = {
          ...data,
          created_by: data.created_by ?? user.id,
          request_number: fallbackRequestNumber,
          requester_id: data.requester_id ?? user.id,
          status: "open" as const,
        };

        const { data: newRequest, error } = await supabase
          .from("service_requests")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        fetchRequests();

        return { success: true, data: newRequest };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create request";
        console.error("Error creating service request:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests]
  );

  // Update request
  const updateRequest = useCallback(
    async (id: string, data: ServiceRequestUpdate): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.from("service_requests").update(data).eq("id", id);

        if (error) throw error;

        fetchRequests();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update request";
        console.error("Error updating service request:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests]
  );

  // Assign request to technician
  const assignRequest = useCallback(
    async (id: string, technicianId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("service_requests")
          .update({
            assigned_to: technicianId,
            assigned_at: new Date().toISOString(),
            status: "assigned",
          })
          .eq("id", id);

        if (error) throw error;

        fetchRequests();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to assign request";
        console.error("Error assigning service request:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests]
  );

  // Complete request
  const completeRequest = useCallback(
    async (id: string, resolutionNotes?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("service_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            resolution_notes: resolutionNotes,
          })
          .eq("id", id);

        if (error) throw error;

        fetchRequests();
        fetchStats();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to complete request";
        console.error("Error completing service request:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests, fetchStats]
  );

  // Start service task via RPC
  const startTask = useCallback(
    async (id: string, beforePhotoUrl?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.rpc("start_service_task", {
          p_request_id: id,
          p_before_photo_url: beforePhotoUrl || null,
        });

        if (error) throw error;

        fetchRequests();
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to start task";
        console.error("Error starting service task:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests]
  );

  // Complete service task via RPC (Enforced photo evidence)
  const completeTask = useCallback(
    async (id: string, afterPhotoUrl: string, notes?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase.rpc("complete_service_task", {
          p_request_id: id,
          p_after_photo_url: afterPhotoUrl,
          p_completion_notes: notes || null,
        });

        if (error) throw error;

        fetchRequests();
        fetchStats();
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to complete task";
        console.error("Error completing service task:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests, fetchStats]
  );

  // Cancel request
  const cancelRequest = useCallback(
    async (id: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await supabase
          .from("service_requests")
          .update({
            status: "cancelled",
            resolution_notes: reason,
          })
          .eq("id", id);

        if (error) throw error;

        fetchRequests();

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to cancel request";
        console.error("Error cancelling service request:", err);
        return { success: false, error: errorMessage };
      }
    },
    [fetchRequests]
  );

  // Get single request by ID
  const getRequestById = useCallback(
    async (id: string): Promise<ServiceRequestWithDetails | null> => {
      try {
        const { data, error } = await supabase
          .from("service_requests_with_details")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        return data as ServiceRequestWithDetails;
      } catch (err: unknown) {
        console.error("Error fetching request by ID:", err);
        return null;
      }
    },
    []
  );

  // Set filters
  const setFilters = useCallback((newFilters: ServiceRequestFilters) => {
    setFiltersState(newFilters);
    setState((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Set page
  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  }, []);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    fetchRequests();
    fetchStats();
  }, [fetchRequests, fetchStats]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...state,
    createRequest,
    updateRequest,
    assignRequest,
    completeRequest,
    startTask,
    completeTask,
    cancelRequest,
    getRequestById,
    setFilters,
    setPage,
    setPageSize,
    refresh,
    fetchStats,
  };
}

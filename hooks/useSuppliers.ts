"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { PAGINATION } from "@/src/lib/constants";
import {
  SupplierExtended,
  SupplierFilters,
  SupplierDashboardStats,
  CreateSupplierForm,
  UpdateSupplierForm,
  SupplierStatus,
  MutationResult,
  canTransitionSupplierStatus,
} from "@/src/types/phaseD";
import { sanitizeLikeInput } from "@/lib/sanitize";

/**
 * Suppliers Hook
 * Phase D: Supply Chain Core
 * 
 * Features:
 * - Full CRUD operations for suppliers
 * - Status management with transition validation
 * - Performance score tracking (manual entry)
 * - Tier management (Platinum/Gold/Silver)
 * - Pagination and filtering
 * - Dashboard statistics
 */

interface UseSuppliersState {
  suppliers: SupplierExtended[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  stats: SupplierDashboardStats | null;
}

const initialState: UseSuppliersState = {
  suppliers: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  isLoading: true,
  error: null,
  stats: null,
};

export function useSuppliers(initialFilters?: SupplierFilters) {
  const { toast } = useToast();
  const [state, setState] = useState<UseSuppliersState>(initialState);
  const [filters, setFiltersState] = useState<SupplierFilters>(initialFilters || {});

  // Calculate statistics from all suppliers (unfiltered)
  const calculateStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, is_active, status, is_verified, rating, tier");

      if (error) throw error;

      const suppliers = data || [];
      
      // Calculate stats
      const stats: SupplierDashboardStats = {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.status === 'active' || (s.is_active && !s.status)).length,
        inactiveSuppliers: suppliers.filter(s => s.status === 'inactive' || (!s.is_active && !s.status)).length,
        blacklistedSuppliers: suppliers.filter(s => s.status === 'blacklisted').length,
        pendingVerification: suppliers.filter(s => s.status === 'pending_verification').length,
        verifiedSuppliers: suppliers.filter(s => s.is_verified).length,
        averageRating: suppliers.length > 0 
          ? suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length 
          : 0,
        suppliersByTier: {
          platinum: suppliers.filter(s => s.tier === 1).length,
          gold: suppliers.filter(s => s.tier === 2).length,
          silver: suppliers.filter(s => s.tier === 3 || !s.tier).length,
        },
      };

      setState(prev => ({ ...prev, stats }));
    } catch (err) {
      console.error("Error calculating supplier stats:", err);
    }
  }, []);

  // Fetch suppliers with pagination and filters
  const fetchSuppliers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Calculate pagination range
      const from = (state.currentPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      let query = supabase
        .from("suppliers")
        .select("*", { count: "exact" })
        .order("supplier_name", { ascending: true })
        .range(from, to);

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }

      if (filters.supplier_type && filters.supplier_type !== 'all') {
        query = query.eq("supplier_type", filters.supplier_type);
      }

      if (filters.tier && filters.tier !== 'all') {
        query = query.eq("tier", filters.tier);
      }

      if (filters.is_verified !== undefined) {
        query = query.eq("is_verified", filters.is_verified);
      }

      if (filters.searchTerm) {
        query = query.or(
          `supplier_name.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,` +
          `supplier_code.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,` +
          `contact_person.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,` +
          `email.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,` +
          `gst_number.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setState(prev => ({
        ...prev,
        suppliers: (data || []) as SupplierExtended[],
        totalCount: count || 0,
        isLoading: false,
        error: null,
      }));

      // Calculate stats in background
      calculateStats();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load suppliers";
      console.error("Error fetching suppliers:", err);
      setState(prev => ({
        ...prev,
        suppliers: [],
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.currentPage, state.pageSize, filters, calculateStats]);

  // Get supplier by ID
  const getSupplierById = useCallback(async (supplierId: string): Promise<SupplierExtended | null> => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
        .single();

      if (error) throw error;
      return data as SupplierExtended;
    } catch (err: unknown) {
      console.error("Error fetching supplier:", err);
      return null;
    }
  }, []);

  // Get supplier by code
  const getSupplierByCode = useCallback(async (supplierCode: string): Promise<SupplierExtended | null> => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("supplier_code", supplierCode)
        .single();

      if (error) throw error;
      return data as SupplierExtended;
    } catch (err: unknown) {
      console.error("Error fetching supplier by code:", err);
      return null;
    }
  }, []);

  // Create new supplier
  const createSupplier = useCallback(async (
    supplierData: CreateSupplierForm
  ): Promise<MutationResult<SupplierExtended>> => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          supplier_name: supplierData.supplier_name,
          supplier_type: supplierData.supplier_type,
          contact_person: supplierData.contact_person,
          phone: supplierData.phone,
          alternate_phone: supplierData.alternate_phone,
          email: supplierData.email,
          address: supplierData.address,
          city: supplierData.city,
          state: supplierData.state,
          pincode: supplierData.pincode,
          country: supplierData.country || 'India',
          gst_number: supplierData.gst_number,
          pan_number: supplierData.pan_number,
          bank_name: supplierData.bank_name,
          bank_account_number: supplierData.bank_account_number,
          ifsc_code: supplierData.ifsc_code,
          payment_terms: supplierData.payment_terms || 30,
          credit_limit: supplierData.credit_limit || 0,
          status: supplierData.status || 'pending_verification',
          is_active: true,
          tier: 3, // Default to Silver tier
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Supplier Created",
        description: `${supplierData.supplier_name} has been added successfully`,
      });

      await fetchSuppliers();
      return { success: true, data: data as SupplierExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create supplier";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Update supplier
  const updateSupplier = useCallback(async (
    supplierId: string,
    updates: UpdateSupplierForm
  ): Promise<MutationResult<SupplierExtended>> => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Supplier Updated",
        description: "Supplier details have been updated",
      });

      await fetchSuppliers();
      return { success: true, data: data as SupplierExtended };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update supplier";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Update supplier status with transition validation
  const updateStatus = useCallback(async (
    supplierId: string,
    newStatus: SupplierStatus,
    reason?: string
  ): Promise<MutationResult> => {
    try {
      // First get current status
      const { data: supplier, error: fetchError } = await supabase
        .from("suppliers")
        .select("status, supplier_name")
        .eq("id", supplierId)
        .single();

      if (fetchError) throw fetchError;
      if (!supplier) throw new Error("Supplier not found");

      const currentStatus = (supplier.status || 'pending_verification') as SupplierStatus;

      // Validate transition
      if (!canTransitionSupplierStatus(currentStatus, newStatus)) {
        throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}`);
      }

      // Update status
      const { error: updateError } = await supabase
        .from("suppliers")
        .update({
          status: newStatus,
          is_active: newStatus === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId);

      if (updateError) throw updateError;

      toast({
        title: "Status Updated",
        description: `${supplier.supplier_name} is now ${newStatus.replace('_', ' ')}`,
      });

      await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Update supplier scores
  const updateScores = useCallback(async (
    supplierId: string,
    scores: {
      quality_score?: number;
      delivery_score?: number;
      price_score?: number;
      service_score?: number;
    }
  ): Promise<MutationResult> => {
    try {
      // Calculate overall score as average of provided scores
      const scoreValues = Object.values(scores).filter(v => v !== undefined) as number[];
      const overall_score = scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : undefined;

      const { error } = await supabase
        .from("suppliers")
        .update({
          ...scores,
          overall_score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId);

      if (error) throw error;

      toast({
        title: "Scores Updated",
        description: "Supplier performance scores have been updated",
      });

      await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update scores";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Update supplier tier
  const updateTier = useCallback(async (
    supplierId: string,
    tier: 1 | 2 | 3
  ): Promise<MutationResult> => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          tier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId);

      if (error) throw error;

      const tierNames = { 1: 'Platinum', 2: 'Gold', 3: 'Silver' };
      toast({
        title: "Tier Updated",
        description: `Supplier tier changed to ${tierNames[tier]}`,
      });

      await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update tier";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Verify supplier
  const verifySupplier = useCallback(async (
    supplierId: string,
    verified: boolean = true
  ): Promise<MutationResult> => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          is_verified: verified,
          status: verified ? 'active' : 'pending_verification',
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId);

      if (error) throw error;

      toast({
        title: verified ? "Supplier Verified" : "Verification Removed",
        description: verified 
          ? "Supplier has been verified and activated" 
          : "Supplier verification has been removed",
      });

      await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update verification";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Delete supplier (soft delete by setting status to inactive)
  const deleteSupplier = useCallback(async (
    supplierId: string,
    hardDelete: boolean = false
  ): Promise<MutationResult> => {
    try {
      if (hardDelete) {
        const { error } = await supabase
          .from("suppliers")
          .delete()
          .eq("id", supplierId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("suppliers")
          .update({
            status: 'inactive',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", supplierId);

        if (error) throw error;
      }

      toast({
        title: "Supplier Removed",
        description: hardDelete 
          ? "Supplier has been permanently deleted" 
          : "Supplier has been deactivated",
      });

      await fetchSuppliers();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete supplier";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  }, [fetchSuppliers, toast]);

  // Helper: Get supplier name by ID (from cached data)
  const getSupplierName = useCallback((supplierId: string | null): string => {
    if (!supplierId) return "Unknown";
    const supplier = state.suppliers.find(s => s.id === supplierId);
    return supplier?.supplier_name || "Unknown";
  }, [state.suppliers]);

  // Set filters and reset to page 1
  const setFilters = useCallback((newFilters: SupplierFilters) => {
    setFiltersState(newFilters);
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Set current page
  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    // Data
    suppliers: state.suppliers,
    totalCount: state.totalCount,
    stats: state.stats,
    isLoading: state.isLoading,
    error: state.error,

    // Pagination
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    setPage,
    setPageSize,

    // CRUD Operations
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    getSupplierByCode,

    // Status Management
    updateStatus,
    updateScores,
    updateTier,
    verifySupplier,

    // Helpers
    getSupplierName,
    clearError,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh: fetchSuppliers,
  };
}

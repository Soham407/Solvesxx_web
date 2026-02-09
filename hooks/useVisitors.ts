"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

/**
 * Visitor Management Hook
 * PRD Reference: Visitor Management System (I-IV)
 * 
 * Features:
 * - Guest Entry: Capture Name, Photo, Phone Number, Vehicle Number
 * - Daily Visitor Database (Maids, Drivers, Milkmen)
 * - Society Family Database (Flat lookup)
 * - Analytics: Total entries per day/week
 */

export interface Visitor {
  id: string;
  visitor_name: string;
  visitor_type: "guest" | "vendor" | "contractor" | "service_staff" | "daily_helper";
  phone: string | null;
  vehicle_number: string | null;
  photo_url: string | null;
  flat_id: string | null;
  resident_id: string | null;
  purpose: string | null;
  entry_time: string;
  exit_time: string | null;
  entry_guard_id: string | null;
  exit_guard_id: string | null;
  entry_location_id: string | null;
  approved_by_resident: boolean;
  visitor_pass_number: string | null;
  is_frequent_visitor: boolean;
  created_at: string;
  // Joined data
  flat?: {
    flat_number: string;
    building?: {
      building_name: string;
    };
  };
  resident?: {
    full_name: string;
    phone: string;
  };
  entry_guard?: {
    guard_code: string;
    employee?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface VisitorStats {
  activeVisitors: number;
  todayTotal: number;
  preApproved: number;
  deniedEntry: number;
}

export interface CreateVisitorDTO {
  visitor_name: string;
  visitor_type: string;
  phone?: string;
  vehicle_number?: string;
  photo_url?: string;
  flat_id?: string;
  resident_id?: string;
  purpose?: string;
  entry_guard_id?: string;
  entry_location_id?: string;
  is_frequent_visitor?: boolean;
}

export interface VisitorFilters {
  status?: "active" | "completed" | "all";
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export function useVisitors(initialFilters?: VisitorFilters) {
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [dailyHelpers, setDailyHelpers] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VisitorStats>({
    activeVisitors: 0,
    todayTotal: 0,
    preApproved: 0,
    deniedEntry: 0,
  });
  const [filters, setFilters] = useState<VisitorFilters>(initialFilters || {});

  // Fetch all visitors with filters
  const fetchVisitors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("visitors")
        .select(`
          *,
          flat:flats(
            flat_number,
            building:buildings(building_name)
          ),
          resident:residents(full_name, phone),
          entry_guard:security_guards(
            guard_code,
            employee:employees(first_name, last_name)
          )
        `)
        .order("entry_time", { ascending: false });

      // Apply filters
      if (filters.status === "active") {
        query = query.is("exit_time", null);
      } else if (filters.status === "completed") {
        query = query.not("exit_time", "is", null);
      }

      if (filters.type) {
        query = query.eq("visitor_type", filters.type);
      }

      if (filters.dateFrom) {
        query = query.gte("entry_time", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("entry_time", filters.dateTo);
      }

      if (filters.searchTerm) {
        query = query.or(`visitor_name.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedData = (data || []) as unknown as Visitor[];
      setVisitors(typedData);

      // Separate active visitors (still in building)
      const active = typedData.filter((v) => !v.exit_time);
      setActiveVisitors(active);

      // Separate daily helpers
      const helpers = typedData.filter((v) => v.is_frequent_visitor || v.visitor_type === "daily_helper");
      setDailyHelpers(helpers);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load visitors";
      console.error("Error fetching visitors:", err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load visitor data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Fetch visitor statistics
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Active visitors (no exit time)
      const { count: activeCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .is("exit_time", null);

      // Today's total entries
      const { count: todayCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .gte("entry_time", `${today}T00:00:00`);

      // Pre-approved (frequent visitors scheduled today)
      const { count: preApprovedCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .eq("is_frequent_visitor", true)
        .gte("entry_time", `${today}T00:00:00`);

      // Denied entries (not approved by resident)
      const { count: deniedCount } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .eq("approved_by_resident", false)
        .gte("entry_time", `${today}T00:00:00`);

      setStats({
        activeVisitors: activeCount || 0,
        todayTotal: todayCount || 0,
        preApproved: preApprovedCount || 0,
        deniedEntry: deniedCount || 0,
      });
    } catch (err) {
      console.error("Error fetching visitor stats:", err);
    }
  }, []);

  // Add new visitor (PRD: Guest Entry)
  const addVisitor = async (visitor: CreateVisitorDTO) => {
    try {
      const { data, error: insertError } = await supabase
        .from("visitors")
        .insert({
          visitor_name: visitor.visitor_name,
          visitor_type: visitor.visitor_type,
          phone: visitor.phone,
          vehicle_number: visitor.vehicle_number,
          photo_url: visitor.photo_url,
          flat_id: visitor.flat_id,
          resident_id: visitor.resident_id,
          purpose: visitor.purpose,
          entry_guard_id: visitor.entry_guard_id,
          entry_location_id: visitor.entry_location_id,
          is_frequent_visitor: visitor.is_frequent_visitor || false,
          approved_by_resident: false,
          entry_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Visitor Registered",
        description: `${visitor.visitor_name} has been checked in`,
      });

      // Refresh data
      fetchVisitors();
      fetchStats();

      return { success: true, data };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add visitor";
      console.error("Error adding visitor:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Check out visitor (PRD: Exit logging)
  const checkOutVisitor = async (visitorId: string, exitGuardId?: string) => {
    try {
      const { error: updateError } = await supabase
        .from("visitors")
        .update({
          exit_time: new Date().toISOString(),
          exit_guard_id: exitGuardId,
        })
        .eq("id", visitorId);

      if (updateError) throw updateError;

      toast({
        title: "Visitor Checked Out",
        description: "Exit has been recorded",
      });

      // Refresh data
      fetchVisitors();
      fetchStats();

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check out visitor";
      console.error("Error checking out visitor:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Approve visitor entry (PRD: Notification System approval)
  const approveVisitor = async (visitorId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("visitors")
        .update({ approved_by_resident: true })
        .eq("id", visitorId);

      if (updateError) throw updateError;

      toast({
        title: "Entry Approved",
        description: "Visitor entry has been approved",
      });

      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve visitor";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Mark as daily helper (PRD: Daily Visitor Database)
  const markAsFrequent = async (visitorId: string, isFrequent: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from("visitors")
        .update({ is_frequent_visitor: isFrequent })
        .eq("id", visitorId);

      if (updateError) throw updateError;

      toast({
        title: isFrequent ? "Added to Daily Helpers" : "Removed from Daily Helpers",
        description: isFrequent 
          ? "Visitor will be faster to check in next time" 
          : "Visitor removed from frequent list",
      });

      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update visitor";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Search flats/residents (PRD: Society Family Database)
  const searchFlats = async (searchTerm: string) => {
    try {
      const { data, error: searchError } = await supabase
        .from("flats")
        .select(`
          id,
          flat_number,
          building:buildings(building_name),
          residents(id, full_name, phone, is_primary_contact)
        `)
        .or(`flat_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (searchError) throw searchError;

      return { success: true, data };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      return { success: false, error: errorMessage, data: [] };
    }
  };

  // Real-time subscription for new visitors
  useEffect(() => {
    const channel = supabase
      .channel("visitors-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
        },
        () => {
          // Refresh data when changes occur
          fetchVisitors();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVisitors, fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchVisitors();
    fetchStats();
  }, [fetchVisitors, fetchStats]);

  return {
    // Data
    visitors,
    activeVisitors,
    dailyHelpers,
    stats,
    isLoading,
    error,
    
    // Actions
    addVisitor,
    checkOutVisitor,
    approveVisitor,
    markAsFrequent,
    searchFlats,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: fetchVisitors,
  };
}

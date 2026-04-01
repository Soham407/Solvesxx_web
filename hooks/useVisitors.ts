"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { sanitizeLikeInput } from "@/lib/sanitize";

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
  visitor_type:
    | "guest"
    | "vendor"
    | "contractor"
    | "service_staff"
    | "daily_helper";
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
  approved_by_resident: boolean | null;
  rejection_reason: string | null;
  bypass_reason: string | null;
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
  bypass_reason?: string;
  approval_required?: boolean;
}

export interface VisitorFilters {
  status?: "active" | "completed" | "all";
  type?: string;
  flatId?: string;
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

  // Sync filters with initialFilters if they change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [JSON.stringify(initialFilters)]);

  const fetchVisitors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("visitors")
        .select(
          `
          *,
          flat:flats(
            flat_number,
            building:buildings(building_name)
          ),
          resident:residents(full_name, phone),
          entry_guard:security_guards!visitors_entry_guard_id_fkey(
            guard_code,
            employee:employees(first_name, last_name)
          )
        `,
        )
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

      if (filters.flatId) {
        query = query.eq("flat_id", filters.flatId);
      }

      if (filters.dateFrom) {
        query = query.gte("entry_time", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("entry_time", filters.dateTo);
      }

      if (filters.searchTerm) {
        query = query.or(
          `visitor_name.ilike.%${sanitizeLikeInput(filters.searchTerm)}%,phone.ilike.%${sanitizeLikeInput(filters.searchTerm)}%`,
        );
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedData = (data || []) as unknown as Visitor[];
      setVisitors(typedData);

      // Separate active visitors (still in building)
      const active = typedData.filter((v) => !v.exit_time);
      setActiveVisitors(active);

      // Separate daily helpers
      const helpers = typedData.filter(
        (v) => v.is_frequent_visitor || v.visitor_type === "daily_helper",
      );
      setDailyHelpers(helpers);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load visitors";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Try to get guard_id if the user is a guard
      let guardId = visitor.entry_guard_id;
      if (!guardId && user) {
        const { data: guardData } = await supabase
          .from("security_guards")
          .select("id")
          .eq(
            "employee_id",
            (
              await supabase
                .from("employees")
                .select("id")
                .eq("auth_user_id", user.id)
                .single()
            ).data?.id,
          )
          .single();
        guardId = guardData?.id;
      }

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
          entry_guard_id: guardId,
          entry_location_id: visitor.entry_location_id,
          is_frequent_visitor: visitor.is_frequent_visitor || false,
          approved_by_resident:
            visitor.is_frequent_visitor && !visitor.approval_required
              ? true
              : null,
          bypass_reason: visitor.bypass_reason || null,
          entry_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Visitor Registered",
        description: data.approved_by_resident
          ? `${visitor.visitor_name} has been checked in (Pre-approved).`
          : `${visitor.visitor_name} has been checked in. Waiting for resident approval.`,
      });

      // Refresh data
      fetchVisitors();
      fetchStats();

      // Automated Trigger: Send Notification to Resident
      if (visitor.resident_id) {
        // Find the auth_user_id for this resident to target their push tokens
        const { data: residentData } = await supabase
          .from("residents")
          .select("auth_user_id, full_name, flats(flat_number)")
          .eq("id", visitor.resident_id)
          .single();

        if (residentData?.auth_user_id) {
          supabase.functions
            .invoke("send-notification", {
              body: {
                user_id: residentData.auth_user_id,
                title: "Visitor at the Gate",
                body: `${visitor.visitor_name} is requesting entry to ${residentData.flats?.[0]?.flat_number || "your unit"}.`,
                data: { visitor_id: data.id, type: "VISITOR_RECEPTION" },
              },
            })
            .catch((err) => console.error("Notification trigger failed:", err));
        }
      }

      return { success: true, data };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add visitor";
      console.error("Error adding visitor:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Upload visitor photo
  const uploadVisitorPhoto = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `entries/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("visitor-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return { success: true, url: filePath };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      return { success: false, error: errorMessage };
    }
  };

  // Check out visitor (PRD: Exit logging)
  const checkOutVisitor = async (visitorId: string, exitGuardId?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: result, error: rpcError } = await supabase.rpc(
        "checkout_visitor" as any,
        {
          p_visitor_id: visitorId,
          p_user_id: user.id,
        },
      );
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success)
        throw new Error(rpcResult?.error || "Visitor checkout failed");

      toast({
        title: "Visitor Checked Out",
        description: "Exit has been recorded",
      });

      // Refresh data
      fetchVisitors();
      fetchStats();

      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check out visitor";
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: result, error: rpcError } = await supabase.rpc(
        "approve_visitor" as any,
        {
          p_visitor_id: visitorId,
          p_user_id: user.id,
        },
      );
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success)
        throw new Error(rpcResult?.error || "Visitor approval failed");

      toast({
        title: "Entry Approved",
        description: "Visitor entry has been approved",
      });

      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to approve visitor";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Deny visitor entry (PRD: Notification System rejection)
  const denyVisitor = async (visitorId: string, reason: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: result, error: rpcError } = await supabase.rpc(
        "deny_visitor" as any,
        {
          p_visitor_id: visitorId,
          p_user_id: user.id,
          p_reason: reason,
        },
      );
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success)
        throw new Error(rpcResult?.error || "Visitor denial failed");

      toast({
        title: "Entry Denied",
        description: "Visitor entry has been denied",
        variant: "destructive",
      });

      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deny visitor";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Issue pass to visitor (PRD: Guard resolution)
  const issueVisitorPass = async (visitorId: string) => {
    try {
      const response = await fetch(`/api/society/visitors/${visitorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "issue_pass" }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to issue pass");
      }

      const passNumber = payload.passNumber as string;

      toast({
        title: "Pass Issued",
        description: `Pass ${passNumber} has been generated for the visitor.`,
      });

      fetchVisitors();
      return { success: true, passNumber };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to issue pass";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  // Check if visitor is pre-approved for flat (PRD: Phase 1B Fast Entry)
  const checkFrequentVisitor = async (phone: string, flatId: string) => {
    try {
      const { data, error } = await supabase
        .from("visitors")
        .select(
          "id, visitor_name, visitor_type, photo_url, is_frequent_visitor, approved_by_resident",
        )
        .eq("phone", phone)
        .eq("flat_id", flatId)
        .eq("is_frequent_visitor", true)
        .eq("approved_by_resident", true) // Must have been approved once to be frequent
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return { success: true, data: data || null };
    } catch (err: unknown) {
      console.error("Error checking frequent visitor:", err);
      return { success: false, error: "Lookup failed" };
    }
  };

  // Mark as daily helper (PRD: Daily Visitor Database)
  const markAsFrequent = async (visitorId: string, isFrequent: boolean) => {
    try {
      const response = await fetch(`/api/society/visitors/${visitorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "set_frequent", isFrequent }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update visitor");
      }

      toast({
        title: isFrequent
          ? "Added to Daily Helpers"
          : "Removed from Daily Helpers",
        description: isFrequent
          ? "Visitor will be faster to check in next time"
          : "Visitor removed from frequent list",
      });

      fetchVisitors();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update visitor";
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
        .select(
          `
          id,
          flat_number,
          building:buildings(building_name),
          residents(id, full_name, phone, is_primary_contact)
        `,
        )
        .or(`flat_number.ilike.%${sanitizeLikeInput(searchTerm)}%`)
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
        },
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
    denyVisitor,
    checkFrequentVisitor,
    issueVisitorPass,
    uploadVisitorPhoto,
    markAsFrequent,
    searchFlats,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh: fetchVisitors,
  };
}

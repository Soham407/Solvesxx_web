// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export type AdBookingStatus = "pending" | "approved" | "active" | "completed" | "cancelled";

export interface AdBooking {
  id: string;
  booking_number: string;
  ad_space_id: string;
  advertiser_name: string;
  start_date: string;
  end_date: string;
  agreed_rate_paise: number;
  creative_url: string | null;
  status: AdBookingStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const AD_BOOKING_STATUS_CONFIG: Record<AdBookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-info/10 text-info border-info/20" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  completed: { label: "Completed", className: "bg-muted/50 text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

export function useAdBookings(adSpaceId?: string) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<AdBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("printing_ad_bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (adSpaceId) {
        query = query.eq("ad_space_id", adSpaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error("Ad bookings fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [adSpaceId]);

  const createBooking = async (input: {
    ad_space_id: string;
    advertiser_name: string;
    start_date: string;
    end_date: string;
    agreed_rate_paise: number;
    creative_url?: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("printing_ad_bookings").insert({
        ad_space_id: input.ad_space_id,
        advertiser_name: input.advertiser_name,
        start_date: input.start_date,
        end_date: input.end_date,
        agreed_rate_paise: input.agreed_rate_paise,
        creative_url: input.creative_url || null,
        notes: input.notes || null,
        status: "pending",
        created_by: user?.id,
        booking_number: "",
      });
      if (error) throw error;
      toast({ title: "Booking Created", description: "Ad space booking submitted for approval." });
      fetchBookings();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create booking";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const approveBooking = async (bookingId: string, approverId: string) => {
    try {
      const { error } = await supabase
        .from("printing_ad_bookings")
        .update({
          status: "approved",
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (error) throw error;
      toast({ title: "Booking Approved", description: "Ad space booking confirmed." });
      fetchBookings();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve booking";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("printing_ad_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);
      if (error) throw error;
      toast({ title: "Booking Cancelled", description: "Ad space booking cancelled.", variant: "destructive" });
      fetchBookings();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to cancel booking";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false };
    }
  };

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  return { bookings, isLoading, createBooking, approveBooking, cancelBooking, refresh: fetchBookings };
}

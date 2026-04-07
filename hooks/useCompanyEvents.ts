"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface CompanyEvent {
  id: string;
  event_code: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  attendees: string | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  description: string | null;
  location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEventDTO {
  event_code: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  attendees?: string;
  description?: string;
  location_id?: string;
}

interface UseCompanyEventsState {
  events: CompanyEvent[];
  isLoading: boolean;
  error: string | null;
}

export function useCompanyEvents() {
  const { toast } = useToast();

  const [state, setState] = useState<UseCompanyEventsState>({
    events: [],
    isLoading: true,
    error: null,
  });

  const fetchEvents = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("company_events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });

      if (error) throw error;

      setState({
        events: (data as any[] || []) as CompanyEvent[],
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch events",
      }));
    }
  }, []);

  const addEvent = async (event: CreateEventDTO) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("company_events")
        .insert({
          ...event,
          event_name: event.title, // Keep event_name in sync with title due to schema
          status: "Scheduled",
          is_active: true,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        events: [...prev.events, data as any as CompanyEvent].sort(
          (a, b) =>
            new Date(a.event_date).getTime() -
            new Date(b.event_date).getTime(),
        ),
      }));

      toast({
        title: "Event Scheduled",
        description: `${event.title} has been added to the calendar.`,
      });

      return data;
    } catch (err: any) {
      console.error("Error adding event:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to schedule event",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CompanyEvent>) => {
    try {
      const updatePayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (typeof updates.title === "string") {
        updatePayload.event_name = updates.title;
      }

      const { data, error } = await supabase
        .from("company_events")
        .update(updatePayload as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === id ? (data as any as CompanyEvent) : e)),
      }));

      toast({
        title: "Event Updated",
        description: "Event details have been updated.",
      });

      return data;
    } catch (err: any) {
      console.error("Error updating event:", err);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("company_events")
        .update({ is_active: false } as any)
        .eq("id", id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== id),
      }));

      toast({
        title: "Event Removed",
        description: "Event has been removed from the calendar.",
      });
    } catch (err: any) {
      console.error("Error deleting event:", err);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    ...state,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string | null;
  payroll_impact: string | null;
  description: string | null;
  is_active: boolean | null;
  year: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CreateHolidayDTO {
  holiday_name: string;
  holiday_date: string;
  holiday_type?: string;
  payroll_impact?: string;
  description?: string;
  year: number;
}

interface UseHolidaysState {
  holidays: Holiday[];
  isLoading: boolean;
  error: string | null;
}

export function useHolidays(year?: number) {
  const { toast } = useToast();
  const currentYear = year || new Date().getFullYear();

  const [state, setState] = useState<UseHolidaysState>({
    holidays: [],
    isLoading: true,
    error: null,
  });

  const fetchHolidays = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from("holidays")
        .select("*")
        .eq("is_active", true)
        .order("holiday_date", { ascending: true });

      if (currentYear) {
        query = query.eq("year", currentYear);
      }

      const { data, error } = await query;

      if (error) throw error;

      setState({
        holidays: (data || []) as Holiday[],
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching holidays:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch holidays",
      }));
    }
  }, [currentYear]);

  const addHoliday = async (holiday: CreateHolidayDTO) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("holidays")
        .insert({
          ...holiday,
          holiday_type: holiday.holiday_type || "national",
          payroll_impact: holiday.payroll_impact || "standard_off",
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        holidays: [...prev.holidays, data as Holiday].sort(
          (a, b) =>
            new Date(a.holiday_date).getTime() -
            new Date(b.holiday_date).getTime(),
        ),
      }));

      toast({
        title: "Holiday Added",
        description: `${holiday.holiday_name} has been added to the calendar.`,
      });

      return data;
    } catch (err: any) {
      console.error("Error adding holiday:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add holiday",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    try {
      const { data, error } = await supabase
        .from("holidays")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        holidays: prev.holidays.map((h) => (h.id === id ? (data as Holiday) : h)),
      }));

      toast({
        title: "Holiday Updated",
        description: "Holiday details have been updated.",
      });

      return data;
    } catch (err: any) {
      console.error("Error updating holiday:", err);
      toast({
        title: "Error",
        description: "Failed to update holiday",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      // Soft delete
      const { error } = await supabase
        .from("holidays")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        holidays: prev.holidays.filter((h) => h.id !== id),
      }));

      toast({
        title: "Holiday Removed",
        description: "Holiday has been removed from the calendar.",
      });
    } catch (err: any) {
      console.error("Error deleting holiday:", err);
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Get upcoming holidays (next 30 days)
  const getUpcomingHolidays = useCallback(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    return state.holidays.filter((h) => {
      const holidayDate = new Date(h.holiday_date);
      return holidayDate >= today && holidayDate <= thirtyDaysLater;
    });
  }, [state.holidays]);

  // Check if a specific date is a holiday
  const isHoliday = useCallback(
    (date: Date | string) => {
      const dateStr =
        typeof date === "string" ? date : date.toISOString().split("T")[0];
      return state.holidays.some((h) => h.holiday_date === dateStr);
    },
    [state.holidays],
  );

  // Get holiday by date
  const getHolidayByDate = useCallback(
    (date: Date | string) => {
      const dateStr =
        typeof date === "string" ? date : date.toISOString().split("T")[0];
      return state.holidays.find((h) => h.holiday_date === dateStr);
    },
    [state.holidays],
  );

  // Initial fetch
  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  return {
    ...state,
    fetchHolidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    getUpcomingHolidays,
    isHoliday,
    getHolidayByDate,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export interface ChecklistQuestion {
  id: string;
  question: string;
  type: "yes_no" | "value";
  required: boolean;
}

export interface Checklist {
  id: string;
  checklist_code: string;
  checklist_name: string;
  department: string;
  description: string | null;
  questions: ChecklistQuestion[];
  frequency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface UseChecklistsState {
  checklists: Checklist[];
  isLoading: boolean;
  error: string | null;
}

export function useChecklists() {
  const [state, setState] = useState<UseChecklistsState>({
    checklists: [],
    isLoading: true,
    error: null,
  });

  const fetchChecklists = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("daily_checklists")
        .select("*")
        .order("checklist_name");

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        questions: typeof item.questions === "string" ? JSON.parse(item.questions) : item.questions || [],
      }));

      setState({
        checklists: formattedData,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Error fetching checklists:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch checklists",
      }));
    }
  }, []);

  const createChecklist = useCallback(async (data: Partial<Checklist>) => {
    try {
      const { data: newChecklist, error } = await supabase
        .from("daily_checklists")
        .insert([{
          ...data,
          questions: (data.questions || []) as any,
          updated_at: new Date().toISOString(),
        } as any])
        .select()
        .single();

      if (error) throw error;

      await fetchChecklists();
      return { success: true, data: newChecklist };
    } catch (err: any) {
      console.error("Error creating checklist:", err);
      return { success: false, error: err.message };
    }
  }, [fetchChecklists]);

  const updateChecklist = useCallback(async (id: string, data: Partial<Checklist>) => {
    try {
      const { error } = await supabase
        .from("daily_checklists")
        .update({
          ...data,
          questions: data.questions ? (data.questions as any) : undefined,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) throw error;

      await fetchChecklists();
      return { success: true };
    } catch (err: any) {
      console.error("Error updating checklist:", err);
      return { success: false, error: err.message };
    }
  }, [fetchChecklists]);

  const deleteChecklist = useCallback(async (id: string) => {
    try {
      // Soft delete
      const { error } = await supabase
        .from("daily_checklists")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      await fetchChecklists();
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting checklist:", err);
      return { success: false, error: err.message };
    }
  }, [fetchChecklists]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  return {
    ...state,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    refresh: fetchChecklists,
  };
}

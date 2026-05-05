"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { Json } from "@/src/types/supabase";

type ChecklistRow = {
  id: string;
  checklist_code: string;
  checklist_name: string;
  department: string;
  description: string | null;
  questions: unknown;
  frequency: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
};

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

type ChecklistUpsertInput = {
  checklist_code: string;
  checklist_name: string;
  department: string;
  description?: string | null;
  frequency?: string;
  is_active?: boolean;
  questions: ChecklistQuestion[];
};

interface UseChecklistsState {
  checklists: Checklist[];
  isLoading: boolean;
  error: string | null;
}

function toChecklistQuestionsJson(questions: ChecklistQuestion[]): Json {
  return JSON.parse(JSON.stringify(questions)) as Json;
}

export function useChecklists() {
  const [state, setState] = useState<UseChecklistsState>({
    checklists: [],
    isLoading: true,
    error: null,
  });

  function normalizeChecklistRows(rows: unknown): ChecklistRow[] {
    return Array.isArray(rows) ? (rows as ChecklistRow[]) : [];
  }

  function normalizeQuestions(value: unknown): ChecklistQuestion[] {
    if (typeof value === "string") {
      return JSON.parse(value) as ChecklistQuestion[];
    }
    return Array.isArray(value) ? (value as ChecklistQuestion[]) : [];
  }

  const fetchChecklists = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("daily_checklists")
        .select("*")
        .order("checklist_name");

      if (error) throw error;

      const formattedData: Checklist[] = normalizeChecklistRows(data).map((item) => ({
        id: item.id,
        checklist_code: item.checklist_code,
        checklist_name: item.checklist_name,
        department: item.department,
        description: item.description,
        questions: normalizeQuestions(item.questions),
        frequency: item.frequency || "daily",
        is_active: item.is_active ?? true,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        created_by: item.created_by,
      }));

      setState({
        checklists: formattedData,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error("Error fetching checklists:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch checklists",
      }));
    }
  }, []);

  const createChecklist = useCallback(async (data: ChecklistUpsertInput) => {
    try {
      const { data: newChecklist, error } = await supabase
        .from("daily_checklists")
        .insert({
          ...data,
          questions: toChecklistQuestionsJson(Array.isArray(data.questions) ? data.questions : []),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await fetchChecklists();
      return { success: true, data: newChecklist };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create checklist";
      console.error("Error creating checklist:", err);
      return { success: false, error: message };
    }
  }, [fetchChecklists]);

  const updateChecklist = useCallback(async (id: string, data: Partial<ChecklistUpsertInput>) => {
    try {
      const { error } = await supabase
        .from("daily_checklists")
        .update({
          ...data,
          questions: data.questions
            ? toChecklistQuestionsJson(Array.isArray(data.questions) ? data.questions : [])
            : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchChecklists();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update checklist";
      console.error("Error updating checklist:", err);
      return { success: false, error: message };
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete checklist";
      console.error("Error deleting checklist:", err);
      return { success: false, error: message };
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface ChecklistItem {
  id: string;
  task: string;
  status: "pending" | "done";
  completedAt?: string;
  photos?: { photo_path: string; timestamp: string }[];
}

interface ChecklistData {
  items: ChecklistItem[];
  totalItems: number;
  completedItems: number;
  checklistId: string | null;
  checklistName: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ShiftInfo {
  shiftName: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
}

/**
 * Hook to fetch guard's assigned checklist and responses for today
 */
export function useGuardChecklist(employeeId: string | null) {
  const [data, setData] = useState<ChecklistData>({
    items: [],
    totalItems: 0,
    completedItems: 0,
    checklistId: null,
    checklistName: null,
    isLoading: true,
    error: null,
  });

  const fetchChecklist = useCallback(async () => {
    if (!employeeId) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Get today's date for filtering responses
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Fetch the security department checklist
      const { data: checklist, error: checklistError } = await supabase
        .from("daily_checklists")
        .select("id, checklist_name, questions")
        .eq("department", "security")
        .eq("is_active", true)
        .single();

      if (checklistError) {
        if (checklistError.code === "PGRST116") {
          // No checklist defined yet
          setData({
            items: [],
            totalItems: 0,
            completedItems: 0,
            checklistId: null,
            checklistName: null,
            isLoading: false,
            error: null,
          });
          return;
        }
        throw checklistError;
      }

      // Parse questions from JSONB
      const questions = checklist.questions as { id: string; question: string }[] || [];
      
      // Fetch today's response for this employee
      const { data: response, error: responseError } = await supabase
        .from("checklist_responses")
        .select("responses")
        .eq("checklist_id", checklist.id)
        .eq("employee_id", employeeId)
        .eq("response_date", todayStr)
        .single();

      // Parse responses (might not exist yet)
      const responses = (response?.responses as Record<string, { completed: boolean; completedAt?: string; photos?: { photo_path: string; timestamp: string }[] }>) || {};

      // Build items list
      const items: ChecklistItem[] = questions.map(q => {
        const responseData = responses[q.id];
        return {
          id: q.id,
          task: q.question,
          status: responseData?.completed ? "done" : "pending",
          completedAt: responseData?.completedAt,
          photos: responseData?.photos || [],
        };
      });

      const completedItems = items.filter(i => i.status === "done").length;

      setData({
        items,
        totalItems: items.length,
        completedItems,
        checklistId: checklist.id,
        checklistName: checklist.checklist_name,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching checklist:", err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load checklist",
      }));
    }
  }, [employeeId]);

  // Mark a checklist item as complete
  const completeItem = useCallback(async (itemId: string) => {
    if (!employeeId || !data.checklistId) return { success: false, error: "Not ready" };

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Get existing response or create new
      const { data: existing } = await supabase
        .from("checklist_responses")
        .select("id, responses")
        .eq("checklist_id", data.checklistId)
        .eq("employee_id", employeeId)
        .eq("response_date", todayStr)
        .single();

      const existingResponses = (existing?.responses as Record<string, any>) || {};
      const taskData = existingResponses[itemId] || { completed: false };
      const updatedResponses = {
        ...existingResponses,
        [itemId]: { ...taskData, completed: true, completedAt: now },
      };

      if (existing) {
        // Update existing response
        const { error } = await supabase
          .from("checklist_responses")
          .update({ responses: updatedResponses })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new response
        const { error } = await supabase
          .from("checklist_responses")
          .insert({
            checklist_id: data.checklistId,
            employee_id: employeeId,
            response_date: todayStr,
            responses: updatedResponses,
            is_complete: false,
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchChecklist();
      return { success: true };
    } catch (err) {
      console.error("Error completing checklist item:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to save" };
    }
  }, [employeeId, data.checklistId, fetchChecklist]);

  // Add an evidence photo to a checklist item
  const addEvidencePhoto = useCallback(async (itemId: string, photoPath: string) => {
    if (!employeeId || !data.checklistId) return { success: false, error: "Not ready" };

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Get existing response
      const { data: existing } = await supabase
        .from("checklist_responses")
        .select("id, responses")
        .eq("checklist_id", data.checklistId)
        .eq("employee_id", employeeId)
        .eq("response_date", todayStr)
        .single();

      const existingResponses = (existing?.responses as Record<string, any>) || {};
      const taskData = existingResponses[itemId] || { completed: false };
      
      const newPhoto = { photo_path: photoPath, timestamp: now };
      const updatedPhotos = [...(taskData.photos || []), newPhoto];
      
      const updatedResponses = {
        ...existingResponses,
        [itemId]: { ...taskData, photos: updatedPhotos },
      };

      if (existing) {
        const { error } = await supabase
          .from("checklist_responses")
          .update({ responses: updatedResponses })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("checklist_responses")
          .insert({
            checklist_id: data.checklistId,
            employee_id: employeeId,
            response_date: todayStr,
            responses: updatedResponses,
            is_complete: false,
          });
        if (error) throw error;
      }

      await fetchChecklist();
      return { success: true };
    } catch (err) {
      console.error("Error adding evidence:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to save photo record" };
    }
  }, [employeeId, data.checklistId, fetchChecklist]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  return {
    ...data,
    completeItem,
    addEvidencePhoto,
    refresh: fetchChecklist,
  };
}

/**
 * Hook to fetch guard's assigned shift information
 */
export function useGuardShift(employeeId: string | null): ShiftInfo & { isLoading: boolean } {
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo & { isLoading: boolean }>({
    shiftName: "Day Shift",
    startTime: "08:00",
    endTime: "20:00",
    isNightShift: false,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchShift() {
      if (!employeeId) {
        setShiftInfo(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch current shift assignment for this employee
        const { data: assignment, error: assignmentError } = await supabase
          .from("employee_shift_assignments")
          .select(`
            shift:shifts (
              shift_name,
              start_time,
              end_time,
              is_night_shift
            )
          `)
          .eq("employee_id", employeeId)
          .eq("is_active", true)
          .lte("assigned_from", today)
          .or(`assigned_to.is.null,assigned_to.gte.${today}`)
          .single();

        if (assignmentError?.code === "PGRST116" || !assignment?.shift) {
          // No shift assigned, use default
          setShiftInfo({
            shiftName: "Day Shift",
            startTime: "08:00",
            endTime: "20:00",
            isNightShift: false,
            isLoading: false,
          });
          return;
        }

        const shiftsArray = Array.isArray(assignment.shift) ? assignment.shift : [assignment.shift];
        const shift = shiftsArray[0] as any;
        
        if (!shift) {
          // Fallback if somehow shift is missing
          setShiftInfo(prev => ({ ...prev, isLoading: false }));
          return;
        }

        setShiftInfo({
          shiftName: shift.shift_name || "Shift",
          startTime: shift.start_time?.substring(0, 5) || "08:00",
          endTime: shift.end_time?.substring(0, 5) || "20:00",
          isNightShift: shift.is_night_shift || false,
          isLoading: false,
        });
      } catch (err) {
        console.error("Error fetching shift:", err);
        // Use default on error
        setShiftInfo({
          shiftName: "Day Shift",
          startTime: "08:00",
          endTime: "20:00",
          isNightShift: false,
          isLoading: false,
        });
      }
    }

    fetchShift();
  }, [employeeId]);

  return shiftInfo;
}

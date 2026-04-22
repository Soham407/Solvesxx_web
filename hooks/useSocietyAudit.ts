// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface VisitorAudit {
  total: number;
  pending: number;
  frequent: number;
  oneTime: number;
  denied: number;
  entries: any[];
}

interface AttendanceAudit {
  onDuty: number;
  absent: number;
  autoPunchOuts: number;
  inactivityAlerts: number;
}

interface ChecklistAudit {
  completed: number;
  pending: number;
  overdue: number;
  items: any[];
}

async function getManagedSocieties(): Promise<string[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return [];

    const { data: societies, error: societiesError } = await supabase
      .from("societies")
      .select("id")
      .eq("society_manager_id", user.id);

    if (societiesError || !societies) return [];
    return societies.map((s: any) => s.id);
  } catch (err) {
    console.error("Error getting managed societies:", err);
    return [];
  }
}

export function useSocietyAudit(societyId?: string) {
  const [visitorAudit, setVisitorAudit] = useState<VisitorAudit>({
    total: 0,
    pending: 0,
    frequent: 0,
    oneTime: 0,
    denied: 0,
    entries: [],
  });

  const [attendanceAudit, setAttendanceAudit] = useState<AttendanceAudit>({
    onDuty: 0,
    absent: 0,
    autoPunchOuts: 0,
    inactivityAlerts: 0,
  });

  const [checklistAudit, setChecklistAudit] = useState<ChecklistAudit>({
    completed: 0,
    pending: 0,
    overdue: 0,
    items: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchAudit = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get managed society IDs if not provided explicitly
      let societyIds = societyId ? [societyId] : await getManagedSocieties();
      if (societyIds.length === 0) {
        societyIds = [];
      }

      // 1. Visitor Audit - filter by society if applicable
      let visitorQuery = supabase
        .from("visitors")
        .select("name, phone_number, visitor_type, approved_by_resident, entry_time, exit_time, is_frequent_visitor")
        .gte("entry_time", `${today}T00:00:00Z`)
        .order("entry_time", { ascending: false });

      // Note: Visitor filtering by society would need resident -> flat -> building -> society join
      const { data: visitors } = await visitorQuery;

      if (visitors) {
        setVisitorAudit({
          total: visitors.length,
          pending: visitors.filter(v => v.approved_by_resident === null && !v.exit_time).length,
          frequent: visitors.filter(v => v.is_frequent_visitor).length,
          oneTime: visitors.filter(v => !v.is_frequent_visitor).length,
          denied: visitors.filter(v => v.approved_by_resident === false).length,
          entries: visitors,
        });
      }

      // 2. Attendance Audit
      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select("is_auto_punch_out, check_out_time")
        .eq("log_date", today);

      const { data: alerts } = await supabase
        .from("panic_alerts")
        .select("id")
        .eq("alert_type", "inactivity")
        .gte("alert_time", `${today}T00:00:00Z`);

      // Only count guards in managed societies
      let guardQuery = supabase
        .from("security_guards")
        .select("id", { count: "exact", head: true });

      if (societyIds.length > 0) {
        guardQuery = guardQuery.in("society_id", societyIds);
      }

      const { count: totalGuards } = await guardQuery;

      if (attendance) {
        const onDuty = attendance.filter(a => !a.check_out_time).length;
        setAttendanceAudit({
          onDuty,
          absent: (totalGuards || 0) - onDuty,
          autoPunchOuts: attendance.filter(a => a.is_auto_punch_out).length,
          inactivityAlerts: alerts?.length || 0,
        });
      }

      // 3. Checklist Audit (Detailed View)
      const { data: responses } = await supabase
        .from("checklist_responses")
        .select(`
          id,
          response_date,
          is_complete,
          completed_at,
          latitude,
          longitude,
          responses,
          guard:security_guards(
             employee:employees(first_name, last_name)
          )
        `)
        .eq("response_date", today);

      if (responses) {
        setChecklistAudit({
          completed: responses.filter(r => r.is_complete).length,
          pending: responses.filter(r => !r.is_complete).length,
          overdue: 0,
          items: responses,
        });
      }

    } catch (err) {
      console.error("Audit fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return {
    visitorAudit,
    attendanceAudit,
    checklistAudit,
    isLoading,
    refresh: fetchAudit,
  };
}

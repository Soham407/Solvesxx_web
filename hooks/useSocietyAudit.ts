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

export function useSocietyAudit() {
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

      // 1. Visitor Audit
      const { data: visitors } = await supabase
        .from("visitors")
        .select("name, phone_number, visitor_type, approved_by_resident, entry_time, exit_time, is_frequent_visitor")
        .gte("entry_time", `${today}T00:00:00Z`)
        .order("entry_time", { ascending: false });

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

      const { count: totalGuards } = await supabase
        .from("security_guards")
        .select("id", { count: "exact", head: true });

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
          overdue: 0, // Logic for overdue would depend on shift end times
          items: responses,
        });
      }

    } catch (err) {
      console.error("Audit fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

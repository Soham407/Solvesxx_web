"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface VisitorRow {
  name?: string | null;
  visitor_name: string | null;
  phone: string | null;
  phone_number?: string | null;
  visitor_type: string | null;
  approved_by_resident: boolean | null;
  entry_time: string | null;
  exit_time: string | null;
  is_frequent_visitor: boolean | null;
}

interface ChecklistResponseRow {
  id: string;
  response_date: string;
  is_complete: boolean | null;
  submitted_at: string | null;
  created_at: string | null;
  completed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  responses: unknown;
  evidence_photos: Array<{
    photo_url: string | null;
  }> | null;
  guard: {
    employee: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

interface VisitorAudit {
  total: number;
  pending: number;
  frequent: number;
  oneTime: number;
  denied: number;
  entries: VisitorRow[];
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
  items: ChecklistResponseRow[];
}

function normalizeVisitorRows(rows: unknown): VisitorRow[] {
  return Array.isArray(rows) ? (rows as VisitorRow[]) : [];
}

function normalizeChecklistRows(rows: unknown): ChecklistResponseRow[] {
  return Array.isArray(rows) ? (rows as ChecklistResponseRow[]) : [];
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

      // 1. Visitor Audit
      const visitorQuery = supabase
        .from("visitors")
        .select("visitor_name, phone, visitor_type, approved_by_resident, entry_time, exit_time, is_frequent_visitor")
        .gte("entry_time", `${today}T00:00:00Z`)
        .order("entry_time", { ascending: false });

      // Note: Visitor filtering by society would need resident -> flat -> building -> society join
      const { data: visitors } = await visitorQuery;
      const typedVisitors = normalizeVisitorRows(visitors);

      if (typedVisitors.length > 0) {
        setVisitorAudit({
          total: typedVisitors.length,
          pending: typedVisitors.filter(v => v.approved_by_resident === null && !v.exit_time).length,
          frequent: typedVisitors.filter(v => v.is_frequent_visitor).length,
          oneTime: typedVisitors.filter(v => !v.is_frequent_visitor).length,
          denied: typedVisitors.filter(v => v.approved_by_resident === false).length,
          entries: typedVisitors.map((visitor) => ({
            ...visitor,
            name: visitor.visitor_name,
            phone_number: visitor.phone,
          })),
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

      let guardQuery = supabase
        .from("security_guards")
        .select("id", { count: "exact", head: true });

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
          submitted_at,
          latitude,
          longitude,
          responses,
          guard:security_guards(
             employee:employees(first_name, last_name)
          )
        `)
        .eq("response_date", today);

      const typedResponses = normalizeChecklistRows(responses).map((row) => ({
        ...row,
        guard: Array.isArray(row.guard) ? row.guard[0] ?? null : row.guard,
      }));

      if (typedResponses.length > 0) {
        setChecklistAudit({
          completed: typedResponses.filter(r => r.is_complete).length,
          pending: typedResponses.filter(r => !r.is_complete).length,
          overdue: 0,
          items: typedResponses,
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

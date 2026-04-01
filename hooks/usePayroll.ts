"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { formatCurrency as centralizedFormatCurrency, toPaise } from "@/src/lib/utils/currency";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type PayrollCycleStatus =
  | "draft"
  | "processing"
  | "computed"
  | "approved"
  | "disbursed"
  | "cancelled";

export type PayslipStatus =
  | "draft"
  | "computed"
  | "approved"
  | "processed"
  | "disputed";

export interface PayrollCycle {
  id: string;
  cycle_code: string;
  period_month: number;
  period_year: number;
  period_start: string;
  period_end: string;
  total_working_days: number;
  status: PayrollCycleStatus;
  computed_at: string | null;
  computed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  disbursed_at: string | null;
  disbursed_by: string | null;
  total_employees: number | null;
  total_gross: number | null;
  total_deductions: number | null;
  total_net: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Payslip {
  id: string;
  payslip_number: string;
  payroll_cycle_id: string;
  employee_id: string;
  
  // Attendance
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  
  // Earnings
  basic_salary: number;
  pro_rated_basic: number;
  hra: number;
  special_allowance: number;
  travel_allowance: number;
  medical_allowance: number;
  overtime_amount: number;
  bonus: number;
  other_earnings: number;
  gross_salary: number;
  
  // Deductions
  pf_deduction: number;
  esic_deduction: number;
  professional_tax: number;
  tds: number;
  loan_recovery: number;
  advance_recovery: number;
  other_deductions: number;
  total_deductions: number;
  
  // Net
  net_payable: number;
  
  // Employer Contributions
  employer_pf: number;
  employer_esic: number;
  
  // Payment
  bank_account_number: string | null;
  bank_ifsc: string | null;
  payment_mode: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  
  // Status
  status: PayslipStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  employee_name?: string;
  employee_code?: string;
  department?: string;
  cycle_code?: string;
}

export interface CreatePayrollCycleInput {
  period_month: number;
  period_year: number;
  period_start: string;
  period_end: string;
  total_working_days: number;
  notes?: string;
}

export interface EmployeeSalaryInfo {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string | null;
  basic_salary: number;
  hra: number;
  special_allowance: number;
  travel_allowance: number;
  medical_allowance: number;
  overtime_rate: number;
  bank_account_number: string | null;
  bank_ifsc: string | null;
}

export interface AttendanceData {
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
}

interface UsePayrollState {
  cycles: PayrollCycle[];
  payslips: Payslip[];
  isLoading: boolean;
  error: string | null;
}

// Status display configuration
export const CYCLE_STATUS_CONFIG: Record<PayrollCycleStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Processing", className: "bg-info/10 text-info border-info/20 animate-pulse" },
  computed: { label: "Computed", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary border-primary/20" },
  disbursed: { label: "Disbursed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

export const PAYSLIP_STATUS_CONFIG: Record<PayslipStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  computed: { label: "Computed", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary border-primary/20" },
  processed: { label: "Processed", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

// Month names for display
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================
// SALARY CALCULATION HELPERS
// ============================================

function createEmptyAttendanceData(): AttendanceData {
  return {
    present_days: 0,
    absent_days: 0,
    leave_days: 0,
    overtime_hours: 0,
  };
}

function summarizeAttendanceLogs(
  logs: Array<{
    status: string | null;
    total_hours: number | null;
    standard_hours: number | null;
  }>,
): AttendanceData {
  const summary = createEmptyAttendanceData();

  logs.forEach((log) => {
    if (log.status === "present") {
      summary.present_days += 1;
    } else if (log.status === "absent" || log.status === "absent_breach") {
      summary.absent_days += 1;
    } else if (
      ["leave", "sick_leave", "casual_leave", "earned_leave", "on_leave"].includes(
        log.status || "",
      )
    ) {
      summary.leave_days += 1;
    }

    const standardHours = log.standard_hours ?? 8;
    const workedHours = log.total_hours ?? 0;
    summary.overtime_hours += Math.max(0, workedHours - standardHours);
  });

  return summary;
}

// ============================================
// HOOK
// ============================================

export function usePayroll(selectedCycleId?: string) {
  const [state, setState] = useState<UsePayrollState>({
    cycles: [],
    payslips: [],
    isLoading: true,
    error: null,
  });

  // ============================================
  // FETCH PAYROLL CYCLES
  // ============================================
  const fetchPayrollCycles = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("payroll_cycles")
        .select("*")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        cycles: data || [],
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch payroll cycles";
      console.error("Error fetching payroll cycles:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // ============================================
  // FETCH PAYSLIPS FOR A CYCLE
  // ============================================
  const fetchPayslips = useCallback(async (cycleId: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("payslips")
        .select(`
          *,
          employees!employee_id (
            employee_code,
            first_name,
            last_name,
            department
          ),
          payroll_cycles!payroll_cycle_id (
            cycle_code
          )
        `)
        .eq("payroll_cycle_id", cycleId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data
      const payslipsWithDetails: Payslip[] = (data || []).map((ps: any) => ({
        ...ps,
        employee_name: ps.employees
          ? [ps.employees.first_name, ps.employees.last_name].filter(Boolean).join(" ").trim()
          : "Unknown",
        employee_code: ps.employees?.employee_code || "N/A",
        department: ps.employees?.department || null,
        cycle_code: ps.payroll_cycles?.cycle_code || null,
      }));

      setState((prev) => ({
        ...prev,
        payslips: payslipsWithDetails,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch payslips";
      console.error("Error fetching payslips:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // ============================================
  // CREATE PAYROLL CYCLE
  // ============================================
  const createPayrollCycle = useCallback(async (
    input: CreatePayrollCycleInput
  ): Promise<PayrollCycle | null> => {
    try {
      // Generate cycle code: PAY-YYYY-MM
      const cycleCode = `PAY-${input.period_year}-${String(input.period_month).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("payroll_cycles")
        .insert({
          cycle_code: cycleCode,
          period_month: input.period_month,
          period_year: input.period_year,
          period_start: input.period_start,
          period_end: input.period_end,
          total_working_days: input.total_working_days,
          status: "draft",
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh cycles list
      await fetchPayrollCycles();

      return data as PayrollCycle;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create payroll cycle";
      console.error("Error creating payroll cycle:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchPayrollCycles]);

  // ============================================
  // GENERATE PAYSLIPS FOR A CYCLE
  // ============================================
  const generatePayslips = useCallback(async (
    cycleId: string,
    employeeData: Array<{
      employee: EmployeeSalaryInfo;
      attendance: AttendanceData;
    }>
  ): Promise<Payslip[] | null> => {
    try {
      // Delegate salary calculation and payslip creation to the server
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: result, error: rpcError } = await supabase.rpc('generate_payroll_cycle' as any, {
        p_cycle_id: cycleId,
        p_user_id: user.id,
      });
      if (rpcError) throw rpcError;
      const rpcResult = result as any;
      if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Payroll generation failed');

      // Re-fetch the cycle and payslips after server-side generation
      await fetchPayrollCycles();
      await fetchPayslips(cycleId);

      return state.payslips;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate payslips";
      console.error("Error generating payslips:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.cycles, fetchPayrollCycles, fetchPayslips]);

  // ============================================
  // UPDATE PAYSLIP STATUS
  // ============================================
  const updatePayslipStatus = useCallback(async (
    payslipId: string,
    newStatus: PayslipStatus,
    paymentDetails?: {
      payment_mode?: string;
      payment_reference?: string;
    }
  ): Promise<Payslip | null> => {
    try {
      const updateData: Record<string, any> = { status: newStatus };

      if (newStatus === "processed" && paymentDetails) {
        updateData.payment_mode = paymentDetails.payment_mode;
        updateData.payment_reference = paymentDetails.payment_reference;
        updateData.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("payslips")
        .update(updateData)
        .eq("id", payslipId)
        .select()
        .single();

      if (error) throw error;

      // Refresh payslips
      const payslip = state.payslips.find((ps) => ps.id === payslipId);
      if (payslip) {
        await fetchPayslips(payslip.payroll_cycle_id);
      }

      return data as Payslip;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update payslip status";
      console.error("Error updating payslip status:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [state.payslips, fetchPayslips]);

  // ============================================
  // APPROVE PAYROLL CYCLE
  // ============================================
  const approvePayrollCycle = useCallback(async (cycleId: string): Promise<boolean> => {
    try {
      const cycle = state.cycles.find((c) => c.id === cycleId);
      if (!cycle) throw new Error("Cycle not found");
      if (cycle.status !== "computed") throw new Error("Only computed cycles can be approved");

      // Approve all payslips
      await supabase
        .from("payslips")
        .update({ status: "approved" })
        .eq("payroll_cycle_id", cycleId)
        .eq("status", "computed");

      // Approve cycle
      await supabase
        .from("payroll_cycles")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", cycleId);

      await fetchPayrollCycles();
      await fetchPayslips(cycleId);

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve payroll cycle";
      console.error("Error approving payroll cycle:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.cycles, fetchPayrollCycles, fetchPayslips]);

  // ============================================
  // DISBURSE PAYROLL CYCLE
  // ============================================
  const disbursePayrollCycle = useCallback(async (cycleId: string): Promise<boolean> => {
    try {
      const cycle = state.cycles.find((c) => c.id === cycleId);
      if (!cycle) throw new Error("Cycle not found");
      if (cycle.status !== "approved") throw new Error("Only approved cycles can be disbursed");

      // Mark all payslips as processed
      await supabase
        .from("payslips")
        .update({
          status: "processed",
          paid_at: new Date().toISOString(),
        })
        .eq("payroll_cycle_id", cycleId)
        .eq("status", "approved");

      // Mark cycle as disbursed
      await supabase
        .from("payroll_cycles")
        .update({
          status: "disbursed",
          disbursed_at: new Date().toISOString(),
        })
        .eq("id", cycleId);

      await fetchPayrollCycles();
      await fetchPayslips(cycleId);

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disburse payroll";
      console.error("Error disbursing payroll:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.cycles, fetchPayrollCycles, fetchPayslips]);

  // ============================================
  // GET PAYSLIPS BY EMPLOYEE
  // ============================================
  const getPayslipsByEmployee = useCallback(async (employeeId: string): Promise<Payslip[]> => {
    try {
      const { data, error } = await supabase
        .from("payslips")
        .select(`
          *,
          payroll_cycles!payroll_cycle_id (
            cycle_code,
            period_month,
            period_year
          )
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((ps: any) => ({
        ...ps,
        cycle_code: ps.payroll_cycles?.cycle_code,
      }));
    } catch (err: unknown) {
      console.error("Error fetching employee payslips:", err);
      return [];
    }
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getCycleById = useCallback(
    (id: string): PayrollCycle | undefined => {
      return state.cycles.find((c) => c.id === id);
    },
    [state.cycles]
  );

  const getCurrentCycle = useCallback((): PayrollCycle | undefined => {
    // Get the most recent non-cancelled cycle
    return state.cycles.find((c) => c.status !== "cancelled");
  }, [state.cycles]);

  const formatCurrency = useCallback((amount: number): string => {
    return centralizedFormatCurrency(toPaise(amount));
  }, []);

  const getCycleDisplayName = useCallback((cycle: PayrollCycle): string => {
    return `${MONTH_NAMES[cycle.period_month - 1]} ${cycle.period_year}`;
  }, []);

  const refresh = useCallback(() => {
    fetchPayrollCycles();
  }, [fetchPayrollCycles]);

  // ============================================
  // DOWNLOAD PAYSLIP PDF (Client-Side)
  // ============================================

  const downloadPayslipPdf = useCallback(async (payslipId: string) => {
    try {
      const payslip = state.payslips.find(p => p.id === payslipId);
      if (!payslip) throw new Error("Payslip not found");

      // Dynamic import to avoid loading heavy lib unless needed
      // @ts-ignore
      const jsPDF = (await import("jspdf")).default;
      // @ts-ignore
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text("PAYSLIP", 105, 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(`Payslip #: ${payslip.payslip_number}`, 14, 25);
      doc.text(`Period: ${payslip.cycle_code || 'N/A'}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);
      
      // Employee Details Table
      (doc as any).autoTable({
        startY: 40,
        head: [['Employee Details', '']],
        body: [
          ['Name', payslip.employee_name || 'N/A'],
          ['ID', payslip.employee_code || 'N/A'],
          ['Department', payslip.department || 'N/A'],
          ['Bank Account', payslip.bank_account_number || 'N/A'],
          ['PAN / Tax ID', 'XXXX-XXXX-XXXX'] // Placeholder for privacy
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10, cellPadding: 3 }
      });

      // Earnings & Deductions Table
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
        body: [
          ['Basic Salary', formatCurrency(payslip.basic_salary), 'PF', formatCurrency(payslip.pf_deduction)],
          ['HRA', formatCurrency(payslip.hra), 'ESIC', formatCurrency(payslip.esic_deduction)],
          ['Special Allowance', formatCurrency(payslip.special_allowance), 'Prof. Tax', formatCurrency(payslip.professional_tax)],
          ['Overtime', formatCurrency(payslip.overtime_amount), 'TDS', formatCurrency(payslip.tds)],
          ['Total Earnings', formatCurrency(payslip.gross_salary), 'Total Deductions', formatCurrency(payslip.total_deductions)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] },
        foot: [['', '', 'NET PAYABLE', formatCurrency(payslip.net_payable)]],
        footStyles: { fillColor: [46, 204, 113], fontStyle: 'bold' }
      });

      // Footer / Disclaimer
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("This is valid proof of income generated by the Organization's Operational Truth Engine.", 14, finalY);
      
      doc.save(`Payslip_${payslip.payslip_number}.pdf`);
      toast.success("Payslip downloaded successfully");
      return true;

    } catch (err: any) {
      console.error("PDF Generation Error:", err);
      const msg = typeof err?.message === 'string' ? err.message : '';
      toast.error(msg.includes("Cannot find module") 
        ? "Dependencies missing. Run: npm install jspdf jspdf-autotable" 
        : "Failed to generate PDF");
      return false;
    }
  }, [state.payslips, formatCurrency]);

  // ============================================
  // ATTENDANCE INTEGRATION (Phase C items 5.19-5.20)
  // ============================================

  // Get attendance summary for a single employee
  const getEmployeeAttendance = useCallback(async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceData | null> => {
    try {
      return await getEmployeeAttendanceFallback(employeeId, startDate, endDate);
    } catch (err: unknown) {
      console.error("Error fetching employee attendance:", err);
      return null;
    }
  }, []);

  // Fallback manual calculation if database function is not available
  const getEmployeeAttendanceFallback = useCallback(async (
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceData> => {
    try {
      const [attendanceResult, shiftResult] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("status, total_hours")
          .eq("employee_id", employeeId)
          .gte("log_date", startDate)
          .lte("log_date", endDate),
        supabase
          .from("employee_shift_assignments")
          .select("shifts(duration_hours)")
          .eq("employee_id", employeeId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      if (shiftResult.error) throw shiftResult.error;

      const rawShift = shiftResult.data?.shifts;
      const shift = Array.isArray(rawShift) ? rawShift[0] : rawShift;
      const standardHours = Number(shift?.duration_hours) || 8;

      return summarizeAttendanceLogs(
        (attendanceResult.data || []).map((row: any) => ({
          status: row.status ?? null,
          total_hours: row.total_hours ?? null,
          standard_hours: standardHours,
        })),
      );
    } catch (rpcError) {
      console.error('Attendance data fetch failed:', rpcError);
      throw new Error('Failed to fetch attendance data. Ensure the attendance_logs table is properly configured.');
    }
  }, []);

  // Get attendance summary for multiple employees (batch operation)
  const getBatchAttendance = useCallback(async (
    employeeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, AttendanceData>> => {
    const result = new Map<string, AttendanceData>();

    try {
      if (employeeIds.length === 0) {
        return result;
      }

      const [attendanceResult, shiftResult] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("employee_id, status, total_hours")
          .in("employee_id", employeeIds)
          .gte("log_date", startDate)
          .lte("log_date", endDate),
        supabase
          .from("employee_shift_assignments")
          .select("employee_id, shifts(duration_hours)")
          .in("employee_id", employeeIds)
          .eq("is_active", true),
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      if (shiftResult.error) throw shiftResult.error;

      const standardHoursByEmployee = new Map<string, number>();
      (shiftResult.data || []).forEach((assignment: any) => {
        const rawShift = assignment.shifts;
        const shift = Array.isArray(rawShift) ? rawShift[0] : rawShift;
        standardHoursByEmployee.set(
          assignment.employee_id,
          Number(shift?.duration_hours) || 8,
        );
      });

      const groupedLogs = new Map<
        string,
        Array<{
          status: string | null;
          total_hours: number | null;
          standard_hours: number | null;
        }>
      >();

      (attendanceResult.data || []).forEach((row: any) => {
        const employeeLogs = groupedLogs.get(row.employee_id) || [];
        employeeLogs.push({
          status: row.status ?? null,
          total_hours: row.total_hours ?? null,
          standard_hours: standardHoursByEmployee.get(row.employee_id) ?? 8,
        });
        groupedLogs.set(row.employee_id, employeeLogs);
      });

      employeeIds.forEach((employeeId) => {
        result.set(
          employeeId,
          summarizeAttendanceLogs(groupedLogs.get(employeeId) || []),
        );
      });

      return result;
    } catch (err: unknown) {
      console.error("Error fetching batch attendance:", err);
      // Return empty map on error
      return result;
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchPayrollCycles();
  }, [fetchPayrollCycles]);

  useEffect(() => {
    if (selectedCycleId) {
      fetchPayslips(selectedCycleId);
    }
  }, [selectedCycleId, fetchPayslips]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    cycles: state.cycles,
    payslips: state.payslips,
    isLoading: state.isLoading,
    error: state.error,

    // Cycle Operations
    fetchPayrollCycles,
    createPayrollCycle,
    approvePayrollCycle,
    disbursePayrollCycle,

    // Payslip Operations
    fetchPayslips,
    generatePayslips,
    updatePayslipStatus,
    getPayslipsByEmployee,

    // Helpers
    getCycleById,
    getCurrentCycle,
    formatCurrency,
    getCycleDisplayName,

    // Attendance Integration (Phase C)
    getEmployeeAttendance,
    getBatchAttendance,

    // PDF Generation (Phase E)
    downloadPayslipPdf,

    // Refresh
    refresh,
  };
}

export default usePayroll;

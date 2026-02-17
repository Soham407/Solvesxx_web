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

// Professional Tax calculation (simplified - Karnataka rates)
function calculateProfessionalTax(grossSalary: number): number {
  if (grossSalary <= 15000) return 0;
  if (grossSalary <= 25000) return 200;
  return 200; // Flat 200 for > 25000 in many states
}

// Calculate salary for an employee
// NOTE: Kept for UI preview/display purposes only. The authoritative calculation
// is now performed server-side by the database function `calculate_employee_salary`.
export function calculateSalary(
  employee: EmployeeSalaryInfo,
  attendance: AttendanceData,
  totalWorkingDays: number
): Partial<Payslip> {
  // Pro-rate basic based on attendance
  const proRatedBasic = (employee.basic_salary * attendance.present_days) / totalWorkingDays;
  
  // Calculate overtime
  const overtimeAmount = attendance.overtime_hours * employee.overtime_rate;
  
  // Calculate gross (using fixed allowances, not pro-rated for simplicity)
  const grossSalary =
    proRatedBasic +
    employee.hra +
    employee.special_allowance +
    employee.travel_allowance +
    employee.medical_allowance +
    overtimeAmount;
  
  // Calculate deductions
  const pfDeduction = Math.round(proRatedBasic * 0.12); // 12% of basic
  const esicDeduction = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0; // 0.75% if gross <= 21000
  const professionalTax = calculateProfessionalTax(grossSalary);
  
  const totalDeductions = pfDeduction + esicDeduction + professionalTax;
  
  // Calculate net payable
  const netPayable = grossSalary - totalDeductions;
  
  // Employer contributions
  const employerPf = Math.round(proRatedBasic * 0.12); // 12% employer PF
  const employerEsic = grossSalary <= 21000 ? Math.round(grossSalary * 0.0325) : 0; // 3.25% employer ESIC
  
  return {
    present_days: attendance.present_days,
    absent_days: attendance.absent_days,
    leave_days: attendance.leave_days,
    overtime_hours: attendance.overtime_hours,
    basic_salary: employee.basic_salary,
    pro_rated_basic: Math.round(proRatedBasic * 100) / 100,
    hra: employee.hra,
    special_allowance: employee.special_allowance,
    travel_allowance: employee.travel_allowance,
    medical_allowance: employee.medical_allowance,
    overtime_amount: Math.round(overtimeAmount * 100) / 100,
    bonus: 0,
    other_earnings: 0,
    gross_salary: Math.round(grossSalary * 100) / 100,
    pf_deduction: pfDeduction,
    esic_deduction: esicDeduction,
    professional_tax: professionalTax,
    tds: 0, // Simplified - would need more complex calculation
    loan_recovery: 0,
    advance_recovery: 0,
    other_deductions: 0,
    total_deductions: totalDeductions,
    net_payable: Math.round(netPayable * 100) / 100,
    employer_pf: employerPf,
    employer_esic: employerEsic,
    bank_account_number: employee.bank_account_number,
    bank_ifsc: employee.bank_ifsc,
  };
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
      
      // Employee Details
      doc.autoTable({
        startY: 35,
        head: [['Employee Details', '']],
        body: [
          ['Name', payslip.employee_name || 'N/A'],
          ['ID', payslip.employee_code || 'N/A'],
          ['Department', payslip.department || 'N/A'],
          ['Bank Account', payslip.bank_account_number || 'N/A']
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Earnings & Deductions
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
        body: [
          ['Basic Salary', formatCurrency(payslip.basic_salary), 'PF', formatCurrency(payslip.pf_deduction)],
          ['HRA', formatCurrency(payslip.hra), 'ESIC', formatCurrency(payslip.esic_deduction)],
          ['Special Allowance', formatCurrency(payslip.special_allowance), 'Prof. Tax', formatCurrency(payslip.professional_tax)],
          ['Overtime', formatCurrency(payslip.overtime_amount), 'TDS', formatCurrency(payslip.tds)],
          ['Total Earnings', formatCurrency(payslip.gross_salary), 'Total Deductions', formatCurrency(payslip.total_deductions)]
        ],
        theme: 'striped'
      });

      // Net Pay
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`NET PAYABLE: ${formatCurrency(payslip.net_payable)}`, 196, finalY, { align: "right" });
      
      doc.save(`Payslip_${payslip.payslip_number}.pdf`);
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
      // Call the get_attendance_summary database function
      // Note: RPC function may not be in TypeScript types until regenerated
      const { data, error } = await (supabase.rpc as CallableFunction)(
        "get_attendance_summary",
        {
          p_employee_id: employeeId,
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );

      if (error) {
        // If the function doesn't exist yet (migration not run), fall back to manual calculation
        console.warn("Attendance function not available, using manual calculation:", error);
        return await getEmployeeAttendanceFallback(employeeId, startDate, endDate);
      }

      if (!data || data.length === 0) {
        // No attendance records found
        return {
          present_days: 0,
          absent_days: 0,
          leave_days: 0,
          overtime_hours: 0,
        };
      }

      const summary = data[0];
      return {
        present_days: summary.present_days || 0,
        absent_days: summary.absent_days || 0,
        leave_days: summary.leave_days || 0,
        overtime_hours: summary.overtime_hours || 0,
      };
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
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("status, overtime_hours")
        .eq("employee_id", employeeId)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      const logs = data || [];
      const result: AttendanceData = {
        present_days: 0,
        absent_days: 0,
        leave_days: 0,
        overtime_hours: 0,
      };

      logs.forEach((log: any) => {
        if (log.status === "present") {
          result.present_days++;
        } else if (log.status === "absent") {
          result.absent_days++;
        } else if (["leave", "sick_leave", "casual_leave", "earned_leave"].includes(log.status)) {
          result.leave_days++;
        }
        result.overtime_hours += log.overtime_hours || 0;
      });

      return result;
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
      // Try the batch function first
      // Note: RPC function may not be in TypeScript types until regenerated
      const { data, error } = await (supabase.rpc as CallableFunction)(
        "get_batch_attendance_summary",
        {
          p_employee_ids: employeeIds,
          p_start_date: startDate,
          p_end_date: endDate,
        }
      );

      if (error) {
        // Fallback: query individually
        console.warn("Batch attendance function not available, using individual queries:", error);
        for (const employeeId of employeeIds) {
          const attendance = await getEmployeeAttendanceFallback(employeeId, startDate, endDate);
          result.set(employeeId, attendance);
        }
        return result;
      }

      // Map the batch results
      (data || []).forEach((row: any) => {
        result.set(row.employee_id, {
          present_days: row.present_days || 0,
          absent_days: row.absent_days || 0,
          leave_days: row.leave_days || 0,
          overtime_hours: row.overtime_hours || 0,
        });
      });

      // Fill in any missing employees with zero values
      for (const employeeId of employeeIds) {
        if (!result.has(employeeId)) {
          result.set(employeeId, {
            present_days: 0,
            absent_days: 0,
            leave_days: 0,
            overtime_hours: 0,
          });
        }
      }

      return result;
    } catch (err: unknown) {
      console.error("Error fetching batch attendance:", err);
      // Return empty map on error
      return result;
    }
  }, [getEmployeeAttendanceFallback]);

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

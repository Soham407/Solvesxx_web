import type { AttendanceData, Payslip } from "@/hooks/usePayroll";

export type PayrollEmployeeRelation = {
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
};

export type PayrollCycleRelation = {
  cycle_code?: string | null;
};

export type PayrollPayslipRow = Omit<Payslip, "employee_name" | "employee_code" | "department" | "cycle_code"> & {
  employees?: PayrollEmployeeRelation | PayrollEmployeeRelation[] | null;
  payroll_cycles?: PayrollCycleRelation | PayrollCycleRelation[] | null;
};

export type PayrollAttendanceSummaryRow = {
  status: string | null;
  total_hours: number | null;
  standard_hours: number | null;
};

export type PayrollAttendanceLogRow = {
  employee_id: string;
  status: string | null;
  total_hours: number | null;
};

export type PayrollShiftAssignmentRow = {
  employee_id: string;
  shifts?: { duration_hours?: number | string | null } | { duration_hours?: number | string | null }[] | null;
};

export function mapPayrollPayslips(rows: PayrollPayslipRow[]): Payslip[] {
  return rows.map((ps) => {
    const employees = Array.isArray(ps.employees) ? ps.employees[0] ?? null : ps.employees ?? null;
    const payrollCycle = Array.isArray(ps.payroll_cycles) ? ps.payroll_cycles[0] ?? null : ps.payroll_cycles ?? null;

    return {
      ...ps,
      employee_name: employees
        ? [employees.first_name, employees.last_name].filter(Boolean).join(" ").trim()
        : "Unknown",
      employee_code: employees?.employee_code || "N/A",
      department: employees?.department || null,
      cycle_code: payrollCycle?.cycle_code || null,
    };
  });
}

export function mapPayrollCyclePayslips(rows: PayrollPayslipRow[]): Payslip[] {
  return rows.map((ps) => {
    const payrollCycle = Array.isArray(ps.payroll_cycles) ? ps.payroll_cycles[0] ?? null : ps.payroll_cycles ?? null;
    return {
      ...ps,
      cycle_code: payrollCycle?.cycle_code,
    };
  });
}

export function summarizeAttendanceLogs(
  logs: PayrollAttendanceSummaryRow[],
): AttendanceData {
  const summary: AttendanceData = {
    present_days: 0,
    absent_days: 0,
    leave_days: 0,
    overtime_hours: 0,
  };

  logs.forEach((log) => {
    if (log.status === "present" || log.status === "late") {
      summary.present_days += 1;
    } else if (
      log.status === "absent" ||
      log.status === "absent_breach" ||
      log.status === "unpaid_leave"
    ) {
      summary.absent_days += 1;
    } else if (
      [
        "leave",
        "on_leave",
        "paid_leave",
        "sick_leave",
        "casual_leave",
        "earned_leave",
      ].includes(log.status || "")
    ) {
      summary.leave_days += 1;
    }

    const standardHours = log.standard_hours ?? 8;
    const workedHours = log.total_hours ?? 0;
    summary.overtime_hours += Math.max(0, workedHours - standardHours);
  });

  return summary;
}

export function resolveStandardShiftHours(
  assignment: PayrollShiftAssignmentRow,
  fallbackHours: number = 8,
): number {
  const rawShift = assignment.shifts;
  const shift = Array.isArray(rawShift) ? rawShift[0] : rawShift;
  return Number(shift?.duration_hours) || fallbackHours;
}

export function buildAttendanceSummaryRows(
  logs: PayrollAttendanceLogRow[],
  standardHoursByEmployee: Map<string, number>,
): Map<string, PayrollAttendanceSummaryRow[]> {
  const grouped = new Map<string, PayrollAttendanceSummaryRow[]>();

  logs.forEach((row) => {
    const employeeLogs = grouped.get(row.employee_id) || [];
    employeeLogs.push({
      status: row.status ?? null,
      total_hours: row.total_hours ?? null,
      standard_hours: standardHoursByEmployee.get(row.employee_id) ?? 8,
    });
    grouped.set(row.employee_id, employeeLogs);
  });

  return grouped;
}

export function buildAttendanceSummaryMap(
  logs: PayrollAttendanceLogRow[],
  standardHoursByEmployee: Map<string, number>,
): Map<string, AttendanceData> {
  const grouped = buildAttendanceSummaryRows(logs, standardHoursByEmployee);
  const result = new Map<string, AttendanceData>();

  grouped.forEach((group, employeeId) => {
    result.set(employeeId, summarizeAttendanceLogs(group));
  });

  return result;
}

export function buildPayslipPdfLayout(payslip: {
  payslip_number: string;
  cycle_code?: string | null;
  employee_name?: string;
  employee_code?: string;
  department?: string | null;
  bank_account_number?: string | null;
  basic_salary: number;
  pf_deduction: number;
  hra: number;
  esic_deduction: number;
  special_allowance: number;
  professional_tax: number;
  overtime_amount: number;
  tds: number;
  gross_salary: number;
  total_deductions: number;
  net_payable: number;
}) {
  return {
    header: [
      ["Employee Details", ""],
    ],
    employeeRows: [
      ["Name", payslip.employee_name || "N/A"],
      ["ID", payslip.employee_code || "N/A"],
      ["Department", payslip.department || "N/A"],
      ["Bank Account", payslip.bank_account_number || "N/A"],
      ["PAN / Tax ID", "XXXX-XXXX-XXXX"],
    ],
    earningsRows: [
      ["Basic Salary", payslip.basic_salary, "PF", payslip.pf_deduction],
      ["HRA", payslip.hra, "ESIC", payslip.esic_deduction],
      ["Special Allowance", payslip.special_allowance, "Prof. Tax", payslip.professional_tax],
      ["Overtime", payslip.overtime_amount, "TDS", payslip.tds],
      ["Total Earnings", payslip.gross_salary, "Total Deductions", payslip.total_deductions],
    ],
    footerLabel: "NET PAYABLE",
    netPayable: payslip.net_payable,
    defaultFinalY: 40,
    fileName: `Payslip_${payslip.payslip_number}.pdf`,
    periodLabel: payslip.cycle_code || "N/A",
  };
}

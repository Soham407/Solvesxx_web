import type { Database } from "@/supabase-types";

export const PAYROLL_SUPPORTED_COMPONENT_ABBRS = ["B", "HRA", "SA", "TA", "MA"] as const;

export type SupportedPayrollComponentAbbr = (typeof PAYROLL_SUPPORTED_COMPONENT_ABBRS)[number];
export type SalaryComponentRow = Database["public"]["Tables"]["salary_components"]["Row"];
export type SalaryStructureViewRow = Database["public"]["Views"]["employee_salary_structure_with_details"]["Row"];

export interface PayrollSalaryComponentDefinition {
  id: string;
  abbr: SupportedPayrollComponentAbbr;
  name: string;
  description: string | null;
  defaultAmount: number | null;
  dependsOnPaymentDays: boolean;
  formula: string | null;
  sortOrder: number;
}

export interface EmployeeSalaryStructureRecord {
  id: string;
  employeeId: string;
  componentId: string;
  componentAbbr: SupportedPayrollComponentAbbr;
  componentName: string;
  amount: number;
  effectiveFrom: string;
  notes: string | null;
  dependsOnPaymentDays: boolean;
}

export interface SaveEmployeeSalaryStructureInput {
  employeeId: string;
  effectiveFrom: string;
  notes?: string;
  components: Array<{
    componentId: string;
    amountRupees: number;
  }>;
}

export function isSupportedComponentAbbr(value: string | null): value is SupportedPayrollComponentAbbr {
  return PAYROLL_SUPPORTED_COMPONENT_ABBRS.includes(value as SupportedPayrollComponentAbbr);
}

export function normalizeSalaryComponent(
  component: SalaryComponentRow
): PayrollSalaryComponentDefinition | null {
  if (!isSupportedComponentAbbr(component.abbr)) {
    return null;
  }

  return {
    id: component.id,
    abbr: component.abbr,
    name: component.name,
    description: component.description,
    defaultAmount: component.default_amount,
    dependsOnPaymentDays: component.depends_on_payment_days ?? false,
    formula: component.formula,
    sortOrder: component.sort_order ?? 0,
  };
}

export function normalizeSalaryStructure(
  record: SalaryStructureViewRow
): EmployeeSalaryStructureRecord | null {
  if (
    !record.id ||
    !record.employee_id ||
    !record.component_id ||
    !record.effective_from ||
    !isSupportedComponentAbbr(record.component_abbr)
  ) {
    return null;
  }

  return {
    id: record.id,
    employeeId: record.employee_id,
    componentId: record.component_id,
    componentAbbr: record.component_abbr,
    componentName: record.component_name ?? record.component_abbr,
    amount: record.amount ?? 0,
    effectiveFrom: record.effective_from,
    notes: record.notes,
    dependsOnPaymentDays: record.depends_on_payment_days ?? false,
  };
}

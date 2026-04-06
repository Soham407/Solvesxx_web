"use client";

import { useMemo } from "react";

import type { Database } from "@/supabase-types";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";
import { toPaise } from "@/src/lib/utils/currency";

export const PAYROLL_SUPPORTED_COMPONENT_ABBRS = ["B", "HRA", "SA", "TA", "MA"] as const;

type SupportedPayrollComponentAbbr = (typeof PAYROLL_SUPPORTED_COMPONENT_ABBRS)[number];
type SalaryComponentRow = Database["public"]["Tables"]["salary_components"]["Row"];
type SalaryStructureViewRow = Database["public"]["Views"]["employee_salary_structure_with_details"]["Row"];

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

function isSupportedComponentAbbr(value: string | null): value is SupportedPayrollComponentAbbr {
  return PAYROLL_SUPPORTED_COMPONENT_ABBRS.includes(
    value as SupportedPayrollComponentAbbr
  );
}

function normalizeComponent(component: SalaryComponentRow): PayrollSalaryComponentDefinition | null {
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

function normalizeStructure(record: SalaryStructureViewRow): EmployeeSalaryStructureRecord | null {
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

export function useEmployeeSalaryStructure(employeeId?: string) {
  const {
    data: componentsData,
    isLoading: isLoadingComponents,
    error: componentsError,
    refresh: refreshComponents,
  } = useSupabaseQuery<PayrollSalaryComponentDefinition>(
    async () => {
      const { data, error } = await supabase
        .from("salary_components")
        .select(
          "id, abbr, name, description, default_amount, depends_on_payment_days, formula, sort_order, is_active"
        )
        .eq("is_active", true)
        .in("abbr", [...PAYROLL_SUPPORTED_COMPONENT_ABBRS])
        .order("sort_order", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? [])
        .map((component) => normalizeComponent(component as SalaryComponentRow))
        .filter((component): component is PayrollSalaryComponentDefinition => Boolean(component));
    },
    []
  );

  const {
    data: structuresData,
    isLoading: isLoadingStructures,
    error: structuresError,
    refresh: refreshStructures,
  } = useSupabaseQuery<EmployeeSalaryStructureRecord>(
    async () => {
      if (!employeeId) {
        return [];
      }

      const { data, error } = await supabase
        .from("employee_salary_structure_with_details")
        .select(
          "id, employee_id, component_id, component_abbr, component_name, amount, effective_from, notes, depends_on_payment_days"
        )
        .eq("employee_id", employeeId)
        .in("component_abbr", [...PAYROLL_SUPPORTED_COMPONENT_ABBRS])
        .order("component_abbr", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? [])
        .map((record) => normalizeStructure(record as SalaryStructureViewRow))
        .filter((record): record is EmployeeSalaryStructureRecord => Boolean(record));
    },
    [employeeId]
  );

  const { execute: saveSalaryStructure, isLoading: isSaving } = useSupabaseMutation<
    SaveEmployeeSalaryStructureInput,
    number
  >(
    async (input) => {
      if (!input.employeeId) {
        throw new Error("Employee is required.");
      }

      if (!input.effectiveFrom) {
        throw new Error("Effective from date is required.");
      }

      const normalizedComponents = input.components.filter(
        (component) => Number.isFinite(component.amountRupees) && component.amountRupees > 0
      );

      if (normalizedComponents.length === 0) {
        throw new Error("Configure at least one payroll component before saving.");
      }

      for (const component of normalizedComponents) {
        const { error } = await supabase.rpc("upsert_employee_salary_component" as any, {
          p_employee_id: input.employeeId,
          p_component_id: component.componentId,
          p_amount: toPaise(component.amountRupees),
          p_effective_from: input.effectiveFrom,
          p_notes: input.notes?.trim() || null,
        });

        if (error) {
          throw error;
        }
      }

      refreshStructures();

      return normalizedComponents.length;
    },
    { successMessage: "Payroll compensation updated." }
  );

  const components = useMemo(
    () => [...componentsData].sort((left, right) => left.sortOrder - right.sortOrder),
    [componentsData]
  );

  const activeStructures = useMemo(
    () =>
      [...structuresData].sort((left, right) => {
        const componentSort =
          PAYROLL_SUPPORTED_COMPONENT_ABBRS.indexOf(left.componentAbbr) -
          PAYROLL_SUPPORTED_COMPONENT_ABBRS.indexOf(right.componentAbbr);

        if (componentSort !== 0) {
          return componentSort;
        }

        return left.effectiveFrom.localeCompare(right.effectiveFrom);
      }),
    [structuresData]
  );

  const hasBasicSalary = activeStructures.some(
    (record) => record.componentAbbr === "B" && record.amount > 0
  );

  return {
    components,
    activeStructures,
    hasBasicSalary,
    isLoading: isLoadingComponents || isLoadingStructures,
    isSaving,
    error: structuresError ?? componentsError,
    refresh: () => {
      refreshComponents();
      refreshStructures();
    },
    saveSalaryStructure,
  };
}

"use client";

import { useMemo } from "react";
import { useSupabaseMutation } from "@/hooks/lib/useSupabaseMutation";
import { useSupabaseQuery } from "@/hooks/lib/useSupabaseQuery";
import { supabase } from "@/src/lib/supabaseClient";
import { toPaise } from "@/src/lib/utils/currency";
import {
  normalizeSalaryComponent,
  normalizeSalaryStructure,
  type EmployeeSalaryStructureRecord,
  type PayrollSalaryComponentDefinition,
  type SalaryComponentRow,
  type SalaryStructureViewRow,
  type SaveEmployeeSalaryStructureInput,
} from "@/src/lib/hrms/salaryStructureTransforms";

export const PAYROLL_SUPPORTED_COMPONENT_ABBRS = ["B", "HRA", "SA", "TA", "MA"] as const;
export type {
  EmployeeSalaryStructureRecord,
  PayrollSalaryComponentDefinition,
  SaveEmployeeSalaryStructureInput,
} from "@/src/lib/hrms/salaryStructureTransforms";

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
        .map((component) => normalizeSalaryComponent(component as SalaryComponentRow))
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
        .map((record) => normalizeSalaryStructure(record as SalaryStructureViewRow))
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

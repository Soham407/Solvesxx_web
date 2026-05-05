"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase as supabaseTyped } from "@/src/lib/supabaseClient";

const supabase = supabaseTyped;

export const SERVICE_TYPE_OPTIONS = [
  { value: "security", label: "Security" },
  { value: "staffing", label: "Staffing" },
  { value: "ac", label: "AC" },
  { value: "pest_control", label: "Pest Control" },
  { value: "plantation", label: "Plantation" },
] as const;

const SERVICE_TYPE_ALIASES: Record<string, string[]> = {
  security: ["security", "security services", "guard"],
  staffing: ["staffing", "housekeeping", "soft services", "soft service", "manpower"],
  ac: ["ac", "a/c", "air conditioner", "air conditioning"],
  pest_control: ["pest control", "pest_control", "pest"],
  plantation: ["plantation", "horticulture", "gardening"],
};

export interface ServiceDeploymentCompanyLocation {
  id: string;
  location_name: string;
  location_code?: string | null;
}

export interface ServiceDeploymentWorkOption {
  id: string;
  work_name: string;
  description?: string | null;
  service_type: string;
}

export interface ServiceDeploymentSupplierOption {
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string | null;
  service_type: string;
}

interface UseServiceDeploymentMastersState {
  companyLocations: ServiceDeploymentCompanyLocation[];
  workOptions: ServiceDeploymentWorkOption[];
  supplierOptions: ServiceDeploymentSupplierOption[];
  isLoading: boolean;
  error: string | null;
}

type WorkRow = {
  service_type: string | null;
  work?: { id?: string | null; work_name?: string | null; description?: string | null } | null;
};

type SupplierRow = {
  service_type: string | null;
  supplier?: {
    id?: string | null;
    supplier_name?: string | null;
    supplier_code?: string | null;
    is_active?: boolean | null;
    status?: string | null;
  } | null;
};

function normalizeKey(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeServiceType(value: string | null | undefined) {
  const normalizedValue = normalizeKey(value);

  for (const option of SERVICE_TYPE_OPTIONS) {
    const aliases = SERVICE_TYPE_ALIASES[option.value] || [];
    if (aliases.some((alias) => normalizeKey(alias) === normalizedValue)) {
      return option.value;
    }
  }

  return "";
}

export function serviceTypeLabel(serviceType: string | null | undefined) {
  const normalizedServiceType = normalizeServiceType(serviceType);
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === normalizedServiceType)?.label || "Service";
}

export function useServiceDeploymentMasters() {
  const [state, setState] = useState<UseServiceDeploymentMastersState>({
    companyLocations: [],
    workOptions: [],
    supplierOptions: [],
    isLoading: true,
    error: null,
  });

  const fetchMasters = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const [companyLocationsResult, serviceWorkResult, vendorServicesResult] = await Promise.all([
        supabase
          .from("company_locations")
          .select("id, location_name, location_code")
          .eq("is_active", true)
          .order("location_name", { ascending: true }),
        supabase
          .from("services_wise_work")
          .select(`
            id,
            service_type,
            work:work_id (
              id,
              work_name,
              description
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("vendor_wise_services")
          .select(`
            service_type,
            supplier:supplier_id (
              id,
              supplier_name,
              supplier_code,
              is_active,
              status
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (companyLocationsResult.error) throw companyLocationsResult.error;
      if (serviceWorkResult.error) throw serviceWorkResult.error;
      if (vendorServicesResult.error) throw vendorServicesResult.error;

      const workOptions = ((serviceWorkResult.data || []) as WorkRow[]).flatMap((row) => {
        const work = Array.isArray(row.work) ? row.work[0] : row.work;
        if (!row.service_type || !work?.id || !work?.work_name) {
          return [];
        }

        return [
          {
            id: work.id,
            work_name: work.work_name,
            description: work.description || null,
            service_type: row.service_type,
          } satisfies ServiceDeploymentWorkOption,
        ];
      });

      const supplierOptionsMap = new Map<string, ServiceDeploymentSupplierOption>();
      ((vendorServicesResult.data || []) as SupplierRow[]).forEach((row) => {
        const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
        if (!row.service_type || !supplier?.id || !supplier?.supplier_name) {
          return;
        }

        if (supplier.is_active === false || (supplier.status && supplier.status !== "active")) {
          return;
        }

        const key = `${row.service_type}:${supplier.id}`;
        supplierOptionsMap.set(key, {
          supplier_id: supplier.id,
          supplier_name: supplier.supplier_name,
          supplier_code: supplier.supplier_code || null,
          service_type: row.service_type,
        });
      });

      setState({
        companyLocations: (companyLocationsResult.data || []) as ServiceDeploymentCompanyLocation[],
        workOptions,
        supplierOptions: Array.from(supplierOptionsMap.values()).sort((a, b) =>
          a.supplier_name.localeCompare(b.supplier_name)
        ),
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      console.error("Error fetching service deployment masters:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message || "Failed to load service deployment masters" : "Failed to load service deployment masters",
      }));
    }
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  const getWorkOptionsByServiceType = useCallback(
    (serviceType: string | null | undefined) => {
      const normalizedServiceType = normalizeServiceType(serviceType);
      return state.workOptions.filter(
        (option) => normalizeServiceType(option.service_type) === normalizedServiceType
      );
    },
    [state.workOptions]
  );

  const getSuppliersByServiceType = useCallback(
    (serviceType: string | null | undefined) => {
      const normalizedServiceType = normalizeServiceType(serviceType);
      return state.supplierOptions.filter(
        (option) => normalizeServiceType(option.service_type) === normalizedServiceType
      );
    },
    [state.supplierOptions]
  );

  const serviceTypeLookup = useMemo(
    () =>
      Object.fromEntries(
        SERVICE_TYPE_OPTIONS.map((option) => [option.value, option.label])
      ) as Record<string, string>,
    []
  );

  return {
    companyLocations: state.companyLocations,
    workOptions: state.workOptions,
    supplierOptions: state.supplierOptions,
    isLoading: state.isLoading,
    error: state.error,
    serviceTypeLookup,
    getWorkOptionsByServiceType,
    getSuppliersByServiceType,
    refresh: fetchMasters,
  };
}

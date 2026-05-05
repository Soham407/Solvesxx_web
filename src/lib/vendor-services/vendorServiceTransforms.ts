export type VendorWiseServiceRow = {
  id: string;
  supplier_id: string | null;
  service_type: string;
  is_active: boolean | null;
  created_at: string | null;
  supplier?: {
    supplier_name: string;
    supplier_code: string;
    mobile?: string | null;
  } | null;
};

export interface VendorWiseService {
  id: string;
  supplier_id: string;
  service_id: string;
  service_type: string;
  vendor_rate: number | null;
  response_time_sla: string | null;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: {
    supplier_name: string;
    supplier_code: string;
    mobile: string;
  };
  service?: {
    service_name: string;
    service_code: string;
    service_category: string;
  };
}

export type VendorServiceCreateInput = Omit<
  VendorWiseService,
  "id" | "created_at" | "updated_at" | "service_id" | "vendor_rate" | "response_time_sla" | "is_preferred"
>;

export function mapVendorWiseServiceRow(row: VendorWiseServiceRow): VendorWiseService {
  return {
    id: row.id,
    supplier_id: row.supplier_id || "",
    service_id: row.service_type,
    service_type: row.service_type,
    vendor_rate: null,
    response_time_sla: null,
    is_preferred: false,
    is_active: row.is_active !== false,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.created_at || new Date().toISOString(),
    supplier: row.supplier
      ? {
          supplier_name: row.supplier.supplier_name,
          supplier_code: row.supplier.supplier_code,
          mobile: "",
        }
      : undefined,
    service: {
      service_name: row.service_type,
      service_code: row.service_type,
      service_category: row.service_type,
    },
  };
}

export interface TechnicianProfile {
  id: string;
  employee_id: string;
  skills: string[];
  certifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name?: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  photo_url?: string;
}

export interface RawTechnicianRow {
  id: string;
  employee_id: string;
  skills: string[];
  certifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name?: string;
    last_name?: string;
    employee_code?: string;
    photo_url?: string;
    department?: string;
    designations?: {
      designation_name?: string;
    };
  };
}

export function mapTechnicianRow(item: RawTechnicianRow): TechnicianProfile {
  return {
    ...item,
    full_name: item.employee ? `${item.employee.first_name ?? ""} ${item.employee.last_name ?? ""}`.trim() || "Unknown" : "Unknown",
    employee_code: item.employee?.employee_code,
    designation: item.employee?.designations?.designation_name,
    department: item.employee?.department,
    photo_url: item.employee?.photo_url,
  };
}

export function mapTechnicianRows(items: RawTechnicianRow[]): TechnicianProfile[] {
  return items.map(mapTechnicianRow);
}

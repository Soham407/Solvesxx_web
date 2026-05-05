export interface ResidentRow {
  id: string;
  resident_code: string | null;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  auth_user_id: string | null;
  flat_id: string | null;
  flat_number: string | null;
  building_id: string | null;
  building_name: string | null;
  society_id: string | null;
  society_name: string | null;
  created_at: string | null;
}

export interface CreateResidentPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  flat_id: string;
  society_id: string;
}

export interface CreateResidentResult {
  resident: ResidentRow | null;
  temp_password: string;
}

export interface UpdateResidentPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

export interface ResidentQueryRecord {
  id: string;
  resident_code: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  auth_user_id: string | null;
  flat_id: string | null;
  created_at: string | null;
  flat:
    | {
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }
    | Array<{
        flat_number?: string | null;
        building?:
          | {
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }
          | Array<{
              id?: string | null;
              building_name?: string | null;
              society_id?: string | null;
              society?:
                | {
                    id?: string | null;
                    society_name?: string | null;
                  }
                | Array<{
                    id?: string | null;
                    society_name?: string | null;
                  }>
                | null;
            }>
          | null;
      }>
    | null;
}

function splitFullName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" ") || "",
  };
}

function getNestedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function mapResidentListRow(resident: ResidentQueryRecord): ResidentRow {
  const flat = getNestedRecord(resident.flat);
  const building = getNestedRecord(flat?.building);
  const society = getNestedRecord(building?.society);
  const names = splitFullName(resident.full_name);

  return {
    id: resident.id,
    resident_code: resident.resident_code ?? null,
    full_name: resident.full_name ?? "",
    first_name: names.first_name,
    last_name: names.last_name,
    phone: resident.phone ?? "",
    email: resident.email ?? "",
    is_active: resident.is_active !== false,
    auth_user_id: resident.auth_user_id ?? null,
    flat_id: resident.flat_id ?? null,
    flat_number: flat?.flat_number ?? null,
    building_id: building?.id ?? null,
    building_name: building?.building_name ?? null,
    society_id: building?.society_id ?? society?.id ?? null,
    society_name: society?.society_name ?? null,
    created_at: resident.created_at ?? null,
  };
}

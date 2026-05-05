export interface FlatDetails {
  id: string;
  flat_number: string;
  floor_number: number | null;
  flat_type: string | null;
  area_sqft: number | null;
  ownership_type: string | null;
  building: {
    id: string;
    building_name: string;
    building_code: string;
  } | null;
}

export interface ResidentDetails {
  id: string;
  resident_code: string;
  full_name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  is_primary_contact: boolean | null;
  move_in_date: string | null;
  flat: FlatDetails | null;
}

export interface ResidentFlatRow {
  id: string;
  flat_number: string;
  floor_number: number | null;
  flat_type: string | null;
  area_sqft: number | null;
  ownership_type: string | null;
  buildings: {
    id: string;
    building_name: string;
    building_code: string;
  } | null;
}

export interface ResidentRow {
  id: string;
  resident_code: string;
  full_name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  is_primary_contact: boolean | null;
  move_in_date: string | null;
  flats: ResidentFlatRow | ResidentFlatRow[] | null;
}

export interface PendingVisitorRow {
  id: string;
  visitor_name: string;
  phone: string | null;
  purpose: string | null;
  flat_id: string | null;
  flat_label: string | null;
  vehicle_number: string | null;
  photo_url: string | null;
  entry_time: string | null;
  approval_status: string | null;
  approval_deadline_at: string | null;
  is_frequent_visitor: boolean | null;
  rejection_reason: string | null;
}

export interface ApprovalResultRow {
  success?: boolean;
  error?: string;
}

export interface ResidentVisitorRow {
  id: string;
  visitor_name: string;
  visitor_type: string | null;
  phone: string | null;
  vehicle_number: string | null;
  purpose: string | null;
  photo_url: string | null;
  entry_time: string | null;
  exit_time: string | null;
  approved_by_resident: boolean | null;
  is_frequent_visitor: boolean | null;
}

export interface ResidentPendingVisitor extends ResidentVisitorRow {
  approval_status: string | null;
  approval_deadline_at: string | null;
  flat_id: string | null;
  flat_label: string | null;
  rejection_reason: string | null;
}

export interface ResidentPresenceMember {
  residentId: string | null;
  surface: "mobile" | "web" | "unknown";
  userId: string;
  fullName: string;
  joinedAt: string;
}

function getNestedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function splitFullName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);

  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" ") || "",
  };
}

export function mapResidentRow(resident: ResidentRow): ResidentDetails {
  const flat = getNestedRecord(resident.flats);

  return {
    id: resident.id,
    resident_code: resident.resident_code,
    full_name: resident.full_name,
    relation: resident.relation,
    phone: resident.phone,
    email: resident.email,
    is_primary_contact: resident.is_primary_contact,
    move_in_date: resident.move_in_date,
    flat: flat
      ? {
          id: flat.id,
          flat_number: flat.flat_number,
          floor_number: flat.floor_number,
          flat_type: flat.flat_type,
          area_sqft: flat.area_sqft,
          ownership_type: flat.ownership_type,
          building: flat.buildings || null,
        }
      : null,
  };
}

export function mapPendingVisitorRows(rows: PendingVisitorRow[] | null | undefined): ResidentPendingVisitor[] {
  return ((rows ?? []) as PendingVisitorRow[])
    .filter((visitor) => visitor.approval_status === "pending")
    .map((visitor) => ({
      id: visitor.id,
      visitor_name: visitor.visitor_name,
      visitor_type: null,
      phone: visitor.phone,
      vehicle_number: visitor.vehicle_number,
      purpose: visitor.purpose,
      photo_url: visitor.photo_url,
      entry_time: visitor.entry_time,
      exit_time: null,
      approved_by_resident: null,
      is_frequent_visitor: visitor.is_frequent_visitor,
      approval_status: visitor.approval_status,
      approval_deadline_at: visitor.approval_deadline_at,
      flat_id: visitor.flat_id,
      flat_label: visitor.flat_label,
      rejection_reason: visitor.rejection_reason,
    }));
}

export function normalizePresenceMembers(
  state: Record<string, Array<Record<string, unknown>>>,
  currentUserId?: string,
): ResidentPresenceMember[] {
  const members = Object.values(state)
    .flat()
    .map((entry) => {
      const surface: "mobile" | "web" | "unknown" =
        entry.surface === "mobile" || entry.surface === "web" ? entry.surface : "unknown";

      return {
        residentId: typeof entry.residentId === "string" ? entry.residentId : null,
        surface,
        userId: typeof entry.userId === "string" ? entry.userId : "",
        fullName:
          typeof entry.fullName === "string" && entry.fullName.trim().length
            ? entry.fullName.trim()
            : "Resident",
        joinedAt:
          typeof entry.joinedAt === "string" && entry.joinedAt.trim().length
            ? entry.joinedAt
            : new Date().toISOString(),
      };
    })
    .filter((entry) => entry.userId && entry.userId !== currentUserId);

  const deduped = new Map<string, (typeof members)[number]>();

  for (const member of members) {
    const existing = deduped.get(member.userId);

    if (!existing || new Date(member.joinedAt).getTime() > new Date(existing.joinedAt).getTime()) {
      deduped.set(member.userId, member);
    }
  }

  return [...deduped.values()].sort((left, right) => left.fullName.localeCompare(right.fullName));
}

import type { Json } from "@/src/types/supabase";

export interface PestControlPPEVerification {
  id: string;
  job_session_id: string;
  technician_id: string;
  service_request_id: string;
  gloves_worn: boolean;
  mask_worn: boolean;
  goggles_worn: boolean;
  full_suit_worn: boolean;
  chemical_dilution_verified: boolean;
  resident_area_cleared: boolean;
  all_items_checked: boolean;
  verified_at: string;
  status: string;
}

export interface PPEChecklistData {
  gloves_worn: boolean;
  mask_worn: boolean;
  goggles_worn: boolean;
  full_suit_worn: boolean;
  chemical_dilution_verified: boolean;
  resident_area_cleared: boolean;
}

export const PPE_CHECKLIST_ITEMS = [
  { id: "gloves_worn", label: "Gloves worn" },
  { id: "mask_worn", label: "Mask/Respirator worn" },
  { id: "goggles_worn", label: "Safety goggles" },
  { id: "full_suit_worn", label: "Full body suit" },
  { id: "chemical_dilution_verified", label: "Chemical dilution verified" },
  { id: "resident_area_cleared", label: "Resident area cleared" },
] as const;

export function isPpeChecklistComplete(data: PPEChecklistData): boolean {
  return Object.values(data).every((value) => value === true);
}

export function buildPpeChecklistInsert(
  data: PPEChecklistData,
  jobSessionId: string | null,
  serviceRequestId: string | null,
  technicianId: string,
) {
  const allItemsChecked = isPpeChecklistComplete(data);

  return {
    job_session_id: jobSessionId,
    service_request_id: serviceRequestId,
    technician_id: technicianId,
    items_json: {
      gloves_worn: data.gloves_worn,
      mask_worn: data.mask_worn,
      goggles_worn: data.goggles_worn,
      full_suit_worn: data.full_suit_worn,
      chemical_dilution_verified: data.chemical_dilution_verified,
      resident_area_cleared: data.resident_area_cleared,
    } as Json,
    checklist: {
      gloves_worn: data.gloves_worn,
      mask_worn: data.mask_worn,
      goggles_worn: data.goggles_worn,
      full_suit_worn: data.full_suit_worn,
      chemical_dilution_verified: data.chemical_dilution_verified,
      resident_area_cleared: data.resident_area_cleared,
    } as Json,
    gloves_worn: data.gloves_worn,
    mask_worn: data.mask_worn,
    goggles_worn: data.goggles_worn,
    full_suit_worn: data.full_suit_worn,
    chemical_dilution_verified: data.chemical_dilution_verified,
    resident_area_cleared: data.resident_area_cleared,
    all_items_checked: allItemsChecked,
    verified_at: new Date().toISOString(),
    status: allItemsChecked ? "verified" : "failed",
  };
}

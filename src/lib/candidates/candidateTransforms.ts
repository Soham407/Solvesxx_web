import { supabase } from "@/src/lib/supabaseClient";

export type CandidateStatus =
  | "screening"
  | "interviewing"
  | "background_check"
  | "offered"
  | "hired"
  | "rejected";

export interface CandidateTransitionSource {
  status: CandidateStatus;
  bgv_ready_for_offer?: boolean | null;
}

export const CANDIDATE_STATUS_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  screening: ["interviewing", "rejected"],
  interviewing: ["background_check", "rejected"],
  background_check: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

const REQUIRED_BGV_TYPES = ["police", "address", "education", "employment"] as const;

type BackgroundVerificationRow = {
  candidate_id: string | null;
  verification_type: string | null;
  status: string | null;
};

export async function fetchCandidateBgvReadiness(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return new Map<string, boolean>();
  }

  const { data, error } = await supabase
    .from("background_verifications")
    .select("candidate_id, verification_type, status")
    .in("candidate_id", candidateIds)
    .in("verification_type", [...REQUIRED_BGV_TYPES]);

  if (error) {
    throw error;
  }

  const recordsByCandidate = new Map<string, BackgroundVerificationRow[]>();

  for (const row of (data || []) as BackgroundVerificationRow[]) {
    if (!row.candidate_id) {
      continue;
    }

    const existing = recordsByCandidate.get(row.candidate_id) || [];
    existing.push(row);
    recordsByCandidate.set(row.candidate_id, existing);
  }

  return new Map(
    candidateIds.map((candidateId) => {
      const records = recordsByCandidate.get(candidateId) || [];
      const hasAllRequired = REQUIRED_BGV_TYPES.every((type) =>
        records.some((record) => record.verification_type === type && record.status === "verified")
      );
      return [candidateId, hasAllRequired] as const;
    })
  );
}

export const fetchBgvReadiness = fetchCandidateBgvReadiness;

export function canTransitionCandidateStatus(
  candidate: CandidateTransitionSource,
  targetStatus: CandidateStatus
) {
  if (candidate.status === "background_check" && targetStatus === "offered" && candidate.bgv_ready_for_offer !== true) {
    return false;
  }

  return CANDIDATE_STATUS_TRANSITIONS[candidate.status].includes(targetStatus);
}

export interface ServiceFeedback {
  id: string;
  service_request_id: string;
  society_id: string;
  resident_id: string;
  score: number;
  comments: string;
  photo_url: string | null;
  created_at: string;

  resident_name?: string;
  flat_no?: string;
  service_category?: string;
  service_name?: string;
}

export interface VendorScorecard {
  supplier_id: string;
  supplier_name: string;
  service_type: string;
  total_feedbacks: number;
  average_rating: number;
  critical_feedbacks: number;
  performance_status: "Incentivize" | "Warning" | "Standard";
}

export type VendorScorecardRow = {
  supplier_id: string | null;
  supplier_name: string | null;
  service_type: string | null;
  total_feedbacks: number | null;
  average_rating: number | null;
  critical_feedbacks: number | null;
  performance_status: string | null;
};

export type ServiceFeedbackWithJoins = ServiceFeedback & {
  residents?: {
    full_name?: string | null;
    flat_no?: string | null;
  } | null;
  service_requests?: {
    services?: {
      service_name?: string | null;
      service_category?: string | null;
    } | null;
  } | null;
};

export function normalizePerformanceStatus(
  status: string | null,
): VendorScorecard["performance_status"] {
  if (status === "Incentivize" || status === "Warning" || status === "Standard") {
    return status;
  }

  return "Standard";
}

export function mapServiceFeedbackRow(fb: ServiceFeedbackWithJoins): ServiceFeedback {
  return {
    ...fb,
    resident_name: fb.residents?.full_name || "Unknown Resident",
    flat_no: fb.residents?.flat_no || "N/A",
    service_name: fb.service_requests?.services?.service_name || "Unknown Service",
    service_category: fb.service_requests?.services?.service_category || "General",
  };
}

export function mapVendorScorecardRow(scorecard: VendorScorecardRow): VendorScorecard {
  return {
    supplier_id: scorecard.supplier_id ?? "",
    supplier_name: scorecard.supplier_name ?? "Unknown Supplier",
    service_type: scorecard.service_type ?? "Unknown",
    total_feedbacks: scorecard.total_feedbacks ?? 0,
    average_rating: scorecard.average_rating ?? 0,
    critical_feedbacks: scorecard.critical_feedbacks ?? 0,
    performance_status: normalizePerformanceStatus(scorecard.performance_status),
  };
}

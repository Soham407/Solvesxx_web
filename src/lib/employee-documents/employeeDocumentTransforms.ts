export type DocumentType =
  | "aadhar_card"
  | "pan_card"
  | "passport"
  | "driving_license"
  | "voter_id"
  | "bank_passbook"
  | "education_certificate"
  | "experience_certificate"
  | "offer_letter"
  | "relieving_letter"
  | "address_proof"
  | "psara_license"
  | "police_verification"
  | "medical_certificate"
  | "other";

export type DocumentStatus =
  | "pending_upload"
  | "pending_review"
  | "verified"
  | "expired"
  | "rejected";

export interface EmployeeDocument {
  id: string;
  document_code: string;
  employee_id: string;
  document_type: DocumentType;
  document_number: string | null;
  document_name: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: DocumentStatus;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_code?: string;
  verified_by_name?: string;
}

export type EmployeeDocumentRow = EmployeeDocument & {
  employees?: {
    employee_code?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhar_card: "Aadhar Card",
  pan_card: "PAN Card",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  bank_passbook: "Bank Passbook",
  education_certificate: "Education Certificate",
  experience_certificate: "Experience Certificate",
  offer_letter: "Offer Letter",
  relieving_letter: "Relieving Letter",
  address_proof: "Address Proof",
  psara_license: "PSARA License",
  police_verification: "Police Verification",
  medical_certificate: "Medical Certificate",
  other: "Other Document",
};

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  pending_upload: { label: "Pending Upload", className: "bg-muted text-muted-foreground border-border" },
  pending_review: { label: "Pending Review", className: "bg-warning/10 text-warning border-warning/20" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/20" },
  expired: { label: "Expired", className: "bg-critical/10 text-critical border-critical/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

export function mapEmployeeDocumentRow(doc: EmployeeDocumentRow): EmployeeDocument {
  return {
    ...doc,
    employee_name: doc.employees
      ? [doc.employees.first_name, doc.employees.last_name].filter(Boolean).join(" ").trim()
      : "Unknown",
    employee_code: doc.employees?.employee_code || "N/A",
  };
}

export function mapEmployeeDocumentRows(rows: EmployeeDocumentRow[]) {
  return rows.map(mapEmployeeDocumentRow);
}

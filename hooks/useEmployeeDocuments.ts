"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

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

  // Joined data
  employee_name?: string;
  employee_code?: string;
  verified_by_name?: string;
}

export interface UploadDocumentInput {
  employee_id: string;
  document_type: DocumentType;
  document_name: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface UpdateDocumentInput {
  document_name?: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

interface UseEmployeeDocumentsState {
  documents: EmployeeDocument[];
  isLoading: boolean;
  error: string | null;
}

interface UseEmployeeDocumentsFilters {
  employee_id?: string;
  document_type?: DocumentType;
  status?: DocumentStatus;
  expiring_within_days?: number;
}

// Document type display names
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

// Status display configuration
export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  pending_upload: { label: "Pending Upload", className: "bg-muted text-muted-foreground border-border" },
  pending_review: { label: "Pending Review", className: "bg-warning/10 text-warning border-warning/20" },
  verified: { label: "Verified", className: "bg-success/10 text-success border-success/20" },
  expired: { label: "Expired", className: "bg-critical/10 text-critical border-critical/20" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

// ============================================
// HOOK
// ============================================

export function useEmployeeDocuments(initialFilters?: UseEmployeeDocumentsFilters) {
  const [state, setState] = useState<UseEmployeeDocumentsState>({
    documents: [],
    isLoading: true,
    error: null,
  });
  const [filters, setFilters] = useState<UseEmployeeDocumentsFilters>(initialFilters || {});

  // ============================================
  // FETCH DOCUMENTS
  // ============================================
  const fetchDocuments = useCallback(async (filterOverrides?: UseEmployeeDocumentsFilters) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const activeFilters = { ...filters, ...filterOverrides };

      let query = supabase
        .from("employee_documents")
        .select(`
          *,
          employees!employee_id (
            employee_code,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (activeFilters.employee_id) {
        query = query.eq("employee_id", activeFilters.employee_id);
      }
      if (activeFilters.document_type) {
        query = query.eq("document_type", activeFilters.document_type);
      }
      if (activeFilters.status) {
        query = query.eq("status", activeFilters.status);
      }
      if (activeFilters.expiring_within_days) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + activeFilters.expiring_within_days);
        query = query
          .not("expiry_date", "is", null)
          .lte("expiry_date", futureDate.toISOString().split("T")[0])
          .gte("expiry_date", new Date().toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const documentsWithDetails: EmployeeDocument[] = (data || []).map((doc: any) => ({
        ...doc,
        employee_name: doc.employees
          ? [doc.employees.first_name, doc.employees.last_name].filter(Boolean).join(" ").trim()
          : "Unknown",
        employee_code: doc.employees?.employee_code || "N/A",
      }));

      setState({
        documents: documentsWithDetails,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch documents";
      console.error("Error fetching documents:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [filters]);

  // ============================================
  // UPLOAD DOCUMENT
  // ============================================
  const uploadDocument = useCallback(async (
    file: File,
    input: UploadDocumentInput
  ): Promise<EmployeeDocument | null> => {
    try {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Only PDF, JPEG, and PNG files are allowed.");
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File size exceeds 10MB limit.");
      }

      // Generate file path: {employee_id}/{document_type}/{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${input.employee_id}/${input.document_type}/${timestamp}_${sanitizedFileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record in database
      const { data: docData, error: docError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: input.employee_id,
          document_type: input.document_type,
          document_name: input.document_name,
          document_number: input.document_number,
          file_path: uploadData.path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          issue_date: input.issue_date,
          expiry_date: input.expiry_date,
          status: "pending_review",
          notes: input.notes,
        })
        .select()
        .single();

      if (docError) {
        // Rollback: delete uploaded file
        await supabase.storage.from("employee-documents").remove([uploadData.path]);
        throw docError;
      }

      // Refresh list
      await fetchDocuments();

      return docData as EmployeeDocument;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload document";
      console.error("Error uploading document:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchDocuments]);

  // ============================================
  // UPDATE DOCUMENT
  // ============================================
  const updateDocument = useCallback(async (
    id: string,
    input: UpdateDocumentInput
  ): Promise<EmployeeDocument | null> => {
    try {
      const { data, error } = await supabase
        .from("employee_documents")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchDocuments();

      return data as EmployeeDocument;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update document";
      console.error("Error updating document:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchDocuments]);

  // ============================================
  // DELETE DOCUMENT
  // ============================================
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Get document to find file path
      const doc = state.documents.find((d) => d.id === id);
      if (!doc) {
        throw new Error("Document not found");
      }

      // Delete from database first
      const { error: dbError } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // Delete file from storage
      if (doc.file_path) {
        await supabase.storage.from("employee-documents").remove([doc.file_path]);
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== id),
      }));

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete document";
      console.error("Error deleting document:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, [state.documents]);

  // ============================================
  // VERIFY DOCUMENT
  // ============================================
  const verifyDocument = useCallback(async (
    id: string,
    notes?: string
  ): Promise<EmployeeDocument | null> => {
    try {
      const { data, error } = await supabase
        .from("employee_documents")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          // verified_by is set by RLS/trigger based on auth.uid()
          notes: notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchDocuments();

      return data as EmployeeDocument;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify document";
      console.error("Error verifying document:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchDocuments]);

  // ============================================
  // REJECT DOCUMENT
  // ============================================
  const rejectDocument = useCallback(async (
    id: string,
    rejectionReason: string
  ): Promise<EmployeeDocument | null> => {
    try {
      if (!rejectionReason.trim()) {
        throw new Error("Rejection reason is required");
      }

      const { data, error } = await supabase
        .from("employee_documents")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Refresh list
      await fetchDocuments();

      return data as EmployeeDocument;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject document";
      console.error("Error rejecting document:", err);
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [fetchDocuments]);

  // ============================================
  // GET EXPIRING DOCUMENTS
  // ============================================
  const getExpiringDocuments = useCallback(async (
    withinDays: number = 30
  ): Promise<EmployeeDocument[]> => {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + withinDays);
      const today = new Date().toISOString().split("T")[0];
      const future = futureDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("employee_documents")
        .select(`
          *,
          employees!employee_id (
            employee_code,
            first_name,
            last_name
          )
        `)
        .eq("status", "verified")
        .not("expiry_date", "is", null)
        .gte("expiry_date", today)
        .lte("expiry_date", future)
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((doc: any) => ({
        ...doc,
        employee_name: doc.employees
          ? [doc.employees.first_name, doc.employees.last_name].filter(Boolean).join(" ").trim()
          : "Unknown",
        employee_code: doc.employees?.employee_code || "N/A",
      }));
    } catch (err: unknown) {
      console.error("Error fetching expiring documents:", err);
      return [];
    }
  }, []);

  // ============================================
  // GET DOWNLOAD URL
  // ============================================
  const getDownloadUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;

      return data.signedUrl;
    } catch (err: unknown) {
      console.error("Error getting download URL:", err);
      return null;
    }
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getDocumentById = useCallback(
    (id: string): EmployeeDocument | undefined => {
      return state.documents.find((d) => d.id === id);
    },
    [state.documents]
  );

  const getDocumentsByEmployee = useCallback(
    (employeeId: string): EmployeeDocument[] => {
      return state.documents.filter((d) => d.employee_id === employeeId);
    },
    [state.documents]
  );

  const getStatusStats = useCallback((): Record<DocumentStatus, number> => {
    const stats: Record<DocumentStatus, number> = {
      pending_upload: 0,
      pending_review: 0,
      verified: 0,
      expired: 0,
      rejected: 0,
    };

    state.documents.forEach((d) => {
      if (d.status in stats) {
        stats[d.status]++;
      }
    });

    return stats;
  }, [state.documents]);

  const formatFileSize = useCallback((bytes: number | null): string => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const refresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ============================================
  // GET REQUIRED DOCUMENT STATUS
  // Returns compliance status for an employee's required documents
  // ============================================
  const getRequiredDocumentStatus = useCallback(async (
    employeeId: string,
    requiredTypes: DocumentType[] = [
      "aadhar_card",
      "pan_card",
      "bank_passbook",
      "address_proof",
      "police_verification",
    ]
  ): Promise<{
    complete: boolean;
    verified: number;
    pending: number;
    missing: number;
    expired: number;
    documents: Record<DocumentType, {
      status: DocumentStatus | "missing";
      document?: EmployeeDocument;
      expiresInDays?: number;
    }>;
  }> => {
    try {
      // Fetch documents for this employee
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employeeId)
        .in("document_type", requiredTypes);

      if (error) throw error;

      const documentsByType: Record<string, EmployeeDocument[]> = {};
      (data || []).forEach((doc: any) => {
        if (!documentsByType[doc.document_type]) {
          documentsByType[doc.document_type] = [];
        }
        documentsByType[doc.document_type].push(doc as EmployeeDocument);
      });

      const result: {
        complete: boolean;
        verified: number;
        pending: number;
        missing: number;
        expired: number;
        documents: Record<DocumentType, {
          status: DocumentStatus | "missing";
          document?: EmployeeDocument;
          expiresInDays?: number;
        }>;
      } = {
        complete: false,
        verified: 0,
        pending: 0,
        missing: 0,
        expired: 0,
        documents: {} as Record<DocumentType, {
          status: DocumentStatus | "missing";
          document?: EmployeeDocument;
          expiresInDays?: number;
        }>,
      };

      const today = new Date();

      for (const docType of requiredTypes) {
        const docs = documentsByType[docType] || [];
        
        if (docs.length === 0) {
          // Missing document
          result.missing++;
          result.documents[docType] = { status: "missing" };
        } else {
          // Get the most recent document of this type
          const latestDoc = docs.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          // Check if expired
          let expiresInDays: number | undefined;
          if (latestDoc.expiry_date) {
            const expiryDate = new Date(latestDoc.expiry_date);
            expiresInDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          // Determine status
          if (latestDoc.status === "verified") {
            // Check if expired
            if (expiresInDays !== undefined && expiresInDays <= 0) {
              result.expired++;
              result.documents[docType] = {
                status: "expired",
                document: latestDoc,
                expiresInDays,
              };
            } else {
              result.verified++;
              result.documents[docType] = {
                status: "verified",
                document: latestDoc,
                expiresInDays,
              };
            }
          } else if (latestDoc.status === "expired") {
            result.expired++;
            result.documents[docType] = {
              status: "expired",
              document: latestDoc,
              expiresInDays,
            };
          } else {
            // pending_upload, pending_review, or rejected
            result.pending++;
            result.documents[docType] = {
              status: latestDoc.status,
              document: latestDoc,
              expiresInDays,
            };
          }
        }
      }

      // Complete only if all required documents are verified and not expired
      result.complete = result.verified === requiredTypes.length && result.expired === 0;

      return result;
    } catch (err: unknown) {
      console.error("Error checking required document status:", err);
      // Return empty result on error
      return {
        complete: false,
        verified: 0,
        pending: 0,
        missing: requiredTypes.length,
        expired: 0,
        documents: requiredTypes.reduce((acc, type) => {
          acc[type] = { status: "missing" };
          return acc;
        }, {} as Record<DocumentType, { status: DocumentStatus | "missing" }>),
      };
    }
  }, []);

  // ============================================
  // EFFECT: Initial fetch
  // ============================================
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    documents: state.documents,
    isLoading: state.isLoading,
    error: state.error,

    // CRUD
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,

    // Actions
    verifyDocument,
    rejectDocument,
    getExpiringDocuments,
    getDownloadUrl,
    getRequiredDocumentStatus,

    // Helpers
    getDocumentById,
    getDocumentsByEmployee,
    getStatusStats,
    formatFileSize,

    // Filters
    filters,
    setFilters,

    // Refresh
    refresh,
  };
}

export default useEmployeeDocuments;

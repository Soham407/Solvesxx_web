# Operational Truth: Implementation Plan

## 🎯 Objective
To transform the Facility Management Platform into a **Truth Engine** where data cannot exist without verifiable evidence. This initiative eliminates "Last Mile" manual entry fraud and ensures system integrity.

## 🏗️ Implementation Phases

### Phase A: Gate Entry Proof (Logistics)
- **Problem**: Materials were logged manually without proof of arrival.
- **Solution**: 
  - Mandatory photo capture of vehicle/materials.
  - Integration with `log_gate_entry` RPC.
  - Field removal: Deleted subjective "Notes" and "Location" text fields; documented arrival is now strictly evidence-based.

### Phase B: Service Task Evidence (Operations)
- **Problem**: "Ghost" servicing where tasks are marked complete without work being done.
- **Solution**:
  - **Start Gate**: Mandatory "Before" photo via `start_service_task` RPC.
  - **Complete Gate**: Mandatory "After" photo and resolution notes via `complete_service_task` RPC.
  - **UX Fix**: Isolated modal inputs to prevent accidental evidence cross-contamination.

### Phase C: Financial Reconciliation (Finance)
- **Problem**: Payouts occurring without verifying if the bill matches the physical arrival.
- **Solution**:
  - **3-Way Match RPC**: Automatic server-side comparison of PO Amount, GRN Quantity, and Bill Amount.
  - **Hard Gate**: UI "Record Payout" button is disabled unless the Match status is `matched` or `force_matched`.

### Phase D: HRMS Compliance (Personnel)
- **Problem**: Staff onboarded without proper background verification documents.
- **Solution**:
  - Mandatory BGV Document upload to `staff-compliance-docs` storage bucket.
  - Status transition gate: Cannot move to `background_check` status without document evidence.
  - Truthful Payslips: Client-side PDF generation of verified payroll data.

### Phase E: System Hardening (Architecture)
- **Problem**: Technical debt and loose typing.
- **Solution**:
  - Strict TypeScript interfaces for all "Truth" hooks.
  - Global `URL.revokeObjectURL` cleanup for photo previews.
  - Explicit storage bucket mapping for audit trails.

## 🛠️ Evidence Storage Strategy
| Type | Bucket | Entity Link |
| :--- | :--- | :--- |
| Material Arrival | `material-arrivals` | `material_arrival_evidence.photo_url` |
| Service Submissions | `service-evidence` | `service_requests.before/after_photo` |
| HR Documents | `staff-compliance-docs` | `candidates.bgv_document_url` |
| Attendance | `attendance-selfies` | `attendance_logs.selfie_url` |

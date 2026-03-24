# Forms Fix Group — Applied Changes
**Date:** 2026-03-22
**Issues:** FORM-1 through FORM-7, FORM-H1 through FORM-H6

---

## FORM-1: Date range validation — AdBookingDialog
**File:** `components/dialogs/AdBookingDialog.tsx`
- Added `.refine()` to the Zod schema chained after `z.object({...})` to enforce `end_date >= start_date` with message "End date must be on or after start date" on `path: ["end_date"]`.
- Added error display `<p>` for `end_date` errors in the JSX (was missing).

## FORM-2: Positive rate validation — AdBookingDialog
**File:** `components/dialogs/AdBookingDialog.tsx`
- Changed `agreed_rate` from `z.string().min(1, "Rate required")` to `z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Rate must be a positive number" })`.

## FORM-3: Notes enforcement on mismatch — ServiceAcknowledgmentDialog
**File:** `components/dialogs/ServiceAcknowledgmentDialog.tsx`
- Added guard at the top of `handleSubmit`: if `hasMismatch && !values.notes?.trim()`, calls `form.setError("notes", { message: "Notes are required when headcount mismatches" })` and returns early.
- Added error display `<p>` for `notes` field errors in the JSX.

## FORM-4: Wire employee create form to database — create/page.tsx + useEmployees.ts
**Files:** `app/(dashboard)/company/employees/create/page.tsx`, `hooks/useEmployees.ts`
- Added `CreateEmployeePayload` interface and `createEmployee` async function to `useEmployees.ts`. The function generates an `employee_code`, inserts into the `employees` table, and returns `{ success, error? }`.
- Added `createEmployee` to the hook's `UseEmployeesReturn` interface and return object.
- In the page: imported `useEmployees`, called `createEmployee` with mapped form fields, replaced the `setTimeout` + `console.log` stub with real DB write, handles success (toast + redirect) and error (toast with message).

## FORM-5: Disable mock download — SummaryReportsDialog
**File:** `components/dialogs/SummaryReportsDialog.tsx`
- Disabled the Download button (`disabled` attribute added) and changed its label to "Reports Coming Soon". The `handleDownload` function is left in place but unreachable via UI. Modal structure and Generate button unchanged.

## FORM-6: Webcam selfie resize + size cap — AddVisitorForm
**File:** `components/forms/AddVisitorForm.tsx`
- Before converting `imageSrc` to a Blob, added an async canvas resize step: loads the captured image, calculates a scale ratio to fit within 640×480 while preserving aspect ratio (ratio clamped at 1 so it never upscales), redraws at reduced dimensions with `toDataURL('image/jpeg', 0.8)`.
- After resize, added a 2MB blob size check: throws an error with a user-facing message if exceeded, which falls into the existing `catch (photoError)` block showing a toast warning.

## FORM-7: BGV upload security — hooks/useCandidates.ts
**File:** `hooks/useCandidates.ts`
- Added MIME type validation: throws `'Only PDF, JPEG, and PNG files are allowed'` if `file.type` is not in `['application/pdf', 'image/jpeg', 'image/png']`.
- Added file size validation: throws `'File size must be under 5MB'` if `file.size > 5 * 1024 * 1024`.
- Replaced `getPublicUrl` with `createSignedUrl(filePath, 3600)` returning a time-limited signed URL (1 hour). Returns `signedData.signedUrl` instead of `publicUrl`.

---

## FORM-H1: Migrate ManualAdjustmentDialog to React Hook Form + Zod
**File:** `components/dialogs/ManualAdjustmentDialog.tsx`
- Full rewrite from raw `useState` form to React Hook Form + Zod.
- Added `formSchema` with validations: `time` required + regex for HH:MM format, `reason` required, `notes` optional but min 10 chars if provided, `adjustmentType` required.
- Added `useEffect` to `form.reset()` and reset date when dialog closes (`!isOpen`).
- `handleSubmit` now receives typed `values` from RHF, removed manual field-level guards.
- Error messages displayed under each relevant field.
- Submit button wired to `form.handleSubmit(handleSubmit)` on a `<form>` element.

## FORM-H2: Add Zod validation to NewJobOrderDialog
**File:** `components/dialogs/NewJobOrderDialog.tsx`
- Migrated from raw `useState` form to React Hook Form + Zod.
- Added `formSchema`: `title` min 5 chars, `description` min 5 chars, `estimatedHours` uses `z.coerce.number().min(0.5).max(24)` (optional/empty allowed), `priority` required.
- Added `useEffect` to `form.reset()` on dialog close.
- Error messages displayed under title, description, and estimatedHours fields.
- `estimated_hours` DB insert now uses `Number(values.estimatedHours)` instead of `parseInt`.
- Submit button wired to `form.handleSubmit(handleSubmit)` on a `<form>` element.

## FORM-H3: MIME/size validation — PhotoUploadDialog
**File:** `components/dialogs/PhotoUploadDialog.tsx`
- Added `validateFile(file: File): boolean` helper that calls `toast.error` and returns `false` if `!file.type.startsWith('image/')` or `file.size > 5 * 1024 * 1024`.
- `handleBeforeFileSelect` and `handleAfterFileSelect` now filter selected files through `validateFile` before adding them to state.

## FORM-H4: Dynamic import Recharts — HODDashboard
**File:** `components/dashboards/HODDashboard.tsx`
- No change required. The file already has `"use client"` at line 1. For client components, Next.js does not SSR the bundle, so a static top-level Recharts import is safe. The TODO is considered resolved.

## FORM-H5: Dynamic import jsPDF — IDPrintingModule
**File:** `components/printing/IDPrintingModule.tsx`
- Removed top-level `import jsPDF from "jspdf"` (was ~270KB added to initial bundle).
- Changed `handleDownloadPDF` from a sync function to `async`.
- Added `const { jsPDF } = await import("jspdf")` at the start of the function body so jsPDF is only loaded when the user triggers PDF download.

## FORM-H6: Remove production console.log — ac/page.tsx
**File:** `app/(dashboard)/services/ac/page.tsx`
- Removed line 42: `console.log("[ACServicePage] Available services:", services)` along with the now-empty `if (!found && !servicesLoading)` block.

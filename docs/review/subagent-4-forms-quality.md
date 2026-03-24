# Forms & Frontend Quality Review
**FacilityPro — enterprise-canvas-main**
**Reviewer:** Subagent 4 (Frontend Quality)
**Date:** 2026-03-21

---

## SUMMARY — Top 20 Critical/High Issues

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 CRITICAL | `components/dialogs/AdBookingDialog.tsx` (L20–26) | No cross-field date validation: `end_date >= start_date` not enforced — a booking with end before start is silently accepted |
| 2 | 🔴 CRITICAL | `components/dialogs/ServiceAcknowledgmentDialog.tsx` (L31) | Notes field is `optional()` even when `hasMismatch === true`; headcount discrepancy note can be skipped silently |
| 3 | 🔴 CRITICAL | `components/dialogs/AdBookingDialog.tsx` (L24) | `agreed_rate` accepts negative values — Zod validates only `.min(1)` on string length, not numeric minimum > 0 |
| 4 | 🔴 CRITICAL | `app/(dashboard)/company/employees/create/page.tsx` (L27,L43–46) | Form submits via `console.log` and a mocked `setTimeout` — no real Supabase write; employee is never persisted |
| 5 | 🔴 CRITICAL | `components/dialogs/SummaryReportsDialog.tsx` (L67,L86–87) | Report generation is entirely mocked (`setTimeout` + hardcoded CSV); no real data is fetched or exported |
| 6 | 🔴 CRITICAL | `components/forms/AddVisitorForm.tsx` (L199–222) | Visitor selfie captured from webcam is uploaded as raw full-resolution JPEG with no file-size cap (only 0.8 quality factor on `toDataURL`) |
| 7 | 🔴 CRITICAL | `hooks/useCandidates.ts` (L643–661) | `uploadBGVDocument` does not validate MIME type or file size before uploading to `staff-compliance-docs` bucket; uses `getPublicUrl` (permanent public URL) for sensitive compliance documents |
| 8 | 🟠 HIGH | `components/dialogs/ManualAdjustmentDialog.tsx` | No React Hook Form / Zod used — raw `useState` form with only minimal field-presence check; no type/format validation on time input; form state is NOT reset on dialog close (only on successful submit) |
| 9 | 🟠 HIGH | `components/dialogs/NewJobOrderDialog.tsx` | No React Hook Form / Zod — inline string check only; `estimated_hours` accepts negative numbers (`parseInt` with no min); form state NOT reset if dialog is closed via backdrop/Escape |
| 10 | 🟠 HIGH | `components/dialogs/ScheduleVisitDialog.tsx` | No phone validation on `contactPhone` field; any freetext passes through to `service_requests` table |
| 11 | 🟠 HIGH | `components/dialogs/PhotoUploadDialog.tsx` (L41–53) | No MIME type or file size validation before upload to `service-evidence` bucket; any file type accepted (only `accept="image/*"` hint, not enforced) |
| 12 | 🟠 HIGH | `hooks/useJobPhotos.ts` (L77–89) | Job photo upload has no MIME validation or size cap; URL exposed as permanent public URL via `getPublicUrl` |
| 13 | 🟠 HIGH | `components/dialogs/BuyerFeedbackDialog.tsx` (L97–104) | `overall_rating` defaults to `0` which fails `.min(1)` — but no `useEffect` to reset form on dialog re-open; stale rating from previous submission shown if dialog reopened |
| 14 | 🟠 HIGH | `app/(dashboard)/company/employees/create/page.tsx` (L27) | Phone validated only with `.min(10)` — no regex enforcing Indian format (+91, 10 digits); accepts "1234567890" for any locale |
| 15 | 🟠 HIGH | `components/dialogs/ServiceDeliveryNoteDialog.tsx` (L29) | Personnel `contact` validated with `.min(10)` only — no regex enforcing 10-digit Indian mobile; international or malformed numbers pass |
| 16 | 🟠 HIGH | `components/dashboards/HODDashboard.tsx` (L3) | Recharts imported at top-level (not dynamic import) in a client component; adds ~180KB to initial bundle for all users who see HODDashboard |
| 17 | 🟠 HIGH | `components/printing/IDPrintingModule.tsx` (L20) | `jsPDF` imported at top-level (not dynamic import); adds ~270KB to initial bundle regardless of whether user ever prints an ID |
| 18 | 🟠 HIGH | `components/dashboards/GuardDashboard.tsx` (L524) | Evidence upload max size is 10MB — far too large for browser uploads; recommend 5MB cap; selfie max is also 10MB with no client-side resize |
| 19 | 🟠 HIGH | `app/(dashboard)/services/ac/page.tsx` (L42) | `console.log("[ACServicePage] Available services:", services)` leaks internal service data structure to browser console in production |
| 20 | 🟠 HIGH | Multiple icon-only `<Button size="icon">` elements across `app/(dashboard)/` | Dozens of icon-only action buttons (edit, delete, download, back navigation) have no `aria-label` — screen reader users get no context |

---

## PART A — FORM VALIDATION AUDIT

### A1. AdBookingDialog
**File:** `components/dialogs/AdBookingDialog.tsx`

---

🔴 CRITICAL
**File:** `components/dialogs/AdBookingDialog.tsx` (line 20–26)
**Issue:** Date range `end_date >= start_date` not validated. The Zod schema has two separate `.min(1)` string checks but no cross-field `.refine()` to ensure the end date is on or after the start date. A booking with end date before start date is silently submitted.
**Fix:** Add `z.object({...}).refine(data => data.end_date >= data.start_date, { message: "End date must be on or after start date", path: ["end_date"] })` after the object definition.

---

🔴 CRITICAL
**File:** `components/dialogs/AdBookingDialog.tsx` (line 24, 68)
**Issue:** `agreed_rate` field uses `z.string().min(1)` — validates only that the string is non-empty. Negative rates are silently accepted and converted to negative paise via `Math.round(parseFloat(values.agreed_rate) * 100)`. No minimum numeric value enforced.
**Fix:** Change to `z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "Rate must be a positive number" })` or use `z.coerce.number().min(0.01, "Rate must be positive")`.

---

### A2. BuyerFeedbackDialog
**File:** `components/dialogs/BuyerFeedbackDialog.tsx`

---

🟡 MEDIUM
**File:** `components/dialogs/BuyerFeedbackDialog.tsx` (line 97–104)
**Issue:** `overall_rating` defaults to `0` which fails the Zod `.min(1)` constraint. However, there is no `useEffect` to reset the form when the dialog is reopened. If a user submits feedback, closes the dialog, and reopens it (for a different request), the form retains the previous rating values.
**Fix:** Add a `useEffect(() => { if (open) form.reset(); }, [open])` inside the component, or use `key={open ? requestId : undefined}` on the form to force remount.

---

🟢 LOW
**File:** `components/dialogs/BuyerFeedbackDialog.tsx` (line 41–76)
**Issue:** Star rating `<button>` elements inside `StarRating` component have no `aria-label` per star value. Screen reader users cannot determine which star they are clicking.
**Fix:** Add `aria-label={`Rate ${star} out of 5`}` to each star button.

---

### A3. ServiceAcknowledgmentDialog
**File:** `components/dialogs/ServiceAcknowledgmentDialog.tsx`

---

🔴 CRITICAL
**File:** `components/dialogs/ServiceAcknowledgmentDialog.tsx` (line 31, 185–220)
**Issue:** `notes` field is `z.string().optional()` in the Zod schema. The UI displays a warning when `hasMismatch === true` and changes the placeholder text to say "Required: explain the headcount discrepancy…", but the Zod schema does NOT enforce this requirement — a user can submit with a mismatch and empty notes. The validation logic lives only in the UI placeholder, not in the schema.
**Fix:** Use `z.object({...}).superRefine((data, ctx) => { if (expectedHeadcount !== null && Number(data.headcount_received) !== expectedHeadcount && !data.notes?.trim()) { ctx.addIssue({ code: "custom", message: "Notes are required when headcount mismatches", path: ["notes"] }) } })`. Since `expectedHeadcount` is state not schema, you may need to pass it into the validation or use `form.setError` manually in `handleSubmit` before the API call.

---

🟡 MEDIUM
**File:** `components/dialogs/ServiceAcknowledgmentDialog.tsx` (line 73–91)
**Issue:** The component runs an inline Supabase query inside `useEffect` directly (not through a hook). This violates the project convention "Pages should NEVER have inline Supabase queries" and makes the component harder to test and maintain.
**Fix:** Move the SPO items fetch into a dedicated hook (e.g., `useServicePurchaseOrderItems(spoId)`).

---

### A4. ServiceDeliveryNoteDialog
**File:** `components/dialogs/ServiceDeliveryNoteDialog.tsx`

---

🟠 HIGH
**File:** `components/dialogs/ServiceDeliveryNoteDialog.tsx` (line 29)
**Issue:** Personnel `contact` field validated with `.min(10, "Valid contact required")` only. This passes any 10+ character string (e.g., "1234567890", "+1 555-1234", "abcde12345"). For an Indian facility management app, 10-digit Indian mobile numbers should be enforced.
**Fix:** Change to `z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")` or `z.string().regex(/^\+91[6-9]\d{9}$|^[6-9]\d{9}$/, "Enter a valid Indian mobile number")`.

---

🟡 MEDIUM
**File:** `components/dialogs/ServiceDeliveryNoteDialog.tsx` (line 55)
**Issue:** `isSubmitting` state is managed manually with `useState` rather than via `form.formState.isSubmitting`. This means if an error is thrown in `handleSubmit` before `setIsSubmitting(true)`, the button will not show loading state.
**Fix:** Remove `const [isSubmitting, setIsSubmitting] = useState(false)` and use `form.formState.isSubmitting` directly, or use the hook's built-in loading state.

---

### A5. Employee Create Form
**File:** `app/(dashboard)/company/employees/create/page.tsx`

---

🔴 CRITICAL
**File:** `app/(dashboard)/company/employees/create/page.tsx` (line 42–46)
**Issue:** The `onSubmit` handler contains `await new Promise(resolve => setTimeout(resolve, 1500))` followed by `console.log(data)` — this is a stub with no database write. Employee data is never persisted to Supabase. The form gives the user a success toast and redirects, but no record is created.
**Fix:** Replace the stub with a real Supabase insert using the appropriate hook (e.g., `useEmployees().createEmployee(data)`), following the project hook pattern.

---

🟠 HIGH
**File:** `app/(dashboard)/company/employees/create/page.tsx` (line 27)
**Issue:** Phone validated only with `.min(10, "Invalid phone number")`. The placeholder shows "+91 98765 43210" suggesting Indian phone numbers, but no regex validation enforces the format. Any 10+ character string passes.
**Fix:** Add regex validation: `z.string().regex(/^\+91[6-9]\d{9}$|^[6-9]\d{9}$/, "Enter a valid Indian phone number (+91 XXXXXXXXXX)")`.

---

🟡 MEDIUM
**File:** `app/(dashboard)/company/employees/create/page.tsx` (line 45)
**Issue:** `console.log(data)` in production submit handler leaks PII (employee name, email, phone) to browser console.
**Fix:** Remove the `console.log(data)` statement entirely.

---

### A6. ManualAdjustmentDialog
**File:** `components/dialogs/ManualAdjustmentDialog.tsx`

---

🟠 HIGH
**File:** `components/dialogs/ManualAdjustmentDialog.tsx` (lines 35–124)
**Issue:** No React Hook Form or Zod validation. Validation is a minimal `if (!formData.employeeId || !formData.time || !formData.reason)` check only. No format validation on `time` (could be empty string passed to DB), no constraint on date (future dates accepted for attendance adjustments).
**Fix:** Migrate to `useForm` with `zodResolver`. Add `z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format")` for time, and restrict date to not be in the future for attendance records.

---

🟠 HIGH
**File:** `components/dialogs/ManualAdjustmentDialog.tsx` (line 116)
**Issue:** On successful submit, the dialog closes (`setIsOpen(false)`) but `formData` state is NOT reset. If the user opens the dialog again, the previous time/notes/reason values are still populated.
**Fix:** After `setIsOpen(false)`, add `setFormData({ employeeId: employeeId || "", adjustmentType: "checkin", time: "", reason: "", notes: "" })` and `setDate(new Date())`.

---

### A7. NewJobOrderDialog
**File:** `components/dialogs/NewJobOrderDialog.tsx`

---

🟠 HIGH
**File:** `components/dialogs/NewJobOrderDialog.tsx` (lines 47–55, 175)
**Issue:** No React Hook Form or Zod. Validation checks only `title` and `description` presence. `estimatedHours` accepts any string parsed with `parseInt` — a negative number (e.g., `-5`) is silently inserted into the DB.
**Fix:** Migrate to `useForm` + Zod. Add `z.coerce.number().min(0).optional()` for `estimatedHours`.

---

🟡 MEDIUM
**File:** `components/dialogs/NewJobOrderDialog.tsx` (line 88–96)
**Issue:** Catch block swallows the actual Supabase error message: `toast({ description: "Failed to create job order. Please try again." })`. The user cannot see the actual cause (e.g., missing FK, schema mismatch).
**Fix:** Replace with `toast({ description: err instanceof Error ? err.message : "Failed to create job order" })`.

---

### A8. ScheduleVisitDialog
**File:** `components/dialogs/ScheduleVisitDialog.tsx`

---

🟠 HIGH
**File:** `components/dialogs/ScheduleVisitDialog.tsx` (lines 41–103)
**Issue:** No phone validation whatsoever on `contactPhone`. It is an uncontrolled freetext input inserted directly into `service_requests.contact_phone`. Any string including empty is accepted.
**Fix:** Add validation: either migrate to React Hook Form + Zod with `z.string().regex(/^[6-9]\d{9}$/).optional()`, or add a manual check in `handleSubmit`.

---

🟡 MEDIUM
**File:** `components/dialogs/ScheduleVisitDialog.tsx` (line 52)
**Issue:** Validation only checks `date` and `location` — `contactPerson` is not validated at all and can be empty string, which is inserted as empty into `contact_person` column.
**Fix:** Add a minimum check: `if (!formData.contactPerson.trim()) { ... }`.

---

### A9. SummaryReportsDialog
**File:** `components/dialogs/SummaryReportsDialog.tsx`

---

🔴 CRITICAL
**File:** `components/dialogs/SummaryReportsDialog.tsx` (line 62–103)
**Issue:** The entire report generation is mocked. `handleGenerate` simulates with `setTimeout(2000)`. `handleDownload` creates a hardcoded CSV with "Sample Value" for every metric. No real data is fetched. Users believe they are downloading reports with real data, but all values are placeholders.
**Fix:** Connect to actual data sources through existing hooks (e.g., `useTickets`, `useAttendance`, `useFinanceReports`) or remove this dialog until real report generation is implemented. At minimum, add a visible "DEMO DATA" disclaimer.

---

---

## PART B — DIALOG COMPONENT AUDIT

### B1. AdBookingDialog
**File:** `components/dialogs/AdBookingDialog.tsx`

- Submit button shows loading state: YES (`disabled={isSubmitting}` + spinner)
- Dialog closes after successful mutation: YES (`onOpenChange(false)` on `result.success`)
- Form resets after close: PARTIAL — resets only on successful submit; if user closes via Cancel or backdrop, no reset occurs (`useEffect` missing)
- Error shown inside dialog: NO — errors from `createBooking` are handled by the hook's toast, but the dialog itself shows no inline error message

---

🟡 MEDIUM
**File:** `components/dialogs/AdBookingDialog.tsx`
**Issue:** Form state not reset when dialog is dismissed without submitting (Cancel button, backdrop click). Stale data from previous session is shown on reopen.
**Fix:** Add `useEffect(() => { if (!open) form.reset(); }, [open])`.

---

### B2. BuyerFeedbackDialog
**File:** `components/dialogs/BuyerFeedbackDialog.tsx`

- Submit button shows loading state: YES (`disabled={isSubmitting}`)
- Dialog closes after successful mutation: YES
- Form resets after close: PARTIAL — resets on submit success only, not on close without submit
- Error shown inside dialog: NO — relies on hook's internal toast

---

### B3. ServiceDeliveryNoteDialog
**File:** `components/dialogs/ServiceDeliveryNoteDialog.tsx`

- Submit button shows loading state: YES
- Dialog closes after successful mutation: YES
- Form resets after close: PARTIAL — resets on success only, not on cancel/backdrop close
- Error shown inside dialog: NO — errors are swallowed by the hook's toast

---

### B4. ServiceAcknowledgmentDialog
**File:** `components/dialogs/ServiceAcknowledgmentDialog.tsx`

- Submit button shows loading state: YES (`disabled={isSubmitting || isLoadingItems}`)
- Dialog closes after successful mutation: YES
- Form resets after close: YES (via `useEffect` on `!open`)
- Error shown inside dialog: YES (`toast({ variant: "destructive" })` is called and visible)
- PASS

---

### B5. ManualAdjustmentDialog
**File:** `components/dialogs/ManualAdjustmentDialog.tsx`

- Submit button shows loading state: YES (Loader2 spinner)
- Dialog closes after successful mutation: YES (`setIsOpen(false)`)
- Form resets after close: NO — state is not reset when dialog closes via Cancel or backdrop
- Error shown inside dialog: YES (toast destructive)

---

🟠 HIGH (repeated from A6)
**Issue:** Form state not reset on dialog close. See A6 fix above.

---

### B6. NewJobOrderDialog
**File:** `components/dialogs/NewJobOrderDialog.tsx`

- Submit button shows loading state: YES
- Dialog closes after successful mutation: YES
- Form resets after close: PARTIAL — state is reset on successful submit only
- Error shown inside dialog: NO — generic message hides actual Supabase errors

---

### B7. ScheduleVisitDialog
**File:** `components/dialogs/ScheduleVisitDialog.tsx`

- Submit button shows loading state: YES (Loader2)
- Dialog closes after successful mutation: YES
- Form resets after close: YES — state is reset after `setIsOpen(false)` on success
- Error shown inside dialog: NO — generic catch toast

---

### B8. PhotoUploadDialog
**File:** `components/dialogs/PhotoUploadDialog.tsx`

- Submit button shows loading state: YES
- Dialog closes after successful upload: YES
- Form resets after close: YES — photos array reset on success
- Error shown inside dialog: YES (toast)

---

### B9. PPEChecklistDialog
**File:** `components/dialogs/PPEChecklistDialog.tsx`

- Submit button shows loading state: YES
- Dialog closes after successful submission: YES
- Form resets after close: YES — PPE items reset on success
- Error shown inside dialog: YES (toast)

---

### B10. SummaryReportsDialog
**File:** `components/dialogs/SummaryReportsDialog.tsx`

- Submit button shows loading state: YES (simulated)
- Dialog closes after generation: NO — dialog stays open, user must manually close
- Form resets after close: N/A
- Error shown inside dialog: NO (generic toast)
- NOTE: Entire dialog generates mock data — see CRITICAL issue in Part A.

---

---

## PART C — LARGE FILE DETECTION

### C1. Files with 10+ Hook Imports

🟡 MEDIUM
**File:** `components/dashboards/GuardDashboard.tsx` (1325 lines)
**Issue:** Imports 10 hooks (`useAttendance`, `usePanicAlert`, `useGuardVisitors`, `useGuardChecklist`, `useGuardShift`, `useEmployeeProfile`, `useAuth`, `useEmergencyContacts`, `useInactivityMonitor`, plus hooks from inline queries). Contains 1325 lines of JSX including camera capture, panic SOS, evidence upload, and shift management all in a single file.
**Fix:** Split into sub-components: `GuardShiftPanel`, `GuardPanicSOS`, `GuardVisitorLog`, `GuardSelfieCapture`.

---

🟡 MEDIUM
**File:** `app/(dashboard)/inventory/indents/create/page.tsx` (1284 lines)
**Issue:** Imports 7 hooks with 1284 lines. Very large form page combining indent creation, supplier selection, product lookup, employee selection, and society selection. Multiple nested dialogs inside a single page component.
**Fix:** Extract `IndentLineItemsForm`, `IndentSupplierSelector`, and `IndentSummaryPanel` as separate components.

---

🟡 MEDIUM
**File:** `app/(dashboard)/inventory/indents/verification/page.tsx` (1089 lines)
**Issue:** 1089-line verification page. Combines list view, detail view, and override dialog all in one file.
**Fix:** Extract `IndentVerificationDetail` and `IndentOverrideDialog` into separate component files.

---

### C2. Top-Level Heavy Library Imports (Not Dynamic)

🟠 HIGH
**File:** `components/dashboards/HODDashboard.tsx` (line 3)
**Issue:** `import { PieChart, ResponsiveContainer, Pie, Cell, Tooltip } from "recharts"` — top-level static import. Recharts adds ~180KB to the HOD dashboard bundle even for users who never see a chart.
**Fix:** Use `dynamic(() => import('./HODChartSection'), { ssr: false })` to lazy-load the chart section.

---

🟠 HIGH
**File:** `components/printing/IDPrintingModule.tsx` (line 20)
**Issue:** `import jsPDF from "jspdf"` — top-level static import. jsPDF (~270KB) is included in the initial bundle for every user who visits any page that renders `IDPrintingModule`.
**Fix:** Move jsPDF import inside the print handler function: `const { default: jsPDF } = await import("jspdf")` — or use `next/dynamic` with `{ ssr: false }`.

---

🟡 MEDIUM
**File:** `components/dashboards/ResidentDashboard.tsx` (1028 lines)
**Issue:** 1028-line dashboard with 6 hook imports. Combines notifications, service requests, events, visitor management, and profile in one file.
**Fix:** Extract `ResidentVisitorHistory`, `ResidentServicePanel`, and `ResidentEventCalendar` into sub-components.

---

---

## PART D — FILE UPLOAD SECURITY

### D1. PhotoUploadDialog — No MIME Validation

🟠 HIGH
**File:** `components/dialogs/PhotoUploadDialog.tsx` (lines 41–53, 63–81)
**Issue:** File inputs use `accept="image/*"` which is a UI hint only — browsers do not enforce it. The `uploadFile` function reads `file.name.split('.').pop()` to get extension and uploads directly with no `file.type` MIME check or `file.size` cap. A malicious user can rename a `.exe` or `.php` to `.jpg` and upload it.
**Fix:** Before calling `uploadFile`, add:
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPEG, PNG, WebP allowed');
if (file.size > MAX_SIZE) throw new Error('File must be under 5MB');
```

---

### D2. useCandidates — BGV Document Upload Without Validation

🔴 CRITICAL
**File:** `hooks/useCandidates.ts` (lines 643–661)
**Issue:** `uploadBGVDocument(file, candidateId)` performs zero file-type or file-size validation. It reads only `file.name.split('.').pop()` for the extension. A caller can upload any file type and any size to `staff-compliance-docs` bucket. Additionally, `getPublicUrl` returns a permanent public URL — compliance documents (BGV evidence) should not be publicly accessible.
**Fix:**
1. Add MIME check: `if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) throw new Error(...)`
2. Add size cap: `if (file.size > 5 * 1024 * 1024) throw new Error('Document must be under 5MB')`
3. Replace `getPublicUrl` with `createSignedUrl(filePath, 3600)` (1-hour expiry) to prevent public exposure of compliance documents.

---

### D3. useJobPhotos — No MIME/Size Validation, Public URL

🟠 HIGH
**File:** `hooks/useJobPhotos.ts` (lines 64–121)
**Issue:** `uploadPhoto` function has no MIME type check or file size cap before uploading to `service-evidence` bucket. Returns a permanent public URL via `getPublicUrl`. Job evidence photos should ideally be gated behind authentication.
**Fix:** Add MIME and size checks before upload. Consider `createSignedUrl` for serving URLs if evidence needs to be private.

---

### D4. AddVisitorForm — Raw Full-Resolution Webcam Capture

🔴 CRITICAL
**File:** `components/forms/AddVisitorForm.tsx` (lines 135–147, 199–222)
**Issue:** Visitor selfies captured from webcam via `canvas.toDataURL("image/jpeg", 0.8)` use the video's native `videoWidth × videoHeight` with no resize. Modern webcams can output 1920×1080 or higher, resulting in multi-MB JPEGs. No size cap is applied before uploading to `visitor-photos` bucket. Photos are stored as permanent public URLs.
**Fix:**
1. Resize canvas before `toDataURL`: cap dimensions to a maximum of 640×480 for visitor verification photos.
2. After conversion, check the resulting blob size and reject if > 2MB.
3. Consider using `createSignedUrl` for visitor photos if they contain PII.

---

### D5. GuardDashboard — Selfie Max 10MB (Too High)

🟠 HIGH
**File:** `components/dashboards/GuardDashboard.tsx` (line 644–673)
**Issue:** `MAX_SELFIE_BYTES = 10 * 1024 * 1024` (10MB). While MIME is validated against `['image/jpeg', 'image/png', 'image/webp']`, the size limit is too permissive for a selfie used for attendance verification. 10MB photos will cause slow uploads and excessive Supabase storage consumption.
**Fix:** Reduce to `const MAX_SELFIE_BYTES = 2 * 1024 * 1024` (2MB) for selfie/attendance photos. Add client-side canvas resize to cap selfie dimensions at 640×640.

---

### D6. useVisitors — Upload Returns File Path (Not URL), Public URL Used Elsewhere

🟡 MEDIUM
**File:** `hooks/useVisitors.ts` (lines 335–352)
**Issue:** `uploadVisitorPhoto` returns `{ success: true, url: filePath }` where `filePath` is a storage path (not a full URL). The calling code in `VisitorRegistrationDialog` likely handles the URL lookup separately. No MIME or size validation is performed on the uploaded photo.
**Fix:** Add MIME/size validation. The return type inconsistency (path vs URL) may cause bugs in callers expecting a full URL.

---

### D7. useEmployeeDocuments — 10MB Limit for Documents (Acceptable but Reviewable)

🟢 LOW
**File:** `hooks/useEmployeeDocuments.ts` (lines 207–215)
**Issue:** Employee documents have a 10MB cap with MIME validation (`application/pdf`, `image/jpeg`, `image/png`) — this is acceptable. Documents use `createSignedUrl` (1-hour expiry) for serving, which is the correct security pattern. This is a PASS on file upload security.

---

---

## PART E — ENVIRONMENT VARIABLE AUDIT

### E1. NEXT_PUBLIC_ Variables — Acceptability Assessment

**File:** `.env.local`

Currently exposed as `NEXT_PUBLIC_`:
- `NEXT_PUBLIC_SUPABASE_URL` — OK (standard)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — OK (by design; RLS-protected)
- `NEXT_PUBLIC_FIREBASE_API_KEY` — OK (Firebase Web API keys are designed to be public)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` — OK
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — OK
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` — OK
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` — OK
- `NEXT_PUBLIC_FIREBASE_APP_ID` — OK
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — OK
- `NEXT_PUBLIC_FEATURE_FUTURE_PHASE` / `NEXT_PUBLIC_FF_*` — OK (feature flags are safe to expose)

**No NEXT_PUBLIC_ variables expose private secrets.** This is a PASS.

---

### E2. Hardcoded Storage Bucket Names

🟡 MEDIUM
**Files:** Multiple hooks and components
**Issue:** Storage bucket names are hardcoded as string literals in multiple files:
- `'service-evidence'` in `PhotoUploadDialog.tsx`, `useJobPhotos.ts`, `JobSessionPanel.tsx`
- `'visitor-photos'` in `AddVisitorForm.tsx`, `useVisitors.ts`
- `'staff-compliance-docs'` in `useCandidates.ts`
- `'employee-documents'` in `useEmployeeDocuments.ts`

These should be centralized as constants to prevent typos causing silent upload failures (Supabase silently creates new buckets or fails without clear error).
**Fix:** Create `src/lib/constants/storageBuckets.ts` with named exports: `export const STORAGE_BUCKETS = { SERVICE_EVIDENCE: 'service-evidence', VISITOR_PHOTOS: 'visitor-photos', ... }`.

---

### E3. Missing VAPID Key Variable

🟡 MEDIUM
**File:** `lib/firebase.ts` (line 73)
**Issue:** `console.error('VAPID key not configured. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local')` — `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is referenced in code but does not appear in `.env.local`. FCM push notifications will silently fail.
**Fix:** Add `NEXT_PUBLIC_FIREBASE_VAPID_KEY=` to `.env.local` and set the actual VAPID key from the Firebase console.

---

---

## PART F — CONSOLE & DEBUG CLEANUP

433 `console.log/warn/error` statements found in production code (excluding `scripts/` and `supabase/functions/`). Below are the highest-severity instances:

---

🟠 HIGH
**File:** `app/(dashboard)/services/ac/page.tsx` (line 42)
**Issue:** `console.log("[ACServicePage] Available services:", services)` — leaks the full services array (including IDs, service codes, pricing) to browser console in production.
**Fix:** Remove this debug log entirely.

---

🟠 HIGH
**File:** `app/(dashboard)/company/employees/create/page.tsx` (line 45)
**Issue:** `console.log(data)` — logs PII (employee first name, last name, email, phone) to browser console on every form submit.
**Fix:** Remove immediately.

---

🟠 HIGH
**File:** `components/buyer/BuyerFeedbackDialog.tsx` (lines 72, 86)
**Issue:** `console.log('Note: service_feedback table may not exist...')` and `console.log('Note: buyer_invoices table columns may differ.')` — these indicate the component is bypassing errors rather than handling them. These should be proper error toasts visible to the user, not silent console statements.
**Fix:** If the table doesn't exist, surface an error to the user. Remove console.log statements.

---

🟡 MEDIUM
**File:** `components/dialogs/PhotoUploadDialog.tsx` (line 125)
**Issue:** `console.log('Note: job_photos table may not exist yet. Photos are stored in storage.')` — silently swallows DB insert failure in a `catch` block.
**Fix:** Either surface this as a warning toast or handle the missing table gracefully with proper error logging (not console.log).

---

🟡 MEDIUM — Production Files with `console.error` Used as Primary Error Handling
The following files use `console.error` inside catch blocks WITHOUT surfacing errors to the user via toast:
- `app/(dashboard)/company/designations/page.tsx` (line 50)
- `app/(dashboard)/company/locations/page.tsx` (line 52)
- `app/(dashboard)/inventory/categories/page.tsx` (line 56)
- `app/(dashboard)/inventory/subcategories/page.tsx` (line 65)
- `app/(dashboard)/services/masters/checklists/page.tsx` (line 68)
- `app/(dashboard)/services/masters/service-tasks/page.tsx` (line 64)
- `app/(dashboard)/society/checklists/page.tsx` (line 163)
- `app/(dashboard)/society/residents/page.tsx` (lines 158, 211)
- `app/(dashboard)/tickets/quality/page.tsx` (line 187)

**Fix:** For each: wrap in `toast({ title: "Error", description: err.message, variant: "destructive" })` and optionally keep the `console.error` for development, behind a `process.env.NODE_ENV !== 'production'` guard.

---

🟢 LOW
**File:** `lib/firebase.ts` (line 80)
**Issue:** `console.log('FCM Token obtained:', token.substring(0, 20) + '...')` — partial FCM token still printed to console in production. Remove or gate behind `NODE_ENV === 'development'`.

---

---

## PART G — ACCESSIBILITY BASICS

### G1. Icon-Only Buttons Missing aria-label

🟠 HIGH
**Files:** Multiple pages under `app/(dashboard)/`
**Issue:** Widespread pattern of `<Button variant="ghost" size="icon">` containing only an icon (Edit2, Trash2, Download, ChevronLeft, RefreshCw) with no `aria-label`. Screen reader users hear "button" with no context for edit, delete, or download actions. Affected files include (non-exhaustive):
- `app/(dashboard)/assets/[id]/page.tsx` (line 201) — back navigation button
- `app/(dashboard)/buyer/invoices/page.tsx` (line 74) — unlabeled icon button
- `app/(dashboard)/buyer/requests/new/page.tsx` (lines 155, 319) — icon buttons in form
- `app/(dashboard)/company/designations/page.tsx` (line 97) — edit button
- `app/(dashboard)/company/employees/page.tsx` (lines 81, 109) — action buttons
- `app/(dashboard)/finance/payments/page.tsx` (lines 85, 91) — view/edit buttons
- `app/(dashboard)/hrms/attendance/page.tsx` (lines 351, 356) — action buttons
- `app/(dashboard)/hrms/documents/page.tsx` (lines 279, 284) — download/delete buttons

**Fix:** Add descriptive `aria-label` to all icon-only buttons. Example:
```tsx
<Button variant="ghost" size="icon" aria-label="Edit designation">
  <Edit2 className="h-4 w-4" />
</Button>
```

---

### G2. Label Elements Without htmlFor in Dialogs

🟡 MEDIUM
**Files:** `components/dialogs/AdBookingDialog.tsx`, `components/dialogs/BuyerFeedbackDialog.tsx`, `components/dialogs/ManualAdjustmentDialog.tsx`, `components/dialogs/NewJobOrderDialog.tsx`
**Issue:** Multiple `<Label>` elements in dialogs do not have `htmlFor` attributes linking them to their corresponding input elements. This means clicking the label does not focus the input, and screen readers may not announce the label when the input is focused.

Examples:
- `AdBookingDialog.tsx` line 95: `<Label className="...">Advertiser / Company Name</Label>` (no `htmlFor`, adjacent `Input` has no `id`)
- `ManualAdjustmentDialog.tsx` line 145: `<Label>Date</Label>` (no `htmlFor`, Popover trigger is not an accessible input)
- `NewJobOrderDialog.tsx` line 115: `<Label>Job Title</Label>` (no `htmlFor`)

**Fix:** Add `htmlFor="field-id"` to each `<Label>` and matching `id="field-id"` to the corresponding input.

---

### G3. Video Element Missing Title/Label in AddVisitorForm

🟡 MEDIUM
**File:** `components/forms/AddVisitorForm.tsx` (line 320)
**Issue:** The live camera feed `<video ref={videoRef} autoPlay playsInline>` has no `title`, `aria-label`, or `aria-describedby`. Screen readers cannot describe this element to users with visual impairments.
**Fix:** Add `title="Live camera preview"` or `aria-label="Live camera preview for visitor photo capture"` to the video element.

---

### G4. PPEChecklistDialog — Clickable Div Missing ARIA Role

🟡 MEDIUM
**File:** `components/dialogs/PPEChecklistDialog.tsx` (lines 148–183)
**Issue:** PPE checklist items are implemented as `<div onClick={...}>` without `role="checkbox"` or `role="button"` and without `aria-checked` state. Screen readers cannot announce whether items are checked or not.
**Fix:** Replace each clickable div with a proper `<Checkbox>` component (shadcn/ui Checkbox) or add `role="checkbox" aria-checked={item.verified} tabIndex={0} onKeyDown={(e) => e.key === ' ' && toggleItem(index)}`.

---

### G5. SummaryReportsDialog — `<label>` Without `htmlFor`

🟢 LOW
**File:** `components/dialogs/SummaryReportsDialog.tsx` (lines 120, 139)
**Issue:** Two `<label>` elements (native HTML, not shadcn Label) use no `htmlFor`. These are adjacent to `<Select>` components (which use a trigger button internally) — the association cannot be made through `htmlFor` to a Radix Select trigger anyway, but native labels should be audited.
**Fix:** Use shadcn `<Label>` component and either provide an `id` to the SelectTrigger or use `aria-label` on the `SelectTrigger` instead.

---

---

## Summary Statistics

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Form Validation (A) | 4 | 5 | 5 | 1 | 15 |
| Dialog Audit (B) | 0 | 2 | 3 | 0 | 5 |
| Large Files (C) | 0 | 2 | 3 | 0 | 5 |
| File Upload Security (D) | 2 | 3 | 2 | 1 | 8 |
| Environment Variables (E) | 0 | 0 | 2 | 0 | 2 |
| Console Cleanup (F) | 0 | 2 | 9 | 1 | 12 |
| Accessibility (G) | 0 | 1 | 3 | 1 | 5 |
| **TOTAL** | **6** | **15** | **27** | **4** | **52** |

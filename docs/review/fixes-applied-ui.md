# UI Fixes Applied — Session 2026-03-22

## Issues Fixed

### UI-1: Missing Technician Dashboard Components

**Status: FIXED**

Created two role-specific dashboard components:

- `components/dashboards/ACTechnicianDashboard.tsx`
  - PageHeader-style title: "AC Technician Dashboard"
  - KPI cards: Assigned Today, Done This Month, Requests Pending — sourced from `useJobSessions` and `useServiceRequests` hooks
  - Active job card (when session is live)
  - Assigned tasks list with priority badges and location info
  - Skeleton loading states

- `components/dashboards/PestControlTechnicianDashboard.tsx`
  - PageHeader-style title: "Pest Control Dashboard"
  - KPI cards: Assigned Today, Chemicals Expiring (from `usePestControlInventory`), Done This Month
  - Inline chemical expiry alert banner when `expiringChemicals.length > 0`
  - Active job card and tasks list, same pattern as AC dashboard
  - Skeleton loading states

- `app/(dashboard)/dashboard/page.tsx` — Updated `renderDashboard()`:
  - `case "ac_technician"` now returns `<ACTechnicianDashboard />` (was `<ServiceBoyDashboard />`)
  - `case "pest_control_technician"` now returns `<PestControlTechnicianDashboard />` (was `<ServiceBoyDashboard />`)
  - Imports for both new components added at top of file

---

### UI-2: Missing HRMS Incidents Page

**Status: FIXED**

Created `app/(dashboard)/hrms/incidents/page.tsx`:
- Uses `useBehaviorTickets` hook — incidents are surfaced from the existing behavior tickets system (no separate table needed)
- Shows 4 KPI stats: Open Incidents, Under Review, Resolved (30d), Repeat Offenders — pulled from `stats` returned by the hook
- Renders a `DataTable` with columns for Ticket ID, Employee, Category, Severity, Status, Reported On
- Empty state with a "Go to Behavior Tickets" button
- Skeleton loading state during data fetch
- "Open Behavior Tickets" action button in the PageHeader to navigate to `/tickets/behavior` for full management

---

### UI-3: Settings Dead Routes (404)

**Status: FIXED**

Created three stub pages, all rendering correctly with "Coming Soon" messaging:

- `app/(dashboard)/settings/permissions/page.tsx` — Shield icon, "Coming Soon" card
- `app/(dashboard)/settings/notifications/page.tsx` — Bell icon, "Coming Soon" card
- `app/(dashboard)/settings/branding/page.tsx` — Palette icon, "Coming Soon" card

Each uses `PageHeader` with an appropriate title/description and a `Card` with a centered icon + message. No crashes, no 404.

---

### UI-H3: ServiceDeliveryNoteDialog — PDF Download

**Status: FIXED**

Modified `components/dialogs/ServiceDeliveryNoteDialog.tsx`:

- Added `createdSDN` state to capture the DB record returned by `createNote({ ... })`
- On successful submission, the form is replaced by a success screen showing:
  - `CheckCircle2` icon + "Delivery Note Submitted" message
  - "Close" button (resets state and closes dialog)
  - "Download PDF" button (triggers jsPDF generation)
- `handleDownloadPDF` uses dynamic import `await import("jspdf")` — no top-level bundle cost
- PDF content includes: SDN ID, PO Number, Delivery Date, Status, Remarks, full personnel list with qualification/ID/contact, and total headcount
- File saved as `SDN-{first8charsOfId}.pdf`
- `handleClose` resets `createdSDN` state so re-opening the dialog shows the form again

---

## Files Changed

| File | Change Type |
|------|-------------|
| `components/dashboards/ACTechnicianDashboard.tsx` | Created |
| `components/dashboards/PestControlTechnicianDashboard.tsx` | Created |
| `app/(dashboard)/dashboard/page.tsx` | Modified — wired new dashboard components |
| `app/(dashboard)/hrms/incidents/page.tsx` | Created |
| `app/(dashboard)/settings/permissions/page.tsx` | Created |
| `app/(dashboard)/settings/notifications/page.tsx` | Created |
| `app/(dashboard)/settings/branding/page.tsx` | Created |
| `components/dialogs/ServiceDeliveryNoteDialog.tsx` | Modified — added PDF download |

## Notes

- No new npm packages were added; jsPDF was already a dependency (used by `IDPrintingModule.tsx` and payroll)
- All new pages use existing hooks — no new hooks created
- `usePestControlInventory` already exposes `expiringChemicals` (chemicals expiring within 30 days) — used directly
- The HRMS incidents page reuses `useBehaviorTickets` since behavior tickets are the existing incident tracking mechanism; a dedicated `useHRMSIncidents` hook was not needed

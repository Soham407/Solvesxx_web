# FacilityPro — Complete Implementation Plan

## Context

FacilityPro is a multi-stakeholder enterprise facility management platform (Next.js 16 App Router + Supabase + TailwindCSS). The core phases (A–E) are complete: 125 DB tables, 91 hooks, 60+ route pages, full procurement/HR/services workflows. However, the PRD and SCOPE.md define ~20 features that are missing or partially built. This plan closes all gaps systematically.

---

## Gap Summary (PRD vs Current State)

| # | Gap | Type | Status |
|---|-----|------|--------|
| 1 | Hidden nav items (built but invisible) | Config | 🔵 Hidden |
| 2 | AccountsDashboard widget | Dashboard | 🔵 UI-ONLY |
| 3 | MDDashboard revenue/growth cards | Dashboard | 🟡 Partial |
| 4 | Missing roles: Storekeeper, Site Supervisor | RBAC | 🔴 Missing |
| 5 | Service Delivery Note & Acknowledgment | Workflow | 🔴 Not built |
| 6 | Buyer Feedback Flow | Workflow | 🔴 Not built |
| 7 | Recruitment BGV Status Tracking UI | HRMS | 🔴 Not built |
| 8 | Chemical Expiry Alerts (Pest Control) | Safety | 🔴 Not built |
| 9 | Spill Kit Inventory | Safety | 🔴 Not built |
| 10 | Ad-Space Booking Workflow | Services | 🔴 Not built |
| 11 | Auto-Punch-Out Cron Job | HR Ops | 🔴 Not built |
| 12 | Shortage Notes Auto-Calculation UI | Quality | 🔴 Not built |
| 13 | Personnel Dispatch Tracking (Staffing) | Workflow | 🔴 Not built |
| 14 | Daily Visitor Category Separation | Society | 🟡 Partial |
| 15 | Revenue Analytics Dashboard | Reports | 🟡 Partial |
| 16 | Shift-Based Attendance Cross-Validation | HR Ops | 🟡 Partial |
| 17 | Guard Emergency Contact One-Tap Dial | Guard UX | 🟡 Partial |
| 18 | Society Manager Analytics | Dashboard | 🟡 Partial |
| 19 | Notification Bell UI | Platform | 🔴 Not built |
| 20 | Guard Mobile PWA Wrapper | Mobile | 🔴 Not built |

---

## Sprint 1 — Quick Wins (1–2 days)
*Zero-risk config and schema changes with high impact*

### 1.1 Unhide Hidden Navigation Items
**File:** `components/layout/AppSidebar.tsx`
Remove `/* Temporarily hidden */` comment blocks for:
- Assets & Maintenance group (Asset Registry, Maintenance Schedules, Asset Categories, QR Code Lab)
- Stock & Warehouses, Purchase Orders, Requests & Approvals, Mapping & Rates (under Supply Chain)
- Soft Services and Printing & Ads (under Operations Config)
- 3-Way Reconciliation and Audit & Compliance (under Finance)
- Quality Assurance and Material Returns (under Quality Tickets)

All underlying pages and hooks already exist. Zero DB changes needed.

### 1.2 Add Missing Roles: Storekeeper + Site Supervisor
**Files:**
- `src/lib/auth/roles.ts` — add to `AppRole` union, define `ROLE_ACCESS` entries:
  - `storekeeper` → `["/dashboard", "/inventory", "/tickets"]`
  - `site_supervisor` → `["/dashboard", "/society", "/tickets", "/hrms/attendance"]`
- `supabase/migrations/YYYYMMDD_add_missing_roles.sql` — INSERT into `roles` table

### 1.3 Visitor Category Separation
**Migration:** `ALTER TABLE visitors ADD COLUMN visitor_category VARCHAR(20) DEFAULT 'walkin'`
**File:** `hooks/useVisitors.ts` — add optional `category` filter param
**File:** `app/(dashboard)/society/visitors/page.tsx` — add tab strip: Walk-In | Invited | Vendors

---

## Sprint 2 — Dashboard Completions (3–4 days)
*Replace all 🔵 UI-ONLY dashboard widgets with live data*

### 2.1 AccountsDashboard — Full Replacement
**File:** `components/dashboards/AccountsDashboard.tsx`
Hooks to use (all exist):
- `useFinance()` → pending payments count, ledger totals
- `useReconciliation()` → pending reconciliation count
- `useSupplierBills()` → AP totals, overdue count
- `useBuyerInvoices()` → AR totals
- `useCompliance()` → docs expiring within 30 days

Replace all `ComingSoon` blocks with:
- 4 KPI stat cards: AR Total, AP Pending, Recon Discrepancies, Docs Expiring
- 1 Recharts `BarChart` from `view_financial_monthly_trends` (inflows vs outflows)
- Action buttons wired to `/finance/payments`, `/finance/reconciliation`

No new hooks or DB changes needed.

### 2.2 MDDashboard — Revenue + Compliance Cards
**File:** `hooks/useMDStats.ts` — extend to query `view_financial_kpis` for `total_collected_ytd`
**File:** `components/dashboards/MDDashboard.tsx`:
- Replace "Annual Revenue / Coming Soon" with real `formatCurrency(totalRevenue)`
- Replace Growth Forecast `ComingSoonChart` with Recharts `AreaChart` from `view_financial_monthly_trends`
- Replace Compliance Score card with PSARA compliance % (verified guard docs / total guards)

### 2.3 Auto-Punch-Out Cron Job
**File:** `supabase/migrations/YYYYMMDD_auto_punch_out.sql`
```sql
CREATE OR REPLACE FUNCTION auto_punch_out_idle_employees() RETURNS void AS $$
  UPDATE attendance_logs SET check_out_time = (log_date::timestamptz + INTERVAL '23:59:59'),
    status = 'auto_punched_out' WHERE check_out_time IS NULL AND log_date < CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER;
SELECT cron.schedule('auto-punch-out', '0 1 * * *', 'SELECT auto_punch_out_idle_employees()');
```
Prerequisite: `pg_cron` extension enabled (already used in Phase E).

---

## Sprint 3 — Core Workflow Completions (4–5 days)
*Complete the PRD workflows that connect supplier → admin → buyer*

### 3.1 Service Delivery Note & Acknowledgment
The `service_delivery_notes` table exists in reference schema. Verify it's live; apply migration if needed.

**New hook:** `hooks/useServiceDeliveryNotes.ts`
```typescript
return { notes, isLoading, error, createNote, verifyNote, rejectNote }
// Realtime subscription on service_delivery_notes table
```
**New dialog:** `components/dialogs/ServiceDeliveryNoteDialog.tsx`
- Fields: personnel details (JSONB array), delivery date, remarks, credential uploads

**Wire into:** `app/(dashboard)/supplier/service-orders/page.tsx` — "Upload Delivery Note" button per SPO row
**Wire into:** Admin view of service orders — "Verify" action changes status to `deployment_confirmed`

### 3.2 Buyer Feedback Flow
The `buyer_feedback` table and `feedback_pending` status exist. Only the UI is missing.

**New hook:** `hooks/useBuyerFeedback.ts`
```typescript
return { feedbacks, isLoading, submitFeedback(requestId, ratings, comments) }
// On submit: update request status to 'completed'
```
**New dialog:** `components/dialogs/BuyerFeedbackDialog.tsx`
- Star ratings: Overall, Quality, Delivery, Professionalism
- Would-recommend toggle + comments textarea

**Wire into:** `app/(dashboard)/buyer/requests/page.tsx` — "Leave Feedback" button for `feedback_pending` rows

### 3.3 Recruitment BGV Status Tracking UI
The `background_verifications` table and `useCandidates` with `bgv_status` field exist.

**New hook:** `hooks/useBackgroundVerifications.ts`
```typescript
return { verifications, isLoading, initiateVerification, updateStatus, uploadDocument }
```
**Wire into:** `app/(dashboard)/hrms/recruitment/page.tsx`
- BGV panel appears for candidates at `background_check` status
- Show each verification type (police, address, education, employment) as status row
- "Initiate BGV" + "Upload Report" actions per row
- When all pass → allow advancement to `offered`

---

## Sprint 4 — Safety, Inventory & Services (5–6 days)

### 4.1 Chemical Expiry Alerts (Pest Control)
**Migration:** `ALTER TABLE pest_control_chemicals ADD COLUMN expiry_date DATE, ADD COLUMN batch_number VARCHAR(50)`

**Migration:** Add cron function:
```sql
CREATE OR REPLACE FUNCTION detect_chemical_expiry() RETURNS void AS $$
  INSERT INTO notifications (user_id, title, body, type)
  SELECT admin_user_id, 'Chemical Expiry Alert',
    c.chemical_name || ' (Batch: ' || c.batch_number || ') expires on ' || c.expiry_date, 'chemical_expiry'
  FROM pest_control_chemicals c WHERE c.expiry_date BETWEEN now() AND now() + INTERVAL '30 days';
$$ LANGUAGE sql SECURITY DEFINER;
SELECT cron.schedule('chemical-expiry-check', '0 9 * * *', 'SELECT detect_chemical_expiry()');
```
**File:** `hooks/usePestControlInventory.ts` — add `expiry_date`, `batch_number` to type; add `expiringChemicals` computed return
**File:** `app/(dashboard)/services/pest-control/page.tsx` — add expiry warning banner

### 4.2 Spill Kit Inventory
**New migration:** Create `pest_control_spill_kits` table with: `id, kit_code, location_id, items_json (JSONB), last_inspected_at, inspected_by, status, notes`

**New hook:** `hooks/useSpillKits.ts` — standard CRUD
**Wire into:** `app/(dashboard)/services/pest-control/page.tsx` — new "Spill Kits" tab

### 4.3 Ad-Space Booking Workflow
The `printing_ad_spaces` table exists but has no booking system.

**New migration:** Create `printing_ad_bookings` table: `id, booking_number, ad_space_id, advertiser_name, start_date, end_date, agreed_rate_paise, creative_url, status, approved_by, notes`

**New hook:** `hooks/useAdBookings.ts`
```typescript
return { bookings, isLoading, createBooking, approveBooking, cancelBooking }
// createBooking sets ad_space status = 'occupied'
// cancelBooking/expired sets status back to 'available'
```
**New dialog:** `components/dialogs/AdBookingDialog.tsx`
**Wire into:** `app/(dashboard)/services/printing/page.tsx` — "Book Space" per available ad space row

### 4.4 Shortage Notes Auto-Calculation UI
The `shortage_notes` and `shortage_note_items` tables exist.

**New hook:** `hooks/useShortageNotes.ts`
```typescript
return { notes, isLoading, createShortageNote(grnId), resolveNote }
// createShortageNote computes expected_qty - received_qty per GRN line automatically
```
**Wire into:** `app/(dashboard)/tickets/quality/page.tsx` — new "Shortage Notes" tab
**Wire into:** `app/(dashboard)/inventory/grn/page.tsx` — "Generate Shortage Note" button on variance rows

---

## Sprint 5 — Staffing Workflow + Notifications (4–5 days)

### 5.1 Personnel Dispatch Tracking
**New migration:** Create `personnel_dispatches` table: `id, dispatch_number, service_po_id, supplier_id, personnel_json (JSONB), dispatch_date, deployment_site_id, status (dispatched/confirmed/active/withdrawn), confirmed_by, confirmed_at, notes`

**New hook:** `hooks/usePersonnelDispatches.ts`
**Wire into:** `app/(dashboard)/supplier/service-orders/page.tsx` — "Dispatch Personnel" action
**Wire into:** Admin service orders view — "Confirm Deployment" action → sets status `deployment_confirmed`

### 5.2 Notification Bell UI (Platform-wide)
**New hook:** `hooks/useNotifications.ts`
```typescript
return { notifications, unreadCount, isLoading, markAsRead, markAllRead }
// Realtime subscription on notifications table WHERE user_id = auth.uid()
```
**New component:** `components/layout/NotificationBell.tsx`
- Badge with unread count (red dot)
- Dropdown Popover with notification list, priority-colored icons
- "Mark All Read" action

**Wire into:** `app/(dashboard)/layout.tsx` top navigation bar

### 5.3 Revenue Analytics Dashboard
**File:** `app/(dashboard)/reports/financial/page.tsx` — already uses `useAnalyticsData("financial")`
- Add KPI summary cards: YTD Collected, Outstanding AR, Total Expenses, Net Margin (from `view_financial_kpis`)
- Add Recharts `PieChart` for revenue by category (from `view_financial_revenue_by_category`)

**File:** `src/lib/auth/roles.ts` — add `/reports` to `company_md` and `account` ROLE_ACCESS

---

## Sprint 6 — Polish & Future (4–5 days)

### 6.1 Shift-Based Attendance Cross-Validation
**New hook:** `hooks/useShiftAttendanceReport.ts` — queries `view_attendance_by_dept`, computes per-employee late minutes vs shift start
**Wire into:** `app/(dashboard)/hrms/attendance/page.tsx` — new "Shift Compliance" tab with DataTable

### 6.2 Society Manager Analytics
**File:** `components/dashboards/SocietyManagerDashboard.tsx`
- Replace `ComingSoonWidget` for visitor trends → 7-day bar chart from `useVisitors` daily counts
- Replace `ComingSoonWidget` for checklist completion → rate from `useGuardChecklist`
- Wire "View Full Map" button to guard live map page

### 6.3 Guard Emergency Contact One-Tap Dial
**File:** `app/(dashboard)/society/emergency/page.tsx` — wrap phone numbers in `<a href="tel:{phone}">` with Phone icon button
**File:** `app/(dashboard)/test-guard/page.tsx` — add Emergency Quick-Dial section with large tap targets

### 6.4 Guard Mobile PWA Wrapper
**File:** `public/manifest.json` — create with: name, icons, `start_url: "/test-guard"`, `display: "standalone"`, `theme_color`
**File:** `app/layout.tsx` — add `<link rel="manifest">` and viewport meta
Check `package.json` for `next-pwa` before adding; if absent, add `next-pwa` and configure in `next.config.ts`

### 6.5 FCM Push for Panic Alerts (Plumbing)
**File:** `hooks/usePanicAlert.ts` — after successful insert, call `sendPushNotification()` from `usePushNotifications`
Or: add DB trigger `AFTER INSERT ON panic_alerts → pg_net call to send-notification edge function`

---

## Skills to Use During Implementation

| Skill | When to Invoke |
|-------|---------------|
| `supabase-expert` | Writing any new migration, RLS policies, cron functions, DB triggers |
| `supabase-backend-platform` | Setting up new tables (spill kits, ad bookings, personnel dispatches, delivery notes) |
| `react-patterns` | Notification bell with Realtime subscription, complex form dialogs (feedback, BGV) |
| `rbac-authorization-patterns` | Adding Storekeeper/Site Supervisor roles + updating RLS policies |
| `erp-domain-knowledge` | Shortage note auto-calc logic, personnel dispatch workflow states |
| `nextjs-supabase-auth` | Employee self-service payslip portal, role-based page guards |
| `twilio-communications` | MSG91 SMS completeness (same API pattern) — panic alert SMS, visitor notification SMS |
| `inventory-demand-planning` | Chemical expiry reorder thresholds, spill kit stock levels |
| `playwright-e2e-testing` | After Sprint 3 — test buyer feedback flow, delivery note workflow, BGV multi-step flow |

---

## Verification Plan

After each sprint:
1. **Sprint 1:** Navigate to previously hidden pages as Admin — confirm they load without errors
2. **Sprint 2:** Log in as `account` role — AccountsDashboard should show real bill counts; MD login should show revenue figure
3. **Sprint 3:** Create a service PO as supplier → upload delivery note → verify as admin → create buyer order → complete → see feedback prompt
4. **Sprint 4:** Add a pest control chemical with expiry within 30 days → confirm notification appears
5. **Sprint 5:** Submit a service request → confirm notification bell badge increments in real-time
6. **Sprint 6:** Open guard portal on mobile → confirm PWA install prompt appears

---

## Critical Files Reference

| File | Relevant Sprints |
|------|-----------------|
| `components/layout/AppSidebar.tsx` | S1 |
| `src/lib/auth/roles.ts` | S1, S5 |
| `components/dashboards/AccountsDashboard.tsx` | S2 |
| `components/dashboards/MDDashboard.tsx` | S2 |
| `hooks/useMDStats.ts` | S2 |
| `hooks/useServiceDeliveryNotes.ts` *(new)* | S3 |
| `hooks/useBuyerFeedback.ts` *(new)* | S3 |
| `hooks/useBackgroundVerifications.ts` *(new)* | S3 |
| `hooks/usePestControlInventory.ts` | S4 |
| `hooks/useSpillKits.ts` *(new)* | S4 |
| `hooks/useAdBookings.ts` *(new)* | S4 |
| `hooks/useShortageNotes.ts` *(new)* | S4 |
| `hooks/usePersonnelDispatches.ts` *(new)* | S5 |
| `hooks/useNotifications.ts` *(new)* | S5 |
| `components/layout/NotificationBell.tsx` *(new)* | S5 |
| `app/(dashboard)/layout.tsx` | S5 |
| `app/(dashboard)/reports/financial/page.tsx` | S5 |

---

## New Migrations Required

| Migration File | Sprint | Purpose |
|----------------|--------|---------|
| `YYYYMMDD_add_missing_roles.sql` | S1 | Insert storekeeper + site_supervisor into roles table |
| `YYYYMMDD_visitor_category.sql` | S1 | Add visitor_category column to visitors |
| `YYYYMMDD_auto_punch_out.sql` | S2 | Auto punch-out cron function |
| `YYYYMMDD_ensure_delivery_notes.sql` | S3 | Verify/apply service_delivery_notes table + RLS |
| `YYYYMMDD_chemical_expiry.sql` | S4 | Add expiry_date to pest_control_chemicals + cron |
| `YYYYMMDD_spill_kits.sql` | S4 | Create pest_control_spill_kits table |
| `YYYYMMDD_ad_bookings.sql` | S4 | Create printing_ad_bookings table |
| `YYYYMMDD_personnel_dispatches.sql` | S5 | Create personnel_dispatches table |

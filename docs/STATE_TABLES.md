# 📊 STATE TABLES — FacilityPro

> **Rule:** For every major entity, define: Allowed states, Allowed transitions, Actor per transition.
> **Anti-pattern:** UI must NEVER allow a transition that's not in this table.
>
> **Verified against live Supabase DB** (`wwhbdgwfodumognpkgrf`) on 2026-02-14.
> All table names, enum values, and defaults reflect the **deployed schema**, not the SQL files.

---

## 1. Order / Service Request Lifecycle

**Source:** `request_status` enum (16 values)
**DB Table:** The order lifecycle is tracked across **4 interconnected tables**, each with its own status enum:

| Table | Status Column Type | Enum Name | Values |
|---|---|---|---|
| _(conceptual order)_ | `request_status` | `request_status` | `pending, accepted, rejected, indent_generated, indent_forwarded, indent_accepted, indent_rejected, po_issued, po_received, po_dispatched, material_received, material_acknowledged, bill_generated, paid, feedback_pending, completed` |
| `indents` | `indent_status` (USER-DEFINED) | `indent_status` | `draft, pending_approval, approved, rejected, po_created, cancelled` |
| `purchase_orders` | `po_status` (USER-DEFINED) | `po_status` | `draft, sent_to_vendor, acknowledged, partial_received, received, cancelled` |
| `material_receipts` | `grn_status` (USER-DEFINED) | `grn_status` | `draft, inspecting, accepted, partial_accepted, rejected` |

### 1a. Overall Order Lifecycle (`request_status`)

| Current State | → Next State | Actor | Action | Evidence Required | What Breaks If Skipped |
|---|---|---|---|---|---|
| _(none)_ | `pending` | **Buyer** | Submits Order Request | Order details (Service Cat, Grade, Qty) | No demand entry in system |
| `pending` | `accepted` | **Admin** | Reviews and accepts request | Rate verification from Master Data | Can't proceed without approval |
| `pending` | `rejected` | **Admin** | Denies request | Rejection reason (optional) | Buyer not notified |
| `accepted` | `indent_generated` | **Admin** | Converts request to formal indent | Product/service specs from Master | Procurement can't begin |
| `indent_generated` | `indent_forwarded` | **Admin** | Forwards indent to selected Supplier | Supplier identified via Supplier Master | Supplier never receives demand |
| `indent_forwarded` | `indent_accepted` | **Supplier** | Accepts indent (can fulfill) | Capacity confirmation | Admin doesn't know if feasible |
| `indent_forwarded` | `indent_rejected` | **Supplier** | Rejects indent (can't fulfill) | Rejection reason | Admin must find alternate supplier |
| `indent_accepted` | `po_issued` | **Admin** | Issues formal Purchase Order | PO document with terms | No legal contract for order |
| `po_issued` | `po_received` | **Supplier** | Acknowledges receipt of PO | Confirmation timestamp | Admin doesn't know if PO was seen |
| `po_received` | `po_dispatched` | **Supplier** | Marks goods as dispatched | Delivery Note with staff names | Admin has no ETD |
| `po_dispatched` | `material_received` | **Delivery Boy / Admin** | Goods arrive at site | Security gate log of delivery vehicle | No physical receipt evidence |
| `material_received` | `material_acknowledged` | **Admin** | Three-way check: Material vs PO vs Indent | Quality check (photo), Quantity check (count) | Company pays for unverified goods |
| `material_acknowledged` | `bill_generated` | **Supplier** | Submits Supplier Bill (Purchase Bill) | Bill based on Supplier-wise rates | Financial closure can't begin |
| `bill_generated` | `paid` | **Admin / Account** | Processes and pays Purchase Bill | Reconciliation match confirmed | Supplier not paid |
| `paid` | `feedback_pending` | **System** (auto) | Triggers feedback request to Buyer | N/A | No quality metrics captured |
| `feedback_pending` | `completed` | **Buyer** | Submits feedback rating | Quality/satisfaction rating | Transaction never officially closes |

### 1b. Indent Status (`indent_status` enum on `indents` table)

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `draft` | `pending_approval` | **Admin** | Submits indent for internal approval |
| `pending_approval` | `approved` | **Admin / HOD** | Approves indent internally |
| `pending_approval` | `rejected` | **Admin / HOD** | Rejects indent internally |
| `approved` | `po_created` | **System** (auto) | When PO is issued from this indent |
| Any | `cancelled` | **Admin** | Cancels the indent |

**DB Columns:** `indents` has `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `linked_po_id`, `submitted_by`, `submitted_at`

### 1c. Purchase Order Status (`po_status` enum on `purchase_orders` table)

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `draft` | `sent_to_vendor` | **Admin** | Sends PO to supplier |
| `sent_to_vendor` | `acknowledged` | **Supplier** | Supplier acknowledges receipt of PO |
| `acknowledged` | `partial_received` | **Admin** | Some goods received (partial delivery) |
| `acknowledged` | `received` | **Admin** | All goods received (full delivery) |
| Any | `cancelled` | **Admin** | Cancels the PO |

**DB Columns:** `purchase_orders` has `indent_id` (FK), `supplier_id`, `sent_to_vendor_at`, `vendor_acknowledged_at`

### 1d. GRN / Material Receipt Status (`grn_status` enum on `material_receipts` table)

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `draft` | `inspecting` | **Admin** | Begins quality/quantity inspection |
| `inspecting` | `accepted` | **Admin** | All items pass inspection |
| `inspecting` | `partial_accepted` | **Admin** | Some items pass, some rejected |
| `inspecting` | `rejected` | **Admin** | All items fail inspection |

**DB Columns:** `material_receipts` has `purchase_order_id` (FK), `supplier_id`, `received_by`, `quality_checked_by`, `quality_checked_at`, `delivery_challan_number`, `vehicle_number`

**`material_receipt_items` columns:** `ordered_quantity`, `received_quantity`, `accepted_quantity`, `rejected_quantity`, `quality_status` (VARCHAR, default `'pending'`), `rejection_reason`, `batch_number`, `expiry_date`

**ILLEGAL TRANSITIONS (must be blocked):**
- `pending` → `indent_forwarded` (can't skip indent generation)
- `indent_generated` → `po_issued` (must forward to supplier first)
- `po_issued` → `material_acknowledged` (can't skip dispatch and receipt)
- `material_received` → `paid` (can't skip acknowledgment and billing)
- Any state → `completed` (can't skip feedback)

---

## 2. Visitor Status

**DB Table:** `visitors`
**Status Column:** No explicit status enum — state is **implicit** based on column values:
- `entry_time` IS NOT NULL → entry logged
- `approved_by_resident` = true/false → confirmed/denied
- `visitor_pass_number` IS NOT NULL → pass issued
- `exit_time` IS NOT NULL → exited

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `entry_logged` | **Security Guard** | Logs visitor info | Name, Photo* (`photo_url`), Phone, Vehicle (`vehicle_number`), Flat (`flat_id`) |
| `entry_logged` | `awaiting_confirmation` | **System** (auto) | Sends SMS + Push to Resident | Automated trigger via `send-notification` edge function |
| `awaiting_confirmation` | `confirmed` | **Resident** | Sets `approved_by_resident = true` | Approval timestamp |
| `awaiting_confirmation` | `denied` | **Resident** | Sets `approved_by_resident = false` | Denial reason |
| `confirmed` | `pass_issued` | **Security Guard** | Issues visitor pass | `visitor_pass_number` recorded |
| `pass_issued` | `exited` | **Security Guard** | Logs visitor exit | `exit_time`, `exit_guard_id` |
| `denied` | `entry_rejected` | **Security Guard** | Informs visitor, logs rejection | Rejection log |

**Additional DB Columns:** `entry_guard_id`, `exit_guard_id`, `entry_location_id`, `resident_id`, `purpose`, `is_frequent_visitor` (boolean, default false)

**Note:** `is_frequent_visitor` flag allows bypass of confirmation flow for registered daily visitors (maids, drivers, etc.)

---

## 3. Guard Alert States

**DB Table:** `panic_alerts`
**Status Model:** **Binary** — NOT multi-state. The table uses `is_resolved` (boolean, default `false`) with `resolved_at` and `resolved_by` for closure.

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `unresolved` | **Guard** (panic) / **System** (inactivity, geo_fence_breach) | Alert raised — `is_resolved = false` | GPS (`latitude`/`longitude`), `alert_time`, `location_id` |
| `unresolved` | `resolved` | **Security Supervisor** / **Society Manager** | Resolves the alert — `is_resolved = true` | `resolution_notes`, `resolved_at`, `resolved_by` |

**DB `alert_type` enum:** `panic, inactivity, geo_fence_breach, checklist_incomplete, routine`

**⚠️ Schema Gap:** There is no `acknowledged` intermediate state in the DB. If you need a multi-state lifecycle (triggered → acknowledged → resolved → escalated), a new `alert_status` column or enum would need to be added via migration.

**⚠️ Schema Gap:** There is no automatic escalation mechanism in the DB. Escalation (e.g., after 5 min without acknowledgment) would require a `pg_cron` job or application-level logic.

---

## 4. Checklist Response States

**DB Table:** `checklist_responses`
**Status Model:** Uses `is_complete` (boolean, default `true`) — responses are either submitted or not.

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `pending` | **System** (auto, daily at shift start) | Checklist assigned to employee | Based on `daily_checklists.frequency` |
| `pending` | `reminder_sent` | **System** (auto, if not filled by 9 AM) | Sends reminder notification | Notification log |
| `pending` / `reminder_sent` | `submitted` | **Guard / Staff** | Fills and submits checklist | `responses` (JSONB), `evidence_photos` (JSONB), `latitude`/`longitude`, `location_id` |
| `reminder_sent` | `overdue` | **System** (auto, after 30 min) | Escalates to Supervisor | Escalation notification |
| `submitted` | `reviewed` | **Supervisor** | Reviews submitted checklist | Review timestamp |

**DB Columns confirmed:** `checklist_id`, `employee_id`, `response_date`, `responses` (JSONB), `evidence_photos` (JSONB, default `[]`), `latitude`, `longitude`, `location_id`, `submitted_at`, `is_complete`

**Note:** `evidence_photos` column exists for photo proof storage (JSONB array). The `daily_checklists.questions` field uses JSONB format: `{question, type: 'yes_no' | 'value', required: boolean}`

---

## 5. Attendance States

**DB Table:** `attendance_logs`
**Status Column:** `status` (VARCHAR, no enum — accepts free text like `present`, `absent`, `half_day`, `on_leave`)

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `checked_in` | **Employee** | Taps check-in | GPS (within `geo_fence_radius` of `company_locations`) |
| `checked_in` | `checked_out` | **Employee** | Taps check-out | GPS location + time |
| `checked_in` | `auto_punched_out` | **System** (auto) | Guard left geo-fence too long | GPS breach log + alert sent |
| _(end of day)_ | `present` | **System** (auto) | If check-in + check-out recorded | `total_hours` calculated |
| _(end of day)_ | `absent` | **System** (auto) | If no check-in recorded | Marked absent |
| _(end of day)_ | `half_day` | **System** (auto) | If only partial hours | Based on threshold |
| _(end of day)_ | `on_leave` | **System** (auto) | If leave application approved | Linked to `leave_applications` |

**DB Columns confirmed:** `employee_id`, `log_date` (DATE, UNIQUE with employee_id), `check_in_time`, `check_out_time`, `check_in_location_id`, `check_out_location_id`, `total_hours` (numeric), `status` (VARCHAR)

**⚠️ Schema Gap — No Selfie Column:** The `attendance_logs` table does **NOT** have a `selfie_url`, `check_in_photo`, or any photo column. The PRD requires selfie attendance but the DB has no place to store it. A migration is needed to add a `check_in_photo_url TEXT` column.

**✅ Geo-fence Ready:** `company_locations` has `geo_fence_radius` (numeric), `latitude` (numeric), `longitude` (numeric) — the infrastructure for geo-fence enforcement exists in the DB.

---

## 6. Leave Application States

**DB Table:** `leave_applications`
**Status Column:** `status` (VARCHAR, default `'pending'`)

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `pending` | **Employee** | Submits leave application via app | `leave_type_id`, `from_date`, `to_date`, `number_of_days`, `reason` |
| `pending` | `approved` | **Manager / HOD** | Approves leave based on availability | `approved_by`, `approved_at` |
| `pending` | `rejected` | **Manager / HOD** | Rejects leave | `rejection_reason` |

**DB Columns confirmed:** `employee_id`, `leave_type_id` (FK to `leave_types`), `from_date`, `to_date`, `number_of_days`, `reason`, `status`, `approved_by`, `approved_at`, `rejection_reason`

**`leave_type_enum` values:** `sick_leave, casual_leave, paid_leave, unpaid_leave, emergency_leave`

---

## 7. Recruitment Candidate States

**DB Table:** `candidates`
**Status Column:** `status` (USER-DEFINED, `candidate_status` enum, default `'screening'`)

**`candidate_status` enum values:** `screening, interviewing, background_check, offered, hired, rejected`

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `screening` | **Admin / HR** | Enters candidate details | `first_name`, `last_name`, `email`, `phone`, `applied_position`, `source` |
| `screening` | `interviewing` | **Admin** | Schedules interview | `interview_date` |
| `interviewing` | `background_check` | **Admin / HOD** | Completes interview, initiates BGV | `interview_notes`, `interview_rating`, `interviewer_id`, `bgv_initiated_at` |
| `background_check` | `offered` | **Admin** | BGV positive, extends offer | `bgv_completed_at`, `bgv_status`, `bgv_notes`, `offered_salary`, `offer_date` |
| `offered` | `hired` | **Admin** | Candidate accepts, one-click onboarding | `offer_accepted_at`, `joining_date`, `converted_employee_id`, `converted_at` |
| Any stage | `rejected` | **Admin** | Candidate rejected at any point | `rejection_reason` |

**DB Columns confirmed:** `candidate_code`, `designation_id`, `department`, `expected_salary`, `notice_period_days`, `resume_url`, `status_changed_at`, `status_changed_by`, `bgv_initiated_at`, `bgv_completed_at`, `bgv_status` (VARCHAR), `bgv_notes`, `offered_salary`, `offer_date`, `offer_accepted_at`, `joining_date`, `converted_employee_id` (FK to employees), `converted_at`, `source`, `referred_by`

**Note:** `candidate_interviews` is a separate table for tracking multiple interview rounds.

**⚠️ Deviation from STATE_TABLES v1.0:** The v1.0 doc had states like `applied`, `interview_scheduled`, `interviewed`, `bgv_pending`, `bgv_cleared`, `bgv_failed`, `offer_extended`, `declined`. The actual DB enum is simpler: `screening → interviewing → background_check → offered → hired | rejected`. The granular BGV tracking is done via separate columns (`bgv_status`, `bgv_notes`), not enum values.

---

## 8. Material Quality/Quantity Inspection

**DB Tables:** `material_receipts` + `material_receipt_items` (NOT a separate "ticket" table)
**Status:** Quality inspection is embedded in the GRN flow, not a standalone ticket system.

### Per-Item Inspection (`material_receipt_items`):

| Field | Type | Purpose |
|---|---|---|
| `quality_status` | VARCHAR, default `'pending'` | Per-item inspection result |
| `ordered_quantity` | numeric | What was ordered on PO |
| `received_quantity` | numeric | What physically arrived |
| `accepted_quantity` | numeric | What passed inspection |
| `rejected_quantity` | numeric, default `0` | What failed inspection |
| `rejection_reason` | text | Why an item was rejected |
| `batch_number` | VARCHAR | Lot/batch tracking |
| `expiry_date` | date | Expiry monitoring |

### Overall GRN Inspection (`material_receipts`):

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| `draft` | `inspecting` | **Admin** | Begins quality/quantity inspection | `quality_checked_by` assigned |
| `inspecting` | `accepted` | **Admin** | All items pass inspection | `quality_checked_at` recorded |
| `inspecting` | `partial_accepted` | **Admin** | Some items accepted, some rejected | Per-item `accepted_quantity` + `rejected_quantity` |
| `inspecting` | `rejected` | **Admin** | All items fail inspection | `rejection_reason` per item |

**`material_condition` enum (for quality checks):** `good, damaged, expired, leaking, defective`

**`ticket_type` enum (for formal tickets):** `quality_check, quantity_check, material_return`

**⚠️ Note:** The `ticket_type` enum exists but there is **no dedicated `material_tickets` table** in the deployed DB. Material inspection is tracked per-item in `material_receipt_items`. If formal tickets with tracking and assignment are needed, a new table would need to be created.

---

## 9. Behavior Ticket States

**DB Table:** `employee_behavior_tickets` (NOT `behavior_tickets`)
**Status Column:** `status` (VARCHAR, default `'open'`)
**Category Column:** `category` (USER-DEFINED, `behavior_category` enum)

**`behavior_category` enum values:** `sleeping_on_duty, rudeness, absence, uniform_issue, unauthorized_entry, late_arrival, mobile_use, other`

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `open` | **Society Manager / Supervisor** | Creates behavior ticket | `employee_id`, `category`, `severity`, `description`, `evidence_urls` (JSONB) |
| `open` | `under_review` | **Admin / HOD** | Reviews incident | Review notes |
| `under_review` | `warning_issued` | **Admin** | Issues verbal/written warning | Warning document |
| `under_review` | `action_taken` | **Admin** | Suspension or termination | Action documentation |
| `under_review` | `dismissed` | **Admin** | Ticket found to be invalid/incorrect | Dismissal reason |
| `warning_issued` | `closed` | **System / Admin** | After probation period expires | Auto-close or manual |
| `action_taken` | `closed` | **Admin** | After action is executed | Execution confirmation |

**DB Columns confirmed:** `ticket_number`, `employee_id` (FK, NOT NULL), `category` (behavior_category enum, NOT NULL), `severity` (VARCHAR, NOT NULL), `reported_by` (UUID), `description` (TEXT), `evidence_urls` (JSONB), `status` (VARCHAR, default `'open'`), `resolution` (TEXT), `created_at`

---

## 10. Financial Closure States

**Governs:** End-to-end billing lifecycle

### Purchase Bill (Supplier side):

**DB Table:** `purchase_bills` (NOT `supplier_bills`)
**Status Column:** `status` (TEXT, default `'draft'`)
**Payment Status Column:** `payment_status` (TEXT, default `'unpaid'`)

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `draft` | `submitted` | **Supplier / Admin** | Bill created and submitted |
| `submitted` | `under_reconciliation` | **Account / Admin** | Bill entered into reconciliation |
| `under_reconciliation` | `approved` | **Account / Admin** | Bill approved after matching |
| `under_reconciliation` | `disputed` | **Account** | Discrepancy found |
| `disputed` | `resolved` | **Supplier + Account** | Discrepancy resolved |
| `resolved` | `approved` | **Account** | Re-approved after resolution |
| `approved` | `paid` | **Account** | Payment processed |

**DB Columns confirmed:** `bill_number`, `supplier_invoice_number`, `purchase_order_id` (FK), `material_receipt_id` (FK), `supplier_id` (FK), `bill_date`, `due_date`, `status`, `payment_status`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `paid_amount`, `due_amount`, `last_payment_date`, `budget_id` (FK), `external_id`, `gateway_log` (JSONB), `failure_reason`

### Sale Bill (Buyer side):

**DB Table:** `sale_bills` (NOT `buyer_invoices`)
**Status Column:** `status` (VARCHAR, default `'draft'`)
**Payment Status Column:** `payment_status` (VARCHAR, default `'unpaid'`)

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `draft` | `sent` | **Admin / Account** | Invoice sent to Buyer |
| `sent` | `acknowledged` | **Buyer** | Buyer receives invoice |
| `acknowledged` | `paid` | **Buyer** | Buyer makes payment |
| `paid` | `closed` | **System** | Payment confirmed and recorded |

**DB Columns confirmed:** `invoice_number`, `client_id` (FK), `contract_id` (FK), `invoice_date`, `due_date`, `billing_period_start`, `billing_period_end`, `status`, `payment_status`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `paid_amount`, `due_amount`, `last_payment_date`, `external_id`, `gateway_log` (JSONB), `failure_reason`

### Reconciliation:

**DB Tables:** `reconciliations` + `reconciliation_lines` (NOT `reconciliation_entries`)
**Status Column:** `status` (USER-DEFINED, `reconciliation_status` enum, default `'pending'`)

**`reconciliation_status` enum values:** `pending, matched, discrepancy, resolved, disputed`

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `pending` | `matched` | **System** | Auto-matched: PO ↔ GRN ↔ Bill amounts align |
| `pending` | `discrepancy` | **System** | Variance detected between PO / GRN / Bill |
| `discrepancy` | `disputed` | **Account** | Formal dispute raised |
| `disputed` | `resolved` | **Supplier + Account** | Dispute settled |
| `discrepancy` | `resolved` | **Account** | Discrepancy explained/adjusted |

**`reconciliations` DB Columns confirmed:** `reconciliation_number`, `purchase_bill_id` (FK), `purchase_order_id` (FK), `material_receipt_id` (FK), `bill_amount`, `po_amount`, `grn_amount`, `bill_po_variance`, `bill_grn_variance`, `po_grn_variance`, `status`, `discrepancy_type`, `discrepancy_notes`, `resolution_action`, `resolution_notes`, `resolved_at`, `resolved_by`, `adjusted_amount`, `adjustment_reason`

**`reconciliation_lines` DB Columns confirmed:** `reconciliation_id`, `po_item_id`, `grn_item_id`, `bill_item_id`, `product_id`, `matched_qty`, `matched_amount`, `po_unit_price`, `grn_unit_price`, `bill_unit_price`, `unit_price_variance`, `qty_ordered`, `qty_received`, `qty_billed`, `qty_variance`, `match_type`, `status`, `resolution_notes`, `resolved_at`, `resolved_by`

### Financial Period:

**DB Table:** `financial_periods`
**Status Column:** `status` (USER-DEFINED, `financial_period_status` enum, default `'open'`)

**`financial_period_status` enum values:** `open, closing, closed`

| Current State | → Next State | Actor | Action |
|---|---|---|---|
| `open` | `closing` | **Account / Admin** | Initiates period closure |
| `closing` | `closed` | **System / Account** | All outstanding items reconciled, period sealed |

**DB Columns confirmed:** `period_name`, `period_type` (`financial_period_type` enum: `monthly, quarterly, yearly`), `start_date`, `end_date`, `status`, `closed_at`, `closed_by`, `closing_notes`

---

## 11. Service Request States

**DB Table:** `service_requests`
**Status Column:** `status` (USER-DEFINED, `service_request_status` enum, default `'open'`)

**`service_request_status` enum values:** `open, assigned, in_progress, on_hold, completed, cancelled`

| Current State | → Next State | Actor | Action | Evidence |
|---|---|---|---|---|
| _(none)_ | `open` | **Resident / Society Manager / Admin** | Logs service complaint | `request_number`, `title`, `description`, `priority`, `service_id`, `asset_id` |
| `open` | `assigned` | **Admin** | Assigns technician | `assigned_to`, `assigned_at`, `scheduled_date`, `scheduled_time` |
| `assigned` | `in_progress` | **Service Boy** | Starts work | PPE verification, GPS check-in |
| `in_progress` | `on_hold` | **Service Boy / Admin** | Work paused (waiting for parts, etc.) | Hold reason |
| `on_hold` | `in_progress` | **Service Boy** | Resumes work | — |
| `in_progress` | `completed` | **Service Boy** | Work finished | `completed_at`, `resolution_notes`, Before/After photos |
| Any | `cancelled` | **Admin** | Request cancelled | Cancellation reason |

**DB Columns confirmed:** `request_number`, `service_id`, `asset_id`, `location_id`, `society_id`, `title`, `description`, `priority` (`service_priority` enum: `low, normal, high, urgent`), `requester_id`, `requester_phone`, `assigned_to`, `assigned_at`, `scheduled_date`, `scheduled_time`, `estimated_duration_minutes`, `status`, `completed_at`, `resolution_notes`, `maintenance_schedule_id`

---

## Appendix: All Enums in Deployed DB

| Enum Name | Values |
|---|---|
| `alert_type` | `panic, inactivity, geo_fence_breach, checklist_incomplete, routine` |
| `asset_status` | `functional, under_maintenance, faulty, decommissioned` |
| `behavior_category` | `sleeping_on_duty, rudeness, absence, uniform_issue, unauthorized_entry, late_arrival, mobile_use, other` |
| `budget_status` | `draft, active, exhausted, expired` |
| `candidate_status` | `screening, interviewing, background_check, offered, hired, rejected` |
| `document_status` | `pending_upload, pending_review, verified, expired, rejected` |
| `document_type` | `aadhar_card, pan_card, passport, driving_license, voter_id, bank_passbook, education_certificate, experience_certificate, offer_letter, relieving_letter, address_proof, police_verification, medical_certificate, other` |
| `financial_period_status` | `open, closing, closed` |
| `financial_period_type` | `monthly, quarterly, yearly` |
| `grn_status` | `draft, inspecting, accepted, partial_accepted, rejected` |
| `guard_grade` | `A, B, C, D` |
| `indent_status` | `draft, pending_approval, approved, rejected, po_created, cancelled` |
| `job_session_status` | `started, paused, completed, cancelled` |
| `leave_type_enum` | `sick_leave, casual_leave, paid_leave, unpaid_leave, emergency_leave` |
| `maintenance_frequency` | `daily, weekly, monthly, quarterly, half_yearly, yearly` |
| `material_condition` | `good, damaged, expired, leaking, defective` |
| `payment_gateway` | `razorpay, stripe, paypal, manual` |
| `payroll_cycle_status` | `draft, processing, computed, approved, disbursed, cancelled` |
| `payslip_status` | `draft, computed, approved, processed, disputed` |
| `po_status` | `draft, sent_to_vendor, acknowledged, partial_received, received, cancelled` |
| `reconciliation_status` | `pending, matched, discrepancy, resolved, disputed` |
| `request_status` | `pending, accepted, rejected, indent_generated, indent_forwarded, indent_accepted, indent_rejected, po_issued, po_received, po_dispatched, material_received, material_acknowledged, bill_generated, paid, feedback_pending, completed` |
| `service_category` | `security_services, ac_services, plantation_services, printing_advertising, pest_control, housekeeping, pantry_services, general_maintenance` |
| `service_priority` | `low, normal, high, urgent` |
| `service_request_status` | `open, assigned, in_progress, on_hold, completed, cancelled` |
| `ticket_type` | `quality_check, quantity_check, material_return` |
| `user_role` | `admin, company_md, company_hod, account, delivery_boy, buyer, supplier, vendor, security_guard, security_supervisor, society_manager, service_boy, resident` |

---

## Schema Gaps Identified

| Gap | Impact | Fix Required |
|---|---|---|
| No `selfie_url` / `check_in_photo` column in `attendance_logs` | Cannot store selfie attendance proof | Migration: add `check_in_photo_url TEXT` |
| `panic_alerts.is_resolved` is binary (boolean) | Cannot track intermediate states (acknowledged, escalated) | Migration: add `alert_status` enum or keep binary |
| No dedicated `material_tickets` table | Quality/quantity tickets tracked inline in `material_receipt_items` | Consider: create `material_tickets` for formal tracking, or keep inline |
| `behavior_tickets` status is VARCHAR, no enum | No DB-level enforcement of valid states | Consider: create `behavior_ticket_status` enum |
| `leave_applications.status` is VARCHAR, no enum | No DB-level enforcement of valid states | Consider: create `leave_status` enum |
| `attendance_logs.status` is VARCHAR, no enum | No DB-level enforcement of valid states | Consider: create `attendance_status` enum |

---

_Last updated: 2026-02-14 — v2.0 (DB-Verified)_
_Previous: v1.0 was based on SQL file analysis only._
_Update this file after every migration._

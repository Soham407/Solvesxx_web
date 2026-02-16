# 🛑 OPERATIONAL REALITY REVIEW

> **Status:** CRITICAL FINDINGS
> **Review Date:** 2026-02-15
> **Scope:** Day-2 Operations, Scale, & Entropy

This document identifies **slow-burn failures** that will only appear after weeks or months of real usage. These are not code bugs; they are **operational debts**.

---

## 1. 🚨 HIGH-RISK (Must Fix Before Scale)
*These issues will degrade system performance or break workflows within 3-6 months.*

### 1.1. Unbounded Notification Table Growth
* **Risk:** `notifications` table has no partitioning and originally had only a basic primary key index.
* **Impact (3-6 months):** As notifications accumulate (checklists, alerts, approvals), queries filtering by `user_id` or `is_read` will slow down exponentially. The dashboard load time will degrade.
* **Evidence:** Table exists. No archival policy.
* **Mitigation:**
  - [x] **Add Index:** ✅ APPLIED — `idx_notifications_user_unread` and `idx_notifications_created_at` created.
  - [ ] **Retention Policy:** Create a cron job to move read notifications > 30 days to a `notifications_archive` table or delete them.

### 1.2. The "Hotel California" Visitor Problem
* **Risk:** Visitors are checked in but there is no **automated force-checkout** mechanism.
* **Impact (2-4 weeks):** Guards will forget to check visitors out. Status monitors (dashboard) will show "Active Visitors: 5,600" after a month. Security supervisor will stop trusting the dashboard.
* **Evidence:** `visitors` table has `exit_time`. Previously had no cron job handling stale visitors.
* **Mitigation:**
  - [x] **Cron Job:** ✅ APPLIED — `auto-exit-visitors` runs daily at 3 AM via `auto_exit_stale_visitors()`. Force-exits visitors checked in > 24h.

### 1.3. Audit Log Explosion
* **Risk:** `audit_logs` captures every critical action but is not partitioned.
* **Impact (6 months):** This table will become the largest in the DB. Joins against it for "History" tabs will time out.
* **Evidence:** `audit_logs` exists in `public` schema without partitioning strategies active.
* **Mitigation:**
  - [ ] **Partitioning:** Implement monthly partitioning `BY RANGE (created_at)` similar to `gps_tracking`.
  - [ ] **Cold Storage:** Move logs > 6 months to S3/Blob storage (CSV dump) and delete from DB.

### 1.4. Storage Cost Slow-Burn (Photos)
* **Risk:** High-frequency photo uploads (Guard Selfies, Visitor Photos, Checklist Proofs) are stored in Supabase Storage buckets.
* **Impact (6-12 months):** Storage costs will balloon. 10 guards * 3 shifts * 365 days = ~11,000 selfies/year per site.
* **Evidence:** Buckets `visitor-photos`, `attendance-selfies`, `checklist-evidence` exist. No lifecycle policies observed.
* **Mitigation:**
  - [ ] **Lifecycle Rules:** Configure Supabase Storage to auto-delete:
    - `attendance-selfies` > 30 days.
    - `visitor-photos` > 60 days.
    - `checklist-evidence` > 90 days.

---

## 2. ⚠️ MEDIUM-RISK (Monitor & Mitigate)
*These issues cause friction but can be managed with SOPs.*

### 2.1. GPS Tracking Data Volume
* **Risk:** `gps_tracking` is partitioned (Excellent!), but row volume is massive (every 5 mins per active guard).
* **Impact:** DB size grows rapidly. Index maintenance becomes heavy.
* **Mitigation:**
  - [ ] **Validation:** Ensure cron job `pg_partman` (or equivalent) is actually running to create *future* partitions. Attempting to insert into a non-existent partition will crash the tracking hook.
  - [ ] **Data Pruning:** Drop partitions older than 3 months. GPS history beyond 90 days is rarely legally required for standard security (compliance checks usually need logs, not raw lat/long).

### 2.2. Orphaned Procurement Requests
* **Risk:** Procurement requests (`requests` table) have no "Expiry".
* **Impact:** Dashboards get clogged with "Pending" requests from 6 months ago that will never be fulfilled.
* **Mitigation:**
  - [ ] **Auto-Reject:** Job to set `status = 'rejected'`, `rejection_reason = 'Auto-expired after 30 days inactivity'` for old pending requests.

### 2.3. Payroll Calculation Trust
* **Risk:** Payroll logic resides in complex SQL function `calculate_employee_salary` and Client-side Hook `usePayroll`.
* **Impact:** If logic drifts (DB updated but UI not, or vice versa), the "Preview" will differ from the "Final generated slip," causing massive trust issues with Staff.
* **Mitigation:**
  - [ ] **Single Source of Truth:** Ensure UI *always* calls a DB function (simulation mode) for preview, never calculating in JS. (Note: Code comments suggest this is done, but verification is key).

---

## 3. 🛡️ RECOVERY PATHS (Operational Reality)
*When things go wrong, how do we fix them?*

| Failure Scenario | Recovery Tool | Operational Risk |
| :--- | :--- | :--- |
| **Guard forgets to Check-Out** | System Auto-Punch (Geo-fence) | 🟢 Low (Automated) |
| **Visitor forgets to Check-Out** | Auto-Exit Cron (24h) ✅ | � Low (Automated) |
| **Wrong Salary Generated** | **Manual SQL Required** ❌ | 🔴 **High** (Needs "Regenerate" Button) |
| **Material Receipt Entry Error** | No "Undo" in UI | 🟠 Medium (Downstream reconciliation breaks) |
| **GPS Tracking Stops** | No "System Health" Dashboard | 🟠 Medium (Silent Failure) |

**Recommendation:** Build a "Super Admin" Operational Dashboard that allows:
1. Force-Exit Visitor.
2. Regenerate Payslip (Void & Re-run).
3. Unlock/Edit GRN (with audit trail).

---

## 4. 📉 OBSERVABILITY GAPS
*Failures that will happen in silence.*

1.  **Cron Job Failures:** If `pg_cron` jobs fail (e.g., `detect_geofence_breaches` crashes due to bad data), who knows?
    *   *Fix:* Add `ON ERROR` notification to a specific "System Health" channel/table.
2.  **Notification Delivery:** If FCM/SMS fails, it's logged to `notification_logs`, but no one watches that table.
    *   *Fix:* Alert if `notification_logs` failure rate > 5% in last hour.

---

## 5. ✅ NON-ISSUES (Explicitly Ruled Out)

*   **Partitioning for GPS:** Already implemented (`gps_tracking_YYYY_MM`). Great work.
*   **Concurrency:** Row Level Security (RLS) is robust (audited separately).
*   **Financial Integrity:** `execute_reconciliation_match` handles the heavy math in ACID-compliant SQL, not fragile frontend JS.

---

## 🏁 SUMMARY & NEXT STEPS

The system is **90% ready** for Day-1. The remaining 10% is ensuring Day-100 doesn't crash.

**Immediate Remediation Checklist:**
1.  [x] ~~Add partial index to `notifications` table.~~ ✅ DONE
2.  [x] ~~Create "Auto-Exit Visitor" Cron Job.~~ ✅ DONE
3.  [ ] Implement Storage Bucket Lifecycle Rules (30/60/90 days).
4.  [ ] Verify `pg_cron` jobs report failures to an accessible log/alert.

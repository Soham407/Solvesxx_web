# MCP Execution Guide — Phase E Operational Truth

**Purpose:** Step-by-step commands for executing the Operational Truth Implementation Plan using Supabase MCP Server.

**Prerequisite:** Ensure you have access to the Supabase MCP Server in your AI IDE.

---

## 🎯 Daily Execution Checklist

### Day 1: Delivery Truth Engine

#### Morning (Database Setup)

**Step 1.1: Verify Current Schema**
```
AI IDE Command:
"Use the Supabase MCP to check if the table 'material_arrival_logs' exists in the public schema."

Expected Response: Table does not exist (new table)
```

**Step 1.2: Apply Migration**
```
AI IDE Command:
"Use the Supabase MCP to execute the following migration:

[Copy the entire SQL from OPERATIONAL_TRUTH_IMPLEMENTATION_PLAN.md, Day 1, Section 1.1]

Confirm:
1. Table created successfully
2. RLS policies applied
3. Indexes created
4. RPC function created
"

Expected Response: Migration successful, all objects created
```

**Step 1.3: Test RPC with Valid Input**
```
AI IDE Command:
"Use the Supabase MCP to test the 'log_material_arrival' RPC with the following parameters:

p_po_id: [Get a valid PO UUID from purchase_orders table]
p_vehicle_number: 'MH01AB1234'
p_arrival_photo_url: 'https://[your-project].supabase.co/storage/v1/object/public/deliveries/test.jpg'
p_gate_location: 'Main Gate'
p_notes: 'Test arrival log'

Expected: Should return a UUID (log_id)
"
```

**Step 1.4: Test RPC with Invalid Input (Security Test)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'log_material_arrival' RPC with an invalid photo URL:

p_po_id: [Valid PO UUID]
p_vehicle_number: 'MH01AB1234'
p_arrival_photo_url: 'https://malicious-site.com/fake.jpg'

Expected: Should raise exception 'Invalid photo URL: Must be from Supabase Storage'
"
```

**Step 1.5: Verify RLS Policies**
```
AI IDE Command:
"Use the Supabase MCP to list all RLS policies on the 'material_arrival_logs' table.

Verify:
1. 'delivery_boy_can_log_arrivals' policy exists for INSERT
2. 'all_can_view_arrival_logs' policy exists for SELECT
3. RLS is enabled on the table
"
```

#### Afternoon (Frontend Implementation)

**Step 1.6: Create Frontend Hook**
- Create `hooks/useDeliveryLogs.ts` (copy from implementation plan)
- Test in isolation with a simple React component

**Step 1.7: Update Delivery Dashboard**
- Replace `ComingSoon` in `components/dashboards/DeliveryDashboard.tsx`
- Implement evidence upload modal
- Wire to `useDeliveryLogs` hook

**Step 1.8: End-to-End Test**
- Login as a delivery_boy user
- Navigate to Delivery Dashboard
- Select a PO and upload a photo
- Verify log is created in database
- Verify photo is stored in Supabase Storage

**Day 1 Exit Criteria:**
- [ ] Migration applied successfully
- [ ] RPC tested with valid and invalid inputs
- [ ] RLS policies verified
- [ ] Frontend hook created and tested
- [ ] Delivery Dashboard updated
- [ ] End-to-end test passed

---

### Day 2: Service Boy Evidence Capture

#### Morning (Database Setup)

**Step 2.1: Verify Current Schema**
```
AI IDE Command:
"Use the Supabase MCP to describe the 'service_requests' table schema.

Check if these columns exist:
- before_photo_url
- after_photo_url
- completion_signature_url
"

Expected Response: Columns may or may not exist (we'll add them)
```

**Step 2.2: Apply Migration**
```
AI IDE Command:
"Use the Supabase MCP to execute the following migration:

[Copy the entire SQL from OPERATIONAL_TRUTH_IMPLEMENTATION_PLAN.md, Day 2, Section 2.1]

Confirm:
1. Columns added to service_requests
2. CHECK constraint created
3. Both RPCs created (start_service_task, complete_service_task)
"
```

**Step 2.3: Test Start Service Task RPC**
```
AI IDE Command:
"Use the Supabase MCP to test the 'start_service_task' RPC:

p_request_id: [Valid service request UUID assigned to current user]
p_before_photo_url: 'https://[your-project].supabase.co/storage/v1/object/public/service-photos/before-test.jpg'

Expected: Should return TRUE and update status to 'in_progress'
"
```

**Step 2.4: Test Complete Service Task RPC (Should Fail Without Photo)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'complete_service_task' RPC with NULL photo:

p_request_id: [Same request ID from Step 2.3]
p_after_photo_url: NULL

Expected: Should raise exception 'After photo is mandatory for task completion'
"
```

**Step 2.5: Test Complete Service Task RPC (Should Succeed)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'complete_service_task' RPC with valid photo:

p_request_id: [Same request ID]
p_after_photo_url: 'https://[your-project].supabase.co/storage/v1/object/public/service-photos/after-test.jpg'
p_completion_notes: 'Task completed successfully'

Expected: Should return TRUE and update status to 'completed'
"
```

**Step 2.6: Verify CHECK Constraint**
```
AI IDE Command:
"Use the Supabase MCP to attempt a direct UPDATE on service_requests:

UPDATE service_requests
SET status = 'completed', after_photo_url = NULL
WHERE id = '[request_id]';

Expected: Should fail with constraint violation error
"
```

#### Afternoon (Frontend Implementation)

**Step 2.7: Update Service Requests Hook**
- Add `startServiceTask` and `completeServiceTask` methods to `hooks/useServiceRequests.ts`

**Step 2.8: Update Service Boy Dashboard**
- Add "Start Task" button with before photo modal
- Add "Complete Task" button with after photo modal
- Implement photo upload with `EvidenceUploader` component

**Step 2.9: End-to-End Test**
- Login as a service technician
- Start a task and upload before photo
- Complete the task and upload after photo
- Verify both photos are stored and task is marked complete

**Day 2 Exit Criteria:**
- [ ] Migration applied successfully
- [ ] Both RPCs tested (start and complete)
- [ ] CHECK constraint verified
- [ ] Frontend hook updated
- [ ] Service Boy Dashboard updated
- [ ] End-to-end test passed

---

### Day 3: Finance 3-Way Match Hard-Lock

#### Morning (Database Setup)

**Step 3.1: Verify Current Schema**
```
AI IDE Command:
"Use the Supabase MCP to describe the 'supplier_bills' table schema.

Check if these columns exist:
- reconciliation_status
"

Expected Response: Column may or may not exist
```

**Step 3.2: Apply Migration**
```
AI IDE Command:
"Use the Supabase MCP to execute the following migration:

[Copy the entire SQL from OPERATIONAL_TRUTH_IMPLEMENTATION_PLAN.md, Day 3, Section 3.1]

Confirm:
1. reconciliation_status column added
2. CHECK constraint created (payment_requires_reconciliation)
3. audit_logs table created
4. RLS policies applied
5. Both RPCs created (validate_bill_for_payout, force_match_bill)
"
```

**Step 3.3: Test Validate Bill RPC (Unreconciled Bill)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'validate_bill_for_payout' RPC:

p_bill_id: [Valid bill UUID with reconciliation_status = 'pending']

Expected: Should return can_pay = FALSE, reason = 'Bill not reconciled...'
"
```

**Step 3.4: Test Validate Bill RPC (Reconciled Bill)**
```
AI IDE Command:
"First, update a bill to 'matched' status:

UPDATE supplier_bills
SET reconciliation_status = 'matched'
WHERE id = '[bill_id]';

Then test the RPC:

p_bill_id: [Same bill UUID]

Expected: Should return can_pay = TRUE, reason = 'Bill is ready for payout'
"
```

**Step 3.5: Test Force Match RPC (Non-Admin User)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'force_match_bill' RPC as a non-admin user:

p_bill_id: [Valid bill UUID]
p_override_reason: 'Emergency payment required due to supplier pressure'

Expected: Should raise exception 'Unauthorized: Only admins can force match bills'
"
```

**Step 3.6: Test Force Match RPC (Admin User)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'force_match_bill' RPC as an admin user:

p_bill_id: [Valid bill UUID]
p_override_reason: 'Emergency payment approved by CFO for critical supplier'

Expected: Should return TRUE and create audit log entry
"
```

**Step 3.7: Verify Audit Log**
```
AI IDE Command:
"Use the Supabase MCP to query the audit_logs table:

SELECT * FROM audit_logs
WHERE entity_type = 'supplier_bill'
AND entity_id = '[bill_id]'
ORDER BY created_at DESC
LIMIT 1;

Expected: Should show the force_match action with reason and user email
"
```

**Step 3.8: Test CHECK Constraint**
```
AI IDE Command:
"Use the Supabase MCP to attempt a direct UPDATE:

UPDATE supplier_bills
SET status = 'paid', reconciliation_status = 'pending'
WHERE id = '[bill_id]';

Expected: Should fail with constraint violation error
"
```

#### Afternoon (Frontend Implementation)

**Step 3.9: Update Supplier Bills Page**
- Add `validate_bill_for_payout` call before enabling "Record Payout" button
- Add tooltip showing reason if button is disabled
- Add "Force Match" button (admin only) with reason modal

**Step 3.10: End-to-End Test**
- Login as finance manager
- Attempt to pay an unreconciled bill (should be blocked)
- Reconcile the bill manually
- Verify payout button is now enabled
- Login as admin and test force match with reason

**Day 3 Exit Criteria:**
- [ ] Migration applied successfully
- [ ] Both RPCs tested (validate and force_match)
- [ ] CHECK constraint verified
- [ ] Audit log verified
- [ ] Frontend updated
- [ ] End-to-end test passed

---

### Day 4: Privacy-Safe Resident Directory

#### Morning (Database Setup)

**Step 4.1: Apply Migration**
```
AI IDE Command:
"Use the Supabase MCP to execute the following migration:

[Copy the entire SQL from OPERATIONAL_TRUTH_IMPLEMENTATION_PLAN.md, Day 4, Section 4.1]

Confirm:
1. View 'resident_verification_view' created
2. Phone masking logic works correctly
3. RPC 'search_residents' created
"
```

**Step 4.2: Test View (Verify Phone Masking)**
```
AI IDE Command:
"Use the Supabase MCP to query the resident_verification_view:

SELECT full_name, phone, masked_phone
FROM resident_verification_view
LIMIT 5;

Expected: masked_phone should show format like '91****34' for phone '9123456734'
"
```

**Step 4.3: Test Search RPC (Valid Guard User)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'search_residents' RPC as a guard user:

p_query: 'Sharma'
p_society_id: [Valid society UUID]

Expected: Should return residents with 'Sharma' in name, with masked phones
"
```

**Step 4.4: Test Search RPC (Non-Guard User)**
```
AI IDE Command:
"Use the Supabase MCP to test the 'search_residents' RPC as a non-guard user (e.g., resident):

p_query: 'Sharma'

Expected: Should raise exception 'Unauthorized: Only security personnel can search residents'
"
```

**Step 4.5: Test Search by Flat Number**
```
AI IDE Command:
"Use the Supabase MCP to test the 'search_residents' RPC:

p_query: '402'

Expected: Should return residents in flats containing '402' (e.g., 402, 4020, A-402)
"
```

#### Afternoon (Frontend Implementation)

**Step 4.6: Create Resident Lookup Hook**
- Create `hooks/useResidentLookup.ts` (copy from implementation plan)

**Step 4.7: Update Guard Dashboard**
- Add search interface to `app/(dashboard)/test-guard/page.tsx`
- Implement debounced search (300ms)
- Display results in card grid with profile photos

**Step 4.8: End-to-End Test**
- Login as a guard
- Search for a resident by name
- Search for a resident by flat number
- Verify masked phone numbers are displayed
- Verify non-guards cannot access the search

**Day 4 Exit Criteria:**
- [ ] Migration applied successfully
- [ ] View created with phone masking
- [ ] RPC tested with valid and invalid users
- [ ] Frontend hook created
- [ ] Guard dashboard updated
- [ ] End-to-end test passed

---

### Day 5: HRMS Compliance (BGV & Payroll)

#### Morning (Database Setup)

**Step 5.1: Apply Migration**
```
AI IDE Command:
"Use the Supabase MCP to execute the following migration:

[Copy the entire SQL from OPERATIONAL_TRUTH_IMPLEMENTATION_PLAN.md, Day 5, Section 5.1]

Confirm:
1. Columns added to employees table
2. CHECK constraint created (hiring_requires_bgv)
3. Trigger created (update_bgv_docs_count)
"
```

**Step 5.2: Test BGV Constraint (Should Fail)**
```
AI IDE Command:
"Use the Supabase MCP to attempt hiring without BGV docs:

UPDATE employees
SET status = 'hired', bgv_docs_count = 0
WHERE id = '[employee_id]';

Expected: Should fail with constraint violation error
"
```

**Step 5.3: Test BGV Constraint (Should Succeed)**
```
AI IDE Command:
"Use the Supabase MCP to hire with BGV docs:

UPDATE employees
SET status = 'hired', bgv_docs_count = 2
WHERE id = '[employee_id]';

Expected: Should succeed
"
```

**Step 5.4: Test Trigger (Auto-Update BGV Count)**
```
AI IDE Command:
"Use the Supabase MCP to insert a BGV document:

INSERT INTO employee_documents (
    employee_id,
    document_type,
    document_url
) VALUES (
    '[employee_id]',
    'police_verification',
    'https://[project].supabase.co/storage/v1/object/public/bgv-docs/police-cert.pdf'
);

Then verify the trigger updated the count:

SELECT bgv_docs_count FROM employees WHERE id = '[employee_id]';

Expected: bgv_docs_count should increment by 1
"
```

#### Afternoon (Frontend Implementation)

**Step 5.5: Update Recruitment Page**
- Add `EvidenceUploader` for BGV documents in `app/(dashboard)/hrms/recruitment/page.tsx`
- Add validation to prevent hiring without 2+ BGV docs

**Step 5.6: Implement Payslip Generation**
- Add `generatePayslip` method to `hooks/usePayroll.ts`
- Use `jspdf` to generate PDF with salary breakdown
- Add download button in `app/(dashboard)/hrms/payroll/page.tsx`

**Step 5.7: End-to-End Test**
- Upload BGV documents for a candidate
- Verify bgv_docs_count is updated
- Attempt to hire the candidate (should succeed)
- Generate and download a payslip

**Day 5 Exit Criteria:**
- [ ] Migration applied successfully
- [ ] CHECK constraint verified
- [ ] Trigger tested
- [ ] Frontend updated (BGV upload)
- [ ] Payslip generation implemented
- [ ] End-to-end test passed

---

### Day 6: Type Safety & Stability Sprint

#### Morning (Type Generation)

**Step 6.1: Generate Supabase Types**
```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
```

**Step 6.2: Verify Types**
```
AI IDE Command:
"Check the generated types in src/types/supabase.ts.

Verify that types exist for:
- material_arrival_logs
- service_requests (with new columns)
- supplier_bills (with reconciliation_status)
- audit_logs
"
```

#### Afternoon (Hook Refactoring)

**Step 6.3: Refactor usePurchaseOrders.ts**
- Replace all `as any` with proper types
- Use `Database['public']['Tables']['purchase_orders']['Row']`
- Add explicit return types

**Step 6.4: Refactor useAttendance.ts**
- Same process as Step 6.3

**Step 6.5: Refactor useVisitors.ts**
- Same process as Step 6.3

**Step 6.6: Refactor useServiceRequests.ts**
- Same process as Step 6.3
- Include new columns (before_photo_url, after_photo_url)

**Step 6.7: Refactor useGRN.ts**
- Same process as Step 6.3

**Step 6.8: Mobile Optimization**
- Remove `"use client"` from Dashboard page (use Server Components)
- Add skeleton loaders to Visitor Logs
- Implement virtualized list for Service Requests

**Day 6 Exit Criteria:**
- [ ] Types generated successfully
- [ ] Top 5 hooks refactored (zero `as any`)
- [ ] Mobile optimization completed
- [ ] No TypeScript errors
- [ ] Build succeeds

---

### Day 7: Final Audit & Production Smoke Test

#### Morning (Database Audit)

**Step 7.1: Verify All Migrations**
```
AI IDE Command:
"Use the Supabase MCP to list all tables created in Phase E:

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'material_arrival_logs',
    'audit_logs'
);

Expected: Both tables should exist
"
```

**Step 7.2: Verify All RPCs**
```
AI IDE Command:
"Use the Supabase MCP to list all functions created in Phase E:

SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'log_material_arrival',
    'start_service_task',
    'complete_service_task',
    'validate_bill_for_payout',
    'force_match_bill',
    'search_residents'
);

Expected: All 6 functions should exist
"
```

**Step 7.3: Verify All Constraints**
```
AI IDE Command:
"Use the Supabase MCP to list all CHECK constraints:

SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'c'
AND conname IN (
    'service_completion_requires_photo',
    'payment_requires_reconciliation',
    'hiring_requires_bgv'
);

Expected: All 3 constraints should exist
"
```

#### Afternoon (Production Smoke Test)

**Step 7.4: Test Scenario 1 (Delivery Boy)**
- Login as delivery_boy
- Navigate to Delivery Dashboard
- Select a PO
- Upload arrival photo
- Verify log is created

**Step 7.5: Test Scenario 2 (Service Boy)**
- Login as service technician
- Start a task with before photo
- Complete task with after photo
- Verify photos are stored

**Step 7.6: Test Scenario 3 (Finance Manager)**
- Login as finance_manager
- Attempt to pay unreconciled bill (should fail)
- Verify error message is clear

**Step 7.7: Test Scenario 4 (Guard)**
- Login as security_guard
- Search for a resident
- Verify masked phone is displayed

**Step 7.8: Test Scenario 5 (HR Manager)**
- Login as HR manager
- Attempt to hire without BGV docs (should fail)
- Upload BGV docs
- Hire successfully

**Step 7.9: Test Scenario 6 (Employee)**
- Login as employee
- Navigate to Payroll
- Download payslip
- Verify PDF is generated correctly

**Day 7 Exit Criteria:**
- [ ] All migrations verified
- [ ] All RPCs verified
- [ ] All constraints verified
- [ ] All 6 smoke test scenarios passed
- [ ] No errors in production logs
- [ ] System ready for Go-Live

---

## 🔧 Troubleshooting Guide

### Common Issues

**Issue 1: RPC Permission Denied**
```
Error: permission denied for function [function_name]

Solution:
GRANT EXECUTE ON FUNCTION [function_name] TO authenticated;
```

**Issue 2: RLS Policy Blocks Valid User**
```
Error: new row violates row-level security policy

Solution:
1. Check user role: SELECT role FROM users WHERE id = auth.uid();
2. Verify RLS policy includes the user's role
3. Add missing role to policy if needed
```

**Issue 3: CHECK Constraint Violation**
```
Error: new row for relation "[table]" violates check constraint "[constraint_name]"

Solution:
1. Review the constraint definition
2. Ensure all required fields are populated
3. Use RPC instead of direct INSERT/UPDATE
```

**Issue 4: Photo Upload Fails**
```
Error: Invalid photo URL

Solution:
1. Verify photo is uploaded to Supabase Storage first
2. Ensure URL format matches: https://[project].supabase.co/storage/v1/object/...
3. Check storage bucket permissions
```

---

## 📊 Daily Progress Tracker

| Day | Task | Status | Blocker | Notes |
|-----|------|--------|---------|-------|
| 1 | Delivery Truth Engine | ⬜ | | |
| 2 | Service Evidence | ⬜ | | |
| 3 | Finance 3-Way Match | ⬜ | | |
| 4 | Resident Directory | ⬜ | | |
| 5 | HRMS Compliance | ⬜ | | |
| 6 | Type Safety | ⬜ | | |
| 7 | Final Audit | ⬜ | | |

**Legend:**
- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- 🔴 Blocked

---

**Document Owner:** Production Delivery Engineer  
**Last Updated:** 2026-02-17

---

*Use this guide as your daily execution checklist. Update the progress tracker at the end of each day.*

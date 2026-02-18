# Phase E Remediation Plan: "Closing the Loop"

## 🎯 Objective
To resolve critical deviations from the Phase E implementation plan, specifically focusing on the "Delivery" half of the system. We must move logic from Edge Functions back to the Database (RPCs) and ensure that detection events actually trigger notifications (SMS/Push) instead of just logging to a table.

---

## 🏗️ Implementation Phases

### Phase 1: Database Foundation (The "Brain")
**Goal:** Centralize expiration logic and data structures in the database to prevent "logic drift" in Edge Functions.

#### 1.1 Create Missing Tables
- **Table:** `safety_equipment`
  - Columns: `id` (UUID), `equipment_name` (TargetContent), `type` (Text), `expiry_date` (Date), `status` (Text), `location` (Text).
  - Policies: Enable RLS.
- **Table:** `expiry_tracking` (View)
  - Purpose: Unify `pest_control_chemicals`, `safety_equipment`, and `employee_documents` into a single searchable view.

#### 1.2 Implement Database Logic (RPCs)
- **Function:** `detect_expiring_items(days_ahead int)`
  - Returns: `item_id`, `item_name`, `days_remaining`, `severity` ('critical', 'warning').
  - Logic: Queries the `expiry_tracking` view.
- **Function:** `log_notification_event` (Optional but recommended)
  - standardizes how we log that a notification was *attempted*.

---

### Phase 2: Edge Function Refactoring (The "Delivery")
**Goal:** Fix the broken MSG91 integration and make Edge Functions "dumb" schedulers.

#### 2.1 Fix `send-notification`
- **Current Issue:** Uses `api/v5/otp/send` which is restricted to OTPs and fails for alerts.
- **Fix:** Switch to `api/v5/flow/` (Flow API).
  - Payload: `{ template_id, recipients: [{ mobiles, var1, var2 }] }`.
  - Auth: Ensure `authkey` is passed correctly in headers.

#### 2.2 Refactor `check-document-expiry`
- **Current Issue:** Performs raw DB queries (`.from('employee_documents')...`).
- **Fix:**
  - Call `rpc('detect_expiring_items')`.
  - Iterate results.
  - Call `send-notification` for each expiring item.

---

### Phase 3: Closing the Loop (The "Nervous System")
**Goal:** Ensure that *all* detection events (inactivity, checklists, expiry) trigger actual alerts.

#### 3.1 Unify Notification Calls
- Update the following Cron Functions to call `send-notification`:
  - `check-guard-inactivity`: Currently just inserts into DB.
  - `check-checklist-completion`: Currently just inserts into DB.
  
#### 3.2 Verify Routing Matrix
- Ensure "Critical" severity events force `channel: 'both'` (SMS + Push).
- Ensure "Warning" severity events use `channel: 'fcm'` (Push only) or 'both' depending on configuration.

---

## 📜 Execution Steps

### Step 1: Database Migration
Run the following SQL in Supabase SQL Editor:

```sql
-- 1. Create Safety Equipment Table
CREATE TABLE IF NOT EXISTS safety_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('spill_kit', 'fire_extinguisher', 'first_aid', 'ppe')),
    expiry_date DATE,
    location TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON safety_equipment FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON safety_equipment FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON safety_equipment FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Create Unified Expiry View
CREATE OR REPLACE VIEW expiry_tracking AS
-- Chemicals from Stock Batches
SELECT 
    sb.id as item_id, 
    p.product_name || ' (' || sb.batch_number || ')' as item_name, 
    'chemical' as item_type,
    sb.expiry_date, 
    'pest_control' as category
FROM stock_batches sb
JOIN products p ON sb.product_id = p.id
WHERE sb.expiry_date IS NOT NULL AND sb.current_quantity > 0

UNION ALL

-- Safety Equipment
SELECT 
    id as item_id, 
    equipment_name as item_name, 
    'safety_equipment' as item_type,
    expiry_date, 
    'safety' as category
FROM safety_equipment 
WHERE expiry_date IS NOT NULL AND status = 'active'
UNION ALL

-- Documents
SELECT 
    ed.id as item_id, 
    ed.document_name as item_name, 
    'document' as item_type,
    ed.expiry_date, 
    'compliance' as category
FROM employee_documents ed
WHERE ed.expiry_date IS NOT NULL;

-- 3. Create Detection RPC
CREATE OR REPLACE FUNCTION detect_expiring_items(p_days_ahead INT DEFAULT 30)
RETURNS TABLE (
    item_id UUID, item_name TEXT, item_type TEXT, 
    days_left INT, severity TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        et.item_id::UUID, et.item_name, et.item_type,
        (et.expiry_date - CURRENT_DATE)::INT as days_left,
        CASE 
            WHEN (et.expiry_date - CURRENT_DATE) <= 3 THEN 'critical'
            WHEN (et.expiry_date - CURRENT_DATE) <= 7 THEN 'warning'
            ELSE 'info'
        END::TEXT as severity
    FROM expiry_tracking et
    WHERE et.expiry_date <= (CURRENT_DATE + p_days_ahead)
    AND et.expiry_date >= CURRENT_DATE;
END;
$$;
```

### Step 2: Deploy Edge Functions
1. Modify `supabase/functions/send-notification/index.ts`.
2. Modify `supabase/functions/check-document-expiry/index.ts`.
3. Modify `supabase/functions/check-guard-inactivity/index.ts`.
4. Run `supabase functions deploy`.

### Step 3: Verification
1. Insert a dummy record in `safety_equipment` expiring tomorrow.
2. Manually trigger `check-document-expiry` via Curl.
3. Verify SMS received.

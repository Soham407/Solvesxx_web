# Task 4: Checklist Reminder System - Testing Guide

## Overview
This system automatically detects security guards with incomplete daily checklists and creates reminder alerts for supervisors.

**Key Features:**
- Monitors completion percentage (default: alerts if < 50%)
- Only alerts after shift midpoint (prevents early false alarms)
- One alert per guard per day (prevents spam)
- Shows pending task details in alert

## Files Created

1. **SQL Functions:** `supabase/PhaseA/functions_checklist_reminders.sql`
   - `get_shift_checklist_items()` - Returns checklist items for a shift
   - `get_guard_checklist_completion()` - Gets completion stats for a guard
   - `has_active_checklist_alert()` - Checks for existing alerts
   - `get_shift_time_info()` - Returns shift timing information
   - `detect_incomplete_checklists()` - Main detection function

2. **Edge Function:** `supabase/functions/check-incomplete-checklists/index.ts`
   - HTTP endpoint with configurable threshold
   - Supports `threshold` and `only_past_midpoint` parameters

3. **Cron Configuration:** `supabase/PhaseA/cron_checklist_reminders.sql`
   - Multiple scheduling options
   - Monitoring log table
   - Shift-specific customization examples

## Step-by-Step Testing

### Step 1: Deploy SQL Functions

```sql
-- Run in Supabase SQL Editor:
\i supabase/PhaseA/functions_checklist_reminders.sql
```

**Verify deployment:**
```sql
-- Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'detect_incomplete_checklists',
    'get_shift_checklist_items',
    'get_guard_checklist_completion',
    'has_active_checklist_alert',
    'get_shift_time_info'
);
```

Expected: 5 rows returned

### Step 2: Verify Prerequisites

**Check 1: Ensure shifts exist**
```sql
SELECT id, shift_name, start_time, end_time 
FROM shifts 
WHERE is_active = true;
```

If no results, create a test shift:
```sql
INSERT INTO shifts (shift_name, start_time, end_time, organization_id)
VALUES (
    'Morning Shift',
    '06:00:00',
    '14:00:00',
    (SELECT id FROM organizations LIMIT 1)
);
```

**Check 2: Ensure checklist items exist**
```sql
SELECT 
    dci.id,
    dci.task_name,
    dci.category,
    s.shift_name
FROM daily_checklist_items dci
JOIN shifts s ON dci.shift_id = s.id
WHERE dci.is_active = true
LIMIT 10;
```

If no results, create test checklist items:
```sql
-- Get a shift ID
SELECT id FROM shifts WHERE shift_name = 'Morning Shift' LIMIT 1;

-- Insert checklist items (replace SHIFT-ID with actual ID)
INSERT INTO daily_checklist_items (shift_id, task_name, category, priority, is_active)
VALUES
    ('SHIFT-ID', 'Check main gate', 'Security', 1, true),
    ('SHIFT-ID', 'Verify CCTV cameras', 'Security', 2, true),
    ('SHIFT-ID', 'Inspect parking area', 'Security', 3, true),
    ('SHIFT-ID', 'Check fire extinguishers', 'Safety', 4, true),
    ('SHIFT-ID', 'Report incident log', 'Documentation', 5, true);
```

**Check 3: Assign guard to shift**
```sql
-- View guards without shift assignment
SELECT sg.id, e.first_name, sg.shift_id
FROM security_guards sg
JOIN employees e ON sg.employee_id = e.id
WHERE sg.shift_id IS NULL;

-- Assign a guard to shift (replace with actual IDs)
UPDATE security_guards 
SET shift_id = 'SHIFT-ID-HERE'
WHERE id = 'GUARD-ID-HERE';
```

### Step 3: Create Test Scenario

**Setup test data:**

```sql
-- Step 1: Get a test guard who is clocked in
SELECT 
    sg.id as guard_id, 
    sg.employee_id,
    sg.shift_id,
    e.first_name,
    e.last_name
FROM security_guards sg
JOIN employees e ON sg.employee_id = e.id
WHERE sg.is_active = true
LIMIT 1;

-- Step 2: Ensure guard is clocked in
INSERT INTO attendance_logs (employee_id, log_date, check_in_time, status)
VALUES (
    'EMPLOYEE-ID-FROM-STEP-1',
    CURRENT_DATE,
    NOW() - INTERVAL '5 hours',  -- Clock in 5 hours ago (past midpoint)
    'present'
)
ON CONFLICT (employee_id, log_date) DO UPDATE 
SET check_in_time = NOW() - INTERVAL '5 hours',
    check_out_time = NULL;

-- Step 3: Partially complete checklist (complete 2 out of 5 items)
-- First, see what checklist items exist:
SELECT * FROM get_shift_checklist_items('SHIFT-ID-FROM-STEP-1');

-- Complete only some items (e.g., 2 out of 5)
INSERT INTO checklist_responses (item_id, employee_id, checklist_date, is_complete, responses)
VALUES
    ('ITEM-1-ID', 'EMPLOYEE-ID-FROM-STEP-1', CURRENT_DATE, true, '{"completed": true}'::jsonb),
    ('ITEM-2-ID', 'EMPLOYEE-ID-FROM-STEP-1', CURRENT_DATE, true, '{"completed": true}'::jsonb);
-- Note: Don't insert the other 3 items - we want incomplete status
```

### Step 4: Test Individual Functions

**Test 1: Get shift checklist items**
```sql
-- Replace with actual shift ID
SELECT * FROM get_shift_checklist_items('your-shift-id');
```
Expected: List of 5 checklist items

**Test 2: Get guard completion stats**
```sql
-- Replace with actual guard ID
SELECT * FROM get_guard_checklist_completion('your-guard-id', CURRENT_DATE);
```
Expected:
```
total_items | completed_items | completion_percentage | pending_items
------------|-----------------|----------------------|--------------
5           | 2               | 40.00                | [{"item_id": ...}, ...]
```

**Test 3: Check shift timing**
```sql
SELECT * FROM get_shift_time_info('your-shift-id');
```
Expected: Shows start_time, end_time, midpoint_time, minutes_remaining, is_past_midpoint

**Test 4: Run full detection**
```sql
-- Default: 50% threshold, only after midpoint
SELECT * FROM detect_incomplete_checklists();

-- Without midpoint restriction (for testing)
SELECT * FROM detect_incomplete_checklists(50.00, false);

-- Stricter threshold (70%)
SELECT * FROM detect_incomplete_checklists(70.00, false);
```

**Expected output:**
```
guard_id | guard_name | shift_name | completion_percentage | total_items | completed_items | minutes_remaining | alert_created | error_message
---------|------------|------------|----------------------|-------------|-----------------|-------------------|---------------|---------------
<uuid>   | John Doe   | Morning    | 40.00                | 5           | 2               | 180               | true          | null
```

### Step 5: Verify Alert Created

```sql
-- Check panic_alerts table
SELECT 
    pa.id,
    pa.alert_time,
    pa.alert_type,
    pa.description,
    pa.is_resolved,
    sg.guard_code,
    e.first_name || ' ' || e.last_name as guard_name
FROM panic_alerts pa
JOIN security_guards sg ON pa.guard_id = sg.id
JOIN employees e ON sg.employee_id = e.id
WHERE pa.alert_type = 'checklist_incomplete'
ORDER BY pa.alert_time DESC
LIMIT 5;
```

You should see a new checklist alert with details about pending tasks.

### Step 6: Test Duplicate Prevention

Run detection again:
```sql
SELECT * FROM detect_incomplete_checklists(50.00, false);
```

**Expected:** Same guard appears but `alert_created = false` and `error_message = 'Active alert already exists for today'`

### Step 7: Test Edge Function (Local)

**Prerequisites:**
- Supabase CLI installed
- Deno installed

**Start local function:**
```bash
supabase functions serve check-incomplete-checklists --env-file .env.local
```

**Test with curl:**
```bash
curl -X POST 'http://localhost:54321/functions/v1/check-incomplete-checklists' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"threshold": 50, "only_past_midpoint": false}'
```

**Expected response:**
```json
{
  "success": true,
  "timestamp": "2026-02-09T14:30:00.000Z",
  "config": {
    "completion_threshold": 50,
    "only_past_midpoint": false
  },
  "summary": {
    "total_incomplete": 1,
    "alerts_created": 0,
    "below_threshold_existing_alerts": 1,
    "checked_guards": 1
  },
  "results": [
    {
      "guard_id": "...",
      "guard_name": "John Doe",
      "shift_name": "Morning Shift",
      "completion_percentage": 40.00,
      "total_items": 5,
      "completed_items": 2,
      "minutes_remaining": 180,
      "alert_created": false,
      "error_message": "Active alert already exists for today"
    }
  ]
}
```

### Step 8: Deploy to Production

**Deploy the Edge Function:**
```bash
supabase functions deploy check-incomplete-checklists
```

**Get your function URL:**
```
https://<your-project>.supabase.co/functions/v1/check-incomplete-checklists
```

**Test deployed function:**
```bash
curl -X POST 'https://<your-project>.supabase.co/functions/v1/check-incomplete-checklists' \
  -H 'Authorization: Bearer <your-anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"threshold": 50, "only_past_midpoint": true}'
```

### Step 9: Set Up Automated Scheduling

Choose one of these options:

#### Option A: pg_cron (Supabase Pro/Enterprise)
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job (every 30 minutes)
SELECT cron.schedule(
  'check-incomplete-checklists',
  '*/30 * * * *',
  'SELECT detect_incomplete_checklists(50.00, true);'
);

-- Verify
SELECT * FROM cron.job;
```

#### Option B: External Cron (Free)

**Using cron-job.org:**
1. Sign up at https://cron-job.org (free)
2. Create new job:
   - Title: Check Incomplete Checklists
   - URL: `https://<your-project>.supabase.co/functions/v1/check-incomplete-checklists`
   - Schedule: Every 30 minutes
   - Method: POST
   - Headers: `Authorization: Bearer <your-anon-key>`
   - Body: `{"threshold": 50, "only_past_midpoint": true}`

**Using GitHub Actions:**
```yaml
# .github/workflows/checklist-reminder.yml
name: Check Incomplete Checklists
on:
  schedule:
    - cron: '*/30 * * * *'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "$SUPABASE_URL/functions/v1/check-incomplete-checklists" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d '{"threshold": 50, "only_past_midpoint": true}'
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Step 10: Verify in UI

1. **Supervisor Dashboard:**
   - Checklist alerts appear in "Active Emergency Alerts" section
   - Look for `alert_type = 'checklist_incomplete'`
   - Alert shows completion percentage and pending tasks

2. **Alert Details:**
   - Guard name and shift
   - Completion: X% (Y/Z items)
   - Minutes remaining in shift
   - Pending tasks list
   - Supervisor can resolve when complete

## Troubleshooting

### Issue: No guards found

**Check:**
```sql
-- Are there clocked-in guards with shifts?
SELECT 
    sg.id,
    e.first_name,
    sg.shift_id,
    al.check_in_time
FROM security_guards sg
JOIN employees e ON sg.employee_id = e.id
JOIN attendance_logs al ON al.employee_id = e.id
WHERE al.log_date = CURRENT_DATE
  AND al.check_in_time IS NOT NULL
  AND al.check_out_time IS NULL
  AND sg.shift_id IS NOT NULL;
```

**Solution:** Ensure guards are:
1. Assigned to a shift (`shift_id IS NOT NULL`)
2. Clocked in today (`attendance_logs` record exists)

### Issue: No checklist items found

**Check:**
```sql
-- Are there checklist items for active shifts?
SELECT 
    s.shift_name,
    COUNT(dci.id) as item_count
FROM shifts s
LEFT JOIN daily_checklist_items dci ON s.id = dci.shift_id AND dci.is_active = true
WHERE s.is_active = true
GROUP BY s.id, s.shift_name;
```

**Solution:** Create checklist items for the shift (see Step 2).

### Issue: Alert not created (before midpoint)

**Check shift timing:**
```sql
SELECT * FROM get_shift_time_info('your-shift-id');
```

Look at `is_past_midpoint` column.

**Solution:** Either:
1. Wait until past shift midpoint
2. Use `detect_incomplete_checklists(50.00, false)` to bypass midpoint check
3. Temporarily adjust shift times in database for testing

### Issue: Alert not created (above threshold)

**Check completion percentage:**
```sql
SELECT * FROM get_guard_checklist_completion('guard-id', CURRENT_DATE);
```

**Solution:** If completion is above 50%, either:
1. Lower the threshold: `detect_incomplete_checklists(30.00, false)`
2. Mark some checklist items as incomplete

### Issue: Duplicate alert prevention not working

**Check existing alerts:**
```sql
SELECT 
    guard_id,
    created_at,
    is_resolved
FROM panic_alerts 
WHERE alert_type = 'checklist_incomplete'
  AND guard_id = 'your-guard-id'
  AND created_at::DATE = CURRENT_DATE;
```

**Solution:** System allows one alert per guard per day. Resolve existing alert to allow new one.

### Issue: Edge Function returns 500

**Check logs:**
```bash
supabase functions logs check-incomplete-checklists --tail
```

**Common fixes:**
1. Verify SQL functions are deployed
2. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
3. Ensure RLS policies allow service_role to execute functions

## Performance Considerations

- Runs every 30 minutes (less frequent than inactivity checks)
- Only checks after shift midpoint (reduces load)
- Efficient queries with proper indexes
- One alert per guard per day (prevents spam)
- Logs stored in `checklist_reminder_logs` table

## Customization

### Adjust Threshold
```sql
-- Alert at 70% completion (stricter)
SELECT detect_incomplete_checklists(70.00, true);

-- Alert at 30% completion (more lenient)
SELECT detect_incomplete_checklists(30.00, true);
```

### Disable Midpoint Check
```sql
-- Alert anytime, not just after midpoint
SELECT detect_incomplete_checklists(50.00, false);
```

### Shift-Specific Scheduling
```sql
-- Morning shift only
SELECT cron.schedule(
  'checklist-morning',
  '0 11 * * *',  -- 11 AM daily
  'SELECT detect_incomplete_checklists(50.00, false);'
);

-- Evening shift only
SELECT cron.schedule(
  'checklist-evening',
  '0 19 * * *',  -- 7 PM daily
  'SELECT detect_incomplete_checklists(50.00, false);'
);
```

## Rollback

To disable checklist reminders:

```sql
-- Unschedule cron job
SELECT cron.unschedule('check-incomplete-checklists');

-- Delete Edge Function
-- supabase functions delete check-incomplete-checklists

-- Clear test alerts
DELETE FROM panic_alerts WHERE alert_type = 'checklist_incomplete';

-- Drop SQL functions (optional)
-- DROP FUNCTION IF EXISTS detect_incomplete_checklists(DECIMAL, BOOLEAN);
-- DROP FUNCTION IF EXISTS get_guard_checklist_completion(UUID, DATE);
-- DROP FUNCTION IF EXISTS get_shift_time_info(UUID);
-- DROP FUNCTION IF EXISTS has_active_checklist_alert(UUID, DATE);
-- DROP FUNCTION IF EXISTS get_shift_checklist_items(UUID);
```

## Summary

After successful testing:

1. ✅ Guards with incomplete checklists are detected
2. ✅ Alerts only created after shift midpoint
3. ✅ Only one alert per guard per day
4. ✅ Alert includes completion % and pending tasks
5. ✅ Supervisors see alerts on dashboard
6. ✅ System prevents duplicate alerts

**Demo Tip:** 
For your demo, prepare a guard with ~40% checklist completion to show the alert in action. Have the supervisor resolve it to demonstrate the full workflow.

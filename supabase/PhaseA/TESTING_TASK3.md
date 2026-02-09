# Task 3: Inactivity Alert System - Testing Guide

## Overview
This system automatically detects security guards who haven't moved in 15+ minutes and creates panic alerts for supervisors.

## Files Created

1. **SQL Functions:** `supabase/PhaseA/functions_inactivity_detection.sql`
   - `get_clocked_in_guards()` - Returns all currently clocked-in guards
   - `get_guard_last_position()` - Gets last GPS position for a guard
   - `has_active_inactivity_alert()` - Checks if alert already exists
   - `detect_inactive_guards()` - Main detection function

2. **Edge Function:** `supabase/functions/check-guard-inactivity/index.ts`
   - HTTP endpoint that calls the SQL detection
   - Can be invoked manually or via cron

3. **Cron Configuration:** `supabase/PhaseA/cron_inactivity_detection.sql`
   - Multiple scheduling options (pg_cron, pg_net, external)
   - Monitoring log table

## Step-by-Step Testing

### Step 1: Deploy SQL Functions

```sql
-- Run in Supabase SQL Editor:
\i supabase/PhaseA/functions_inactivity_detection.sql
```

**Verify deployment:**
```sql
-- Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('detect_inactive_guards', 'get_clocked_in_guards', 'get_guard_last_position', 'has_active_inactivity_alert');
```

Expected: 4 rows returned

### Step 2: Test Detection Logic (No Alerts Created Yet)

First, let's test without creating actual alerts:

```sql
-- View currently clocked-in guards
SELECT * FROM get_clocked_in_guards();
```

If no results: You need a guard who is clocked in. Check:
```sql
-- See today's attendance
SELECT 
    e.employee_code,
    e.first_name,
    al.check_in_time,
    al.check_out_time,
    al.log_date
FROM attendance_logs al
JOIN employees e ON al.employee_id = e.id
WHERE al.log_date = CURRENT_DATE;
```

### Step 3: Create Test Scenario

To test inactivity detection, you need:

1. **A clocked-in guard** with attendance record for today
2. **Old GPS data** for that guard (simulating inactivity)

**Setup test data:**

```sql
-- Step 1: Get a test guard ID
SELECT sg.id as guard_id, e.id as employee_id, sg.guard_code, e.first_name
FROM security_guards sg
JOIN employees e ON sg.employee_id = e.id
WHERE e.is_active = true
LIMIT 1;

-- Step 2: Ensure guard is clocked in (replace 'GUARD-ID' with actual ID)
INSERT INTO attendance_logs (employee_id, log_date, check_in_time, check_in_location_id, status)
VALUES (
    'GUARD-EMPLOYEE-ID-HERE',
    CURRENT_DATE,
    NOW() - INTERVAL '1 hour',  -- Clock in 1 hour ago
    (SELECT id FROM company_locations WHERE location_code = 'GATE-01' LIMIT 1),
    'present'
)
ON CONFLICT (employee_id, log_date) DO UPDATE 
SET check_in_time = NOW() - INTERVAL '1 hour',
    check_out_time = NULL;

-- Step 3: Insert old GPS data (20 minutes ago - exceeds 15 min threshold)
INSERT INTO gps_tracking (employee_id, latitude, longitude, tracked_at, is_mock_location)
VALUES (
    'GUARD-ID-HERE',
    18.5204,  -- Example coordinates (Pune)
    73.8567,
    NOW() - INTERVAL '20 minutes',
    false
);
```

### Step 4: Run Detection

```sql
-- Run detection with 15 minute threshold
SELECT * FROM detect_inactive_guards(15);
```

**Expected output:**
```
guard_id | guard_name | minutes_inactive | alert_created | error_message
---------|------------|------------------|---------------|---------------
<uuid>   | John Doe   | 20               | true          | GPS position is stale
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
WHERE pa.alert_type = 'inactivity'
ORDER BY pa.alert_time DESC
LIMIT 5;
```

You should see a new inactivity alert for your test guard.

### Step 6: Test Edge Function (Local)

**Prerequisites:**
- Supabase CLI installed
- Deno installed

**Start local function:**
```bash
supabase functions serve check-guard-inactivity --env-file .env.local
```

**Test with curl:**
```bash
curl -X POST 'http://localhost:54321/functions/v1/check-guard-inactivity' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json'
```

**Expected response:**
```json
{
  "success": true,
  "timestamp": "2026-02-09T10:30:00.000Z",
  "threshold_minutes": 15,
  "summary": {
    "total_inactive": 1,
    "alerts_created": 1,
    "checked_guards": 1
  },
  "results": [
    {
      "guard_id": "...",
      "guard_name": "John Doe",
      "minutes_inactive": 20,
      "alert_created": true,
      "error_message": "GPS position is stale"
    }
  ]
}
```

### Step 7: Deploy to Production

**Deploy the Edge Function:**
```bash
supabase functions deploy check-guard-inactivity
```

**Get your function URL:**
```
https://<your-project>.supabase.co/functions/v1/check-guard-inactivity
```

**Test deployed function:**
```bash
curl -X POST 'https://<your-project>.supabase.co/functions/v1/check-guard-inactivity' \
  -H 'Authorization: Bearer <your-anon-key>'
```

### Step 8: Set Up Automated Scheduling

Choose one of these options:

#### Option A: pg_cron (Supabase Pro/Enterprise)
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job (every 5 minutes)
SELECT cron.schedule(
  'check-guard-inactivity',
  '*/5 * * * *',
  'SELECT detect_inactive_guards(15);'
);

-- Verify
SELECT * FROM cron.job;
```

#### Option B: External Cron (Free)

**Using cron-job.org:**
1. Sign up at https://cron-job.org (free)
2. Create new job:
   - Title: Check Guard Inactivity
   - URL: `https://<your-project>.supabase.co/functions/v1/check-guard-inactivity`
   - Schedule: Every 5 minutes
   - Method: POST
   - Headers: `Authorization: Bearer <your-anon-key>`

**Using GitHub Actions:**
```yaml
# .github/workflows/inactivity-check.yml
name: Check Guard Inactivity
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "$SUPABASE_URL/functions/v1/check-guard-inactivity" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY"
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Step 9: Verify in UI

1. **Guard Dashboard:**
   - Inactivity won't show on guard dashboard directly
   - Guard may receive notification (if push notifications enabled)

2. **Supervisor Dashboard:**
   - Open SocietyManagerDashboard.tsx
   - Inactivity alerts appear in the "Active Emergency Alerts" section
   - Look for `alert_type = 'inactivity'`

3. **Alert Details:**
   - Alert includes guard name, location, minutes inactive
   - Supervisor can resolve the alert
   - Resolution notes can be added

## Troubleshooting

### Issue: No guards found

**Check:**
```sql
-- Are there any clocked-in guards?
SELECT COUNT(*) as clocked_in_count
FROM attendance_logs al
WHERE al.log_date = CURRENT_DATE
  AND al.check_in_time IS NOT NULL
  AND al.check_out_time IS NULL;
```

**Solution:** Ensure test guard has checked in today.

### Issue: No GPS data found

**Check:**
```sql
-- Check GPS tracking table
SELECT COUNT(*) as gps_count, MAX(tracked_at) as latest
FROM gps_tracking;
```

**Solution:** GPS tracking is done every 5 minutes by useAttendance hook. Manually insert test data.

### Issue: Alert not created (duplicate prevention)

**Check:**
```sql
-- Is there already an active alert for this guard?
SELECT * FROM panic_alerts 
WHERE guard_id = 'YOUR-GUARD-ID'
  AND alert_type = 'inactivity'
  AND is_resolved = false
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Solution:** The system prevents duplicate alerts within 1 hour. Resolve existing alert or wait 1 hour.

### Issue: Edge Function returns 500

**Check logs:**
```bash
supabase functions logs check-guard-inactivity --tail
```

**Common fixes:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars are set
2. Ensure SQL functions are deployed
3. Check RLS policies allow service_role to execute functions

## Performance Considerations

- Detection runs every 5 minutes
- Queries are indexed (gps_tracking has indexes on employee_id + tracked_at)
- Duplicate alerts prevented (1 hour cooldown per guard)
- Logs are stored in `inactivity_check_logs` table for monitoring

## Next Steps

After testing successfully:

1. ✅ Monitor for a few days to ensure false positive rate is low
2. ✅ Adjust threshold (15 minutes) if needed based on site requirements
3. ✅ Add push notifications for critical inactivity alerts
4. ✅ Consider escalating unresolved alerts after 30 minutes

## Rollback

To disable inactivity detection:

```sql
-- Unschedule cron job
SELECT cron.unschedule('check-guard-inactivity');

-- Or delete Edge Function
-- supabase functions delete check-guard-inactivity

-- Clear test alerts
DELETE FROM panic_alerts WHERE alert_type = 'inactivity';
```

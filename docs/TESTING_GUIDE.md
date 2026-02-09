# Guard & Resident Dashboard Testing Guide

## Quick Start
Your dev server is running at: `http://localhost:3000`

### Test URLs:
- **Guard Dashboard**: http://localhost:3000/test-guard
- **Resident Dashboard**: http://localhost:3000/test-resident

---

## Priority 1: Guard Dashboard Testing

### Access Guard UI:
Navigate to: **http://localhost:3000/test-guard**

### Test Scenarios:

#### 1. GPS/Geofencing Test ✅
**What to Look For:**
- The "GPS Status" section should show:
  - 🔄 "Detecting Location..." (while loading)
  - 🟢 "Within Range (Xm)" if you're close to the gate location
  - 🟡 "Outside Range (Xm away)" if you're far

**Expected Behavior:**
- Clock In button should be **DISABLED** when "Outside Range"
- Clock In button should be **ENABLED** when "Within Range"

**If GPS is not working:**
- Browser will prompt for location permission - **Allow it**
- Check browser console for errors
- Verify `MAIN_GATE_CODE` exists in `company_locations` table

#### 2. Attendance Card Test ✅
**What to Check:**
- Clocked In time: Should show "--:--" initially
- Clocked Out time: Should show "--:--" initially
- Shift status badge should show "OFF DUTY" or "ON DUTY" based on state

**Action:**
1. Click "Clock In" (if within range)
2. Verify:
   - Time updates to current time
   - Badge changes to "ON DUTY"
   - Toast notification appears
   - Check Supabase `attendance_logs` table for new row

#### 3. Visitor Statistics Test ✅
**What to Look For:**
- "Visitors Today" count
- "Pending Check-outs" count

**Expected Data:**
- Counts should match `visitors` table WHERE `entry_time >= today`
- Updates every 30 seconds automatically

**To Test:**
- Add a visitor via Resident Portal
- Refresh Guard Dashboard
- Count should increment

#### 4. GPS Tracking Test ✅
**What to Check:**
- After clocking in, GPS should log every 5 minutes
- Check Supabase `gps_tracking` table for entries
- Each entry should have: `employee_id`, `latitude`, `longitude`, `tracked_at`

**Verify:**
```sql
SELECT * FROM gps_tracking 
WHERE employee_id = '11111111-1111-1111-1111-111111111111' 
ORDER BY tracked_at DESC;
```

---

## Priority 2: Resident Dashboard Testing

### Access Resident UI:
Navigate to: **http://localhost:3000/test-resident**

### Test Scenarios:

#### 1. Flat Details Test ✅
**What to Look For:**
- Flat Number (e.g., "101")
- Building Name (e.g., "Building A")
- Floor Number
- Flat Type (e.g., "2BHK")

**If data is NOT showing:**
- Check `MOCK_RESIDENT_ID` in `ResidentDashboard.tsx` (line 55)
- Verify this resident exists in Supabase `residents` table
- Verify resident is linked to a `flat_id`
- Check console for errors

**Fix:**
```typescript
// In ResidentDashboard.tsx
const MOCK_RESIDENT_ID = "YOUR_ACTUAL_RESIDENT_ID_FROM_SUPABASE";
```

#### 2. Invite Visitor Form Test ✅
**What to Check:**
1. Click "Invite Visitor" card
2. Dialog should open with form fields:
   - Visitor Name (required)
   - Visitor Type dropdown (guest, vendor, contractor, service_staff)
   - Phone Number
   - Purpose
   - Vehicle Number

**Action Steps:**
1. Fill in:
   - Name: "John Doe"
   - Type: "Guest"
   - Phone: "+91 9876543210"
   - Purpose: "Dinner"
2. Click "Send Invite"
3. Watch for success toast

**Verification:**
Check Supabase `visitors` table:
```sql
SELECT * FROM visitors 
WHERE flat_id = (
  SELECT flat_id FROM residents 
  WHERE id = '22222222-2222-2222-2222-222222222222'
)
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Row:**
- `visitor_name`: "John Doe"
- `visitor_type`: "guest"
- `approved_by_resident`: `true`
- `entry_time`: `null` (visitor hasn't arrived yet)
- `flat_id`: Should match resident's flat

#### 3. Recent Activity Test ✅
**What to Look For:**
- List of visitors specific to this resident's flat
- Each visitor card shows:
  - Name with avatar
  - Type badge (colored)
  - Entry time
  - Vehicle number (if provided)
  - Purpose
  - Status badge:
    - 🟡 "Expected" - invited but not arrived (`entry_time` is null)
    - 🟢 "Inside" - arrived but not exited
    - ⚪ "Exited" - completed visit

**Security Check:**
- Resident should ONLY see visitors for their own `flat_id`
- Create a visitor for a different flat
- It should NOT appear in this list

**SQL to Test Security:**
```sql
-- Create visitor for different flat
INSERT INTO visitors (visitor_name, visitor_type, flat_id, approved_by_resident)
VALUES ('Hacker', 'guest', 'DIFFERENT_FLAT_ID', true);

-- This should NOT appear in the resident's Recent Activity
```

---

## Common Issues & Fixes

### Issue 1: "No resident ID provided" Error
**Fix:** Update `MOCK_RESIDENT_ID` in `ResidentDashboard.tsx` to a valid UUID from your `residents` table.

### Issue 2: Clock In button always disabled
**Causes:**
- GPS permission denied
- No gate location in `company_locations` with `location_code = 'GATE-01'`
- Geofence radius too small

**Fix:**
```sql
-- Check gate exists
SELECT * FROM company_locations WHERE location_code = 'GATE-01';

-- If missing, insert one
INSERT INTO company_locations (location_code, location_name, latitude, longitude, geo_fence_radius)
VALUES ('GATE-01', 'Main Gate', 19.0760, 72.8777, 100); -- Mumbai coords, 100m radius
```

### Issue 3: Visitors not showing
**Causes:**
- Resident not linked to a flat
- `flat_id` mismatch

**Fix:**
```sql
-- Check resident's flat linkage
SELECT r.id, r.full_name, r.flat_id, f.flat_number, b.building_name
FROM residents r
LEFT JOIN flats f ON r.flat_id = f.id
LEFT JOIN buildings b ON f.building_id = b.id
WHERE r.id = '22222222-2222-2222-2222-222222222222';
```

### Issue 4: GPS tracking not working
**Check:**
1. Guard must be clocked in
2. Browser location permission granted
3. Wait 5 minutes for first log
4. Check `gps_tracking` table

---

## Success Criteria

### Guard Dashboard ✅
- [ ] GPS status updates in real-time
- [ ] Clock In/Out works correctly
- [ ] Visitor statistics display
- [ ] GPS tracking logs every 5 minutes after clock in
- [ ] All data persists in Supabase

### Resident Dashboard ✅
- [ ] Flat details load correctly
- [ ] Invite form submits successfully
- [ ] New visitor appears in Supabase `visitors` table
- [ ] Recent Activity shows only this resident's flat visitors
- [ ] Status badges update correctly
- [ ] Security filter prevents seeing other flats' data

---

## Next Steps After Testing

Once both dashboards pass all tests:

1. **Wire Authentication:**
   - Replace `MOCK_EMPLOYEE_ID` with `auth.user.id`
   - Replace `MOCK_RESIDENT_ID` with `auth.user.resident_id`

2. **Add RLS Policies:**
   ```sql
   -- Residents can only see their own flat's visitors
   CREATE POLICY "Residents see own flat visitors"
   ON visitors FOR SELECT
   USING (flat_id IN (
     SELECT flat_id FROM residents WHERE id = auth.uid()
   ));
   ```

3. **Deploy:**
   - Test on staging
   - Get client approval
   - Push to production

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Verify table relationships in database
4. Test SQL queries directly in Supabase SQL editor

# 🧪 Quick Testing Reference

## Test URLs (Dev Server Running ✅)

```
Guard Dashboard:    http://localhost:3000/test-guard
Resident Dashboard: http://localhost:3000/test-resident
```

---

## 🛡️ PRIORITY 1: Guard Dashboard

### Quick Checklist:

```
[ ] Clock In button disabled when GPS out of range?
[ ] GPS distance shown correctly?
[ ] Visitor stats displaying?
[ ] Attendance times updating?
[ ] GPS tracking every 5 min after clock in?
```

### Key Mock ID:

```typescript
MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";
```

### Supabase Tables to Monitor:

- `attendance_logs` - Check for clock in/out entries
- `gps_tracking` - Verify location logs every 5 minutes
- `visitors` - Visitor count source
- `company_locations` - Must have GATE-01 entry

---

## 🏠 PRIORITY 2: Resident Dashboard

### Quick Checklist:

```
[ ] Flat details loaded?
[ ] Invite form opens?
[ ] Form submission creates visitor row?
[ ] Recent Activity shows only my flat's visitors?
[ ] Status badges correct? (Expected/Inside/Exited)
```

### Key Mock ID:

```typescript
MOCK_RESIDENT_ID = "22222222-2222-2222-2222-222222222222";
```

### Supabase Tables to Monitor:

- `residents` - Verify resident exists
- `flats` - Check flat linkage
- `visitors` - Check new invites appear with `approved_by_resident: true`

---

## SQL Quick Tests

### Test 1: Verify Guard's Gate Location

```sql
SELECT * FROM company_locations
WHERE location_code = 'GATE-01';
```

**Expected**: 1 row with latitude, longitude, geo_fence_radius

### Test 2: Check Resident's Flat Linkage

```sql
SELECT r.full_name, f.flat_number, b.building_name
FROM residents r
JOIN flats f ON r.flat_id = f.id
JOIN buildings b ON f.building_id = b.id
WHERE r.id = '22222222-2222-2222-2222-222222222222';
```

**Expected**: 1 row with flat details

### Test 3: Verify Visitor Created

```sql
SELECT visitor_name, visitor_type, approved_by_resident, entry_time
FROM visitors
WHERE flat_id IN (
  SELECT flat_id FROM residents
  WHERE id = '22222222-2222-2222-2222-222222222222'
)
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Your invited visitor with `approved_by_resident = true`

### Test 4: Check GPS Tracking

```sql
SELECT tracked_at, latitude, longitude
FROM gps_tracking
WHERE employee_id = '11111111-1111-1111-1111-111111111111'
ORDER BY tracked_at DESC
LIMIT 5;
```

**Expected**: Entries every ~5 minutes after clock in

---

## Common Fixes

### Fix 1: GPS Permission Denied

**Action**: Allow location permissions in browser settings

### Fix 2: Mock IDs don't match

**Action**: Update IDs in:

- `GuardDashboard.tsx` line 34
- `ResidentDashboard.tsx` line 55

### Fix 3: No Gate Location

**Action**: Run this SQL:

```sql
INSERT INTO company_locations (location_code, location_name, latitude, longitude, geo_fence_radius)
VALUES ('GATE-01', 'Main Gate', 19.0760, 72.8777, 100);
```

### Fix 4: Resident has no flat

**Action**: Check/update `flat_id` in residents table

---

## Success = ✅ All Green

When all tests pass, you'll have:

- ✅ Guard can clock in/out based on GPS
- ✅ Guard sees visitor statistics
- ✅ Guard location tracked every 5 min
- ✅ Resident sees their flat details
- ✅ Resident can invite visitors
- ✅ Resident sees only their flat's visitor activity
- ✅ All data persists in Supabase
- ✅ Security filter working (residents can't see other flats)

**Next**: Wire authentication & add RLS policies

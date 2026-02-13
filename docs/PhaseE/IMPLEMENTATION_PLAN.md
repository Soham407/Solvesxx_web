# Phase E — Automation Layer Implementation Plan

**Status:** APPROVED FOR IMPLEMENTATION  
**Last Updated:** 2026-02-11  
**Prerequisite Phases:** A, B, C, D (Completed)  
**Estimated Effort:** 2-3 days  
**Estimated LOC:** ~400 lines (SQL + TypeScript)

---

## 1. Executive Summary

Phase E implements automated alerting and notification systems for the Facility Management Platform. This phase focuses on three core automation features:

1. **Guard Inactivity Alerts** — Detect stationary guards via GPS tracking
2. **Checklist Reminders** — Notify guards of incomplete daily tasks
3. **Inventory Expiry Alerts** — Monitor hazardous materials and compliance documents

### PRD Alignment

| PRD Feature | Phase E Status | Match |
|-------------|----------------|-------|
| Guard Inactivity Alerts | Enhanced with cooldown | ✅ |
| Checklist Reminder | Enhanced with severity | ✅ |
| Inventory Expiry Alerts | New implementation | ✅ |
| SMS Notifications | MSG91 integration | ✅ |

**Commercial Justification:** These features are marked as "SHOULD HAVE" in the PRD — they enhance operational safety and compliance without blocking core workflows.

---

## 2. Scope & Boundaries

### 2.1 In Scope ✅

#### Inventory Expiry Detection
- **Hazardous Materials:**
  - Pest control chemicals (Insecticides, Rodenticides, Termiticides)
  - Safety equipment (Spill kits, neutralizers)
- **Compliance Documents:**
  - Police verification certificates
  - PSARA licenses
  - Hazard handling certifications

#### Alert Automation
- Guard inactivity detection (GPS-based)
- Checklist completion monitoring
- Expiry date tracking with severity levels

#### Notification Channels
- Firebase Cloud Messaging (FCM) — Push notifications
- In-app notification center
- SMS via MSG91 (Critical alerts only)

#### Scheduling Infrastructure
- pg_cron configuration
- External cron fallback (GitHub Actions)
- Alert cooldown mechanism

### 2.2 Out of Scope ❌

- Pantry item expiry tracking
- General consumables (stationery, cleaning supplies)
- WhatsApp Business integration (Phase F)
- Email notifications (Phase F)
- AI/NLP for reminder extraction
- Desktop activity monitoring agents

### 2.3 Product Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| SMS Provider | MSG91 | ₹0.20/SMS, DLT compliant |
| SMS Activation | Critical only | Cost control, prevent fatigue |
| Expiry Severity | 7/3/1 day rule | Industry standard for compliance |
| Inactivity Check | Every 5 minutes | Balance sensitivity vs. noise |
| Checklist Check | Every 30 minutes | Post-midpoint only |

---

## 3. Architecture Overview

### 3.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Scheduler Layer                                            │
│  ├─ pg_cron (primary)                                       │
│  │  ├─ Every 5 min: guard-inactivity                        │
│  │  ├─ Every 30 min: checklist-reminders                    │
│  │  └─ Daily 8 AM IST: inventory-expiry                     │
│  └─ External Cron (fallback)                                │
│     └─ GitHub Actions / cron-job.org                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Functions (Deno/TypeScript)                           │
│  ├─ check-guard-inactivity      [EXISTS — enhance]          │
│  ├─ check-incomplete-checklists [EXISTS — enhance]          │
│  ├─ check-inventory-expiry      [NEW]                       │
│  └─ send-notification           [UPDATE — add SMS]          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Layer (PostgreSQL)                                │
│  ├─ detect_inactive_guards()        [EXISTS]                │
│  ├─ detect_incomplete_checklists()  [EXISTS]                │
│  ├─ detect_expiring_inventory()     [NEW]                   │
│  ├─ panic_alerts table              [EXISTS — add cooldown] │
│  └─ notification_preferences        [NEW]                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Notification Providers                                     │
│  ├─ Firebase Cloud Messaging (FCM)                          │
│  └─ MSG91 SMS (Critical only)                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Notification Routing Matrix

| Alert Type | Severity | Push | In-App | SMS |
|------------|----------|------|--------|-----|
| Panic Button | Critical | ✅ | ✅ | ✅ |
| Chemical Expiring (1 day) | Critical | ✅ | ✅ | ✅ |
| Chemical Expiring (3 days) | Warning | ✅ | ✅ | ❌ |
| Chemical Expiring (7 days) | Info | ✅ | ❌ | ❌ |
| Guard Inactivity | High | ✅ | ✅ | ❌ |
| Checklist Incomplete | Normal | ✅ | ❌ | ❌ |
| Document Expiring | Warning | ✅ | ✅ | ❌ |

### 3.3 Severity Calculation

```typescript
// Expiry Severity Logic
function calculateExpirySeverity(daysUntilExpiry: number): Severity {
  if (daysUntilExpiry <= 1) return 'critical';  // Push + SMS
  if (daysUntilExpiry <= 3) return 'warning';   // Push + In-app
  if (daysUntilExpiry <= 7) return 'info';      // Push only
  return null; // No alert needed
}

// Alert Cooldown Logic
function shouldSendAlert(alertType: string, targetId: string): boolean {
  const lastAlert = getLastAlert(alertType, targetId);
  if (!lastAlert) return true;
  
  // Cooldown periods
  const cooldowns = {
    'inactivity': 30 * 60 * 1000,      // 30 minutes
    'checklist_incomplete': 4 * 60 * 60 * 1000,  // 4 hours
    'expiry_warning': 24 * 60 * 60 * 1000,       // 1 day
    'expiry_critical': 4 * 60 * 60 * 1000        // 4 hours
  };
  
  return Date.now() - lastAlert.created_at > cooldowns[alertType];
}
```

---

## 4. Database Schema Changes

### 4.1 Alert Cooldown Column

```sql
-- Add cooldown support to panic_alerts
ALTER TABLE panic_alerts 
ADD COLUMN IF NOT EXISTS alert_cooldown_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient cooldown queries
CREATE INDEX IF NOT EXISTS idx_panic_alerts_cooldown 
ON panic_alerts(alert_type, guard_id, alert_cooldown_until) 
WHERE alert_cooldown_until IS NOT NULL;
```

### 4.2 Expiry Tracking Tables

```sql
-- Unified expiry tracking view
CREATE OR REPLACE VIEW expiry_tracking AS
-- Chemicals
SELECT 
    id as item_id,
    chemical_name as item_name,
    'chemical' as item_type,
    expiry_date,
    batch_number,
    quantity,
    'pest_control' as category
FROM pest_control_chemicals
WHERE expiry_date IS NOT NULL

UNION ALL

-- Safety Equipment
SELECT 
    id as item_id,
    equipment_name as item_name,
    'safety_equipment' as item_type,
    expiry_date,
    batch_number,
    quantity,
    'safety' as category
FROM safety_equipment
WHERE expiry_date IS NOT NULL

UNION ALL

-- Employee Documents
SELECT 
    ed.id as item_id,
    dt.type_name as item_name,
    'document' as item_type,
    ed.expiry_date,
    NULL as batch_number,
    NULL as quantity,
    'compliance' as category
FROM employee_documents ed
JOIN document_types dt ON ed.document_type_id = dt.id
WHERE ed.expiry_date IS NOT NULL;
```

### 4.3 Detection Function Signature

```sql
-- Main expiry detection function
CREATE OR REPLACE FUNCTION detect_expiring_inventory(
    p_days_ahead INTEGER DEFAULT 7,
    p_severity_threshold TEXT DEFAULT 'info'
)
RETURNS TABLE (
    item_id UUID,
    item_name TEXT,
    item_type TEXT,
    category TEXT,
    expiry_date DATE,
    days_until_expiry INTEGER,
    severity TEXT,
    alert_created BOOLEAN,
    notification_sent BOOLEAN
);
```

---

## 5. Edge Functions Specification

### 5.1 check-inventory-expiry (NEW)

**File:** `supabase/functions/check-inventory-expiry/index.ts`

**Responsibilities:**
1. Authenticate cron request (CRON_SECRET header)
2. Call `detect_expiring_inventory()` SQL function
3. Route notifications based on severity
4. Update cooldown timestamps

**Request Format:**
```typescript
interface RequestBody {
  days_ahead?: number;      // default: 7
  severity_threshold?: string; // default: 'info'
}
```

**Response Format:**
```typescript
interface ResponseBody {
  success: boolean;
  timestamp: string;
  summary: {
    total_expiring: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    alerts_created: number;
    notifications_sent: number;
  };
  results: Array<{
    item_id: string;
    item_name: string;
    item_type: string;
    days_until_expiry: number;
    severity: string;
    alert_created: boolean;
  }>;
}
```

### 5.2 send-notification (UPDATE)

**Enhancements:**
1. Add SMS channel support
2. Implement MSG91 provider
3. Add notification routing logic
4. Support DLT template IDs

**Interface:**
```typescript
interface NotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channels: ('fcm' | 'sms' | 'in_app')[];
  severity?: 'info' | 'warning' | 'critical';
  template_id?: string; // For SMS DLT
}

interface SMSProvider {
  send(phone: string, message: string, templateId: string): Promise<boolean>;
}

class MSG91Provider implements SMSProvider {
  private authKey: string;
  private senderId: string;
  private entityId: string;
  
  async send(phone: string, message: string, templateId: string): Promise<boolean> {
    // MSG91 API integration
    // DLT-compliant template rendering
  }
}
```

### 5.3 Existing Functions (Enhancements)

**check-guard-inactivity:**
- Add cooldown check before creating alerts
- Support supervisor acknowledgment
- Add location-based threshold override

**check-incomplete-checklists:**
- Add cooldown check (4 hours between reminders)
- Respect shift midpoint logic
- Support checklist snooze

---

## 6. Cron Scheduling Configuration

### 6.1 pg_cron Setup

```sql
-- Enable extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Guard inactivity: Every 5 minutes
SELECT cron.schedule(
    'guard-inactivity',
    '*/5 * * * *',
    'SELECT detect_inactive_guards(15);'
);

-- Checklist reminders: Every 30 minutes
SELECT cron.schedule(
    'checklist-reminders',
    '*/30 * * * *',
    'SELECT detect_incomplete_checklists(50.00, true);'
);

-- Inventory expiry: Daily at 8 AM IST (3 AM UTC)
SELECT cron.schedule(
    'inventory-expiry',
    '0 3 * * *',
    'SELECT detect_expiring_inventory(7, ''info'');'
);

-- View all scheduled jobs
SELECT * FROM cron.job;
```

### 6.2 External Cron Fallback

**GitHub Actions (`.github/workflows/phase-e-cron.yml`):**
```yaml
name: Phase E Automation
on:
  schedule:
    - cron: '*/5 * * * *'    # Guard inactivity
    - cron: '*/30 * * * *'   # Checklist reminders
    - cron: '0 3 * * *'      # Inventory expiry (8 AM IST)

jobs:
  guard-inactivity:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/check-guard-inactivity" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
  
  checklist-reminders:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/check-incomplete-checklists" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            -d '{"threshold": 50, "only_past_midpoint": true}'
  
  inventory-expiry:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/check-inventory-expiry" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            -d '{"days_ahead": 7, "severity_threshold": "info"}'
```

---

## 7. MSG91 SMS Integration

### 7.1 Environment Variables

```bash
# Required for SMS
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_ID=FCLPRO    # 6 characters max
MSG91_DLT_ENTITY_ID=your_entity_id

# Template IDs (from DLT portal)
MSG91_TEMPLATE_PANIC=template_id_1
MSG91_TEMPLATE_EXPIRY_CRITICAL=template_id_2
MSG91_TEMPLATE_INACTIVITY=template_id_3
```

### 7.2 DLT Template Registration

Required templates (register at Jio DLT or VI DLT portal):

| Template Name | Template Content | Variables |
|--------------|------------------|-----------|
| panic_alert | ALERT: Guard {#var#} triggered emergency at {#var#}. Ref: {#var#} | guard_name, location, ref_id |
| expiry_critical | URGENT: {#var#} expires {#var#}. Item: {#var#}. Take action. | item_type, expiry_date, item_name |
| inactivity | ALERT: Guard {#var#} inactive for {#var#} mins at {#var#}. | guard_name, minutes, location |

### 7.3 Cost Estimates

| Scenario | Daily Critical Alerts | Monthly Cost (₹) |
|----------|----------------------|------------------|
| Small (50 guards) | ~10 | ₹3,000-5,000 |
| Medium (200 guards) | ~20 | ₹12,000-18,000 |
| Large (500 guards) | ~40 | ₹24,000-36,000 |

*Note: Costs assume only Critical alerts use SMS. Push notifications are free via FCM.*

---

## 8. Implementation Checklist

### 8.1 Database Migrations

- [ ] Migration 01: Add cooldown columns to panic_alerts
- [ ] Migration 02: Create expiry_tracking view
- [ ] Migration 03: Create detect_expiring_inventory() function
- [ ] Migration 04: Add notification_preferences table
- [ ] Migration 05: Configure pg_cron jobs
- [ ] Migration 06: Add RLS policies for new tables

### 8.2 Edge Functions

- [ ] Deploy check-inventory-expiry
- [ ] Update send-notification with SMS support
- [ ] Enhance check-guard-inactivity (cooldown)
- [ ] Enhance check-incomplete-checklists (cooldown)

### 8.3 Configuration

- [ ] Set CRON_SECRET environment variable
- [ ] Configure MSG91 credentials (if using SMS)
- [ ] Set up DLT templates (if using SMS)
- [ ] Configure Firebase service account
- [ ] Test cron job execution

### 8.4 Testing

- [ ] Unit test: detect_expiring_inventory()
- [ ] Integration test: End-to-end expiry flow
- [ ] Load test: 500 concurrent guards
- [ ] SMS delivery test (if enabled)
- [ ] Cooldown logic verification

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SMS costs exceed budget | Medium | High | Critical-only routing; daily digest option |
| False positive inactivity alerts | Medium | Medium | 30-min cooldown; location overrides |
| GPS data gaps trigger false alerts | High | Medium | Missing GPS = warning (not critical) |
| DLT registration delays | Medium | High | Push-only fallback; document process |
| Notification fatigue | Medium | High | Severity routing; cooldown periods |
| pg_cron not available on plan | Low | High | External cron fallback documented |

---

## 10. Success Criteria

Phase E is complete when:

1. ✅ All three detection systems (inactivity, checklist, expiry) run on schedule
2. ✅ Alerts respect cooldown periods (no spam)
3. ✅ Critical alerts reach supervisors via Push + SMS (if configured)
4. ✅ Non-critical alerts use Push only (cost control)
5. ✅ All alerts logged in panic_alerts table
6. ✅ Supervisor can acknowledge/dismiss alerts
7. ✅ Zero false positive rate < 5% for inactivity
8. ✅ Expiry alerts sent at 7/3/1 day intervals

---

## 11. Future Enhancements (Phase F)

Defer to next phase:

- WhatsApp Business integration
- Email notifications
- AI-powered alert prioritization
- Supervisor mobile app
- Real-time dashboard alerts
- Alert analytics and reporting
- Multi-language SMS templates

---

## 12. References

### Internal
- `supabase/PhaseA/` — Existing inactivity/checklist SQL functions
- `supabase/functions/send-notification/` — Base notification service
- `lib/notificationService.ts` — Frontend notification client

### External
- **Novu** — Workflow orchestration patterns (reference only)
- **Keep** — Alert aggregation concepts (reference only)
- **MSG91 Docs** — https://msg91.com/api
- **DLT Registration** — Jio/VI DLT portals

---

**Document Owner:** System Architect  
**Reviewers:** Product Owner, Tech Lead  
**Next Review:** Post-implementation (Phase E completion)

---

*This document is a living specification. Update as implementation details are refined.*

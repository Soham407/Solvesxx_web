# 🔄 WORKFLOW DIAGRAMS — FacilityPro

> **Rule:** Build state machines, not dashboards. UI is a reflection of state, not the driver.

All workflows are derived directly from the PRD. Each flow answers the 5 questions:
1. Who initiates this?
2. Who can see it?
3. Who can act on it?
4. What evidence is mandatory?
5. What breaks if this step is skipped?

---

## FLOW 1: Visitor Entry & Notification

**PRD Ref:** Lines 188-209

```
GUARD at Gate                    SYSTEM                         RESIDENT (via App/SMS)
     |                              |                                |
     |  1. Log Visitor Info          |                                |
     |  (Name, Photo*, Phone,       |                                |
     |   Vehicle, Flat No)           |                                |
     |----------------------------->|                                |
     |                              |  2. Lookup resident for flat    |
     |                              |  3. Send SMS to resident:       |
     |                              |     "Dear Resident, [Visitor]   |
     |                              |      is at the gate for         |
     |                              |      [Flat No]."                |
     |                              |------------------------------->|
     |                              |  4. Send Push Notification      |
     |                              |     (with Visitor Photo*)       |
     |                              |------------------------------->|
     |                              |                                |
     |                              |  5. Resident Confirms/Denies   |
     |                              |<-------------------------------|
     |  6. Guard sees confirmation   |                                |
     |<-----------------------------|                                |
     |                              |                                |
     |  7a. ALLOW: Issue Visitor Pass|                                |
     |  7b. DENY: Log rejection      |                                |
     |  8. Visitor exits → Guard     |                                |
     |     logs exit_time            |                                |
```

**STATES:**
```
visitor_entry → awaiting_confirmation → confirmed | denied → pass_issued → exited
```

**EVIDENCE REQUIRED:**
- ✅ Visitor photo (camera capture by guard)
- ✅ Guard GPS location at entry (verify they're at the gate)

**WHAT BREAKS IF SKIPPED:**
- No photo → Resident can't verify who's at gate
- No SMS/Push → Resident has no idea about visitor (security breach)
- No flat lookup → Guard doesn't know who to notify

**CURRENT STATE:** ❌ Photo capture exists in schema (`photo_url`) but not in UI. SMS edge function exists but is NOT triggered from visitor creation flow. Push notification hook exists but is NOT called.

---

## FLOW 2: Guard Daily Operations

**PRD Ref:** Lines 135-162

```
                    GUARD DAILY LIFECYCLE
                    
    ┌──────────────────────────────────────────────────┐
    │                                                  │
    │  CHECK-IN                                        │
    │  ├─ Geo-fence check (within 50m of location)     │
    │  ├─ Selfie capture for attendance proof           │
    │  └─ System records: time, GPS, Photo              │
    │                                                  │
    │  DAILY CHECKLIST (before 9:00 AM)                │
    │  ├─ Q: "Is water motor pump working?" → Yes/No   │
    │  ├─ Q: "Are all fire exits clear?" → Yes/No      │
    │  ├─ Q: "Parking lights ON/OFF?" → Value          │
    │  ├─ Photo Proof per item (if required)            │
    │  └─ Submit with GPS location                     │
    │                                                  │
    │  PATROL (continuous)                             │
    │  ├─ GPS tracked every 5 minutes                  │
    │  ├─ System checks: has guard moved?              │
    │  ├─ If STATIC > 30 min → Inactivity Alert        │
    │  └─ Patrol checkpoints verified                  │
    │                                                  │
    │  VISITOR MANAGEMENT (as needed)                  │
    │  ├─ (See Flow 1 above)                           │
    │                                                  │
    │  PANIC BUTTON (emergency only)                   │
    │  ├─ Press SOS → GPS captured                     │
    │  ├─ Alert → Society Manager Dashboard             │
    │  ├─ SMS → Committee Members                      │
    │  └─ Resolution tracked                           │
    │                                                  │
    │  EMERGENCY QUICK DIAL                            │
    │  ├─ Police (local station)                       │
    │  ├─ Fire Brigade                                 │
    │  ├─ Ambulance                                    │
    │  └─ Electrician/Plumber                          │
    │                                                  │
    │  CHECK-OUT                                       │
    │  ├─ Geo-fence check                              │
    │  ├─ System records: time, GPS                    │
    │  └─ If guard leaves geo-fence → Auto-Punch Out   │
    │                                                  │
    └──────────────────────────────────────────────────┘
```

**ALERT SYSTEM (automated):**
```
System monitors guard continuously:

IF guard GPS unchanged for 30 min:
    → Trigger "Inactivity Alert" to Security Supervisor + Society Manager
    
IF checklist not submitted by 9:00 AM:
    → Send reminder notification to Guard
    → After 30 min, escalate to Supervisor
    
IF guard leaves 50m geo-fence:
    → Auto-Punch Out flag
    → Alert to Supervisor: "Guard [Name] left [Location] at [Time]"
```

**EVIDENCE REQUIRED:**
- ✅ Selfie at check-in
- ✅ GPS within 50m of assigned location
- ✅ Photo proof per checklist item (where required)
- ✅ Continuous GPS logging for patrol

**CURRENT STATE:** ❌ Selfie capture not implemented. ❌ Geo-fence not enforced. ❌ Photo proof not in checklist UI. ✅ Panic Alert works. ✅ Patrol logs exist but no map visualization.

---

## FLOW 3: Material Supply — Buyer → Admin → Supplier → Delivery

**PRD Ref:** Lines 327-513 (The Big One)

```
BUYER              ADMIN               SUPPLIER            DELIVERY          SYSTEM
  |                  |                    |                    |                |
  | 1. Order Request |                    |                    |                |
  | (Service Cat,    |                    |                    |                |
  |  Grade/Type,     |                    |                    |                |
  |  Qty, Shift,     |                    |                    |                |
  |  Duration)       |                    |                    |                |
  |----------------->|                    |                    |                |
  |                  |                    |                    |                |
  |                  | 2. Review Request  |                    |                |
  |                  |    Pull Sale Rate  |                    |                |
  |                  |    from Master     |                    |                |
  |                  |                    |                    |                |
  |                  | 3a. ACCEPT →       |                    |                |
  |                  | 3b. PENDING →      |                    |                |
  |                  | 3c. REJECT →       |                    |                |
  |<- - - - - - - - -| (notification)     |                    |                |
  |                  |                    |                    |                |
  |                  | 4. Indent          |                    |                |
  |                  |    Generation      |                    |                |
  |                  |                    |                    |                |
  |                  | 5. Forward Indent  |                    |                |
  |                  |    to Supplier     |                    |                |
  |                  |------------------->|                    |                |
  |                  |                    |                    |                |
  |                  |                    | 6a. Indent ACCEPT  |                |
  |                  |                    | 6b. Indent REJECT  |                |
  |                  |<-------------------|                    |                |
  |                  |                    |                    |                |
  |                  | 7. Issue PO        |                    |                |
  |                  |    (formal order)  |                    |                |
  |                  |------------------->|                    |                |
  |                  |                    |                    |                |
  |                  |                    | 8. Received PO     |                |
  |                  |                    |    (acknowledge)   |                |
  |                  |                    |                    |                |
  |                  |                    | 9. Dispatch PO     |                |
  |                  |                    |    (goods sent)    |                |
  |                  |                    |------------------->|                |
  |                  |                    |                    |                |
  |                  |                    |                    | 10. Delivery   |
  |                  |                    |                    |     at site    |
  |                  |                    |                    |                |
  |                  | 11. Material       |                    |                |
  |                  |     Acknowledge    |                    |                |
  |                  |     (check vs PO)  |                    |                |
  |                  |                    |                    |                |
  |                  |     11a. Quality   |                    |                |
  |                  |     Check Ticket   |                    |                |
  |                  |     → Photo proof  |                    |                |
  |                  |                    |                    |                |
  |                  |     11b. Quantity  |                    |                |
  |                  |     Check Ticket   |                    |                |
  |                  |     → Shortage     |                    |                |
  |                  |       Note auto-   |                    |                |
  |                  |       generated    |                    |                |
  |                  |                    |                    |                |
  |                  |     11c. If bad →  |                    |                |
  |                  |     Return Ticket  |                    |                |
  |                  |     (RTV)          |                    |                |
  |                  |------------------->| ← Return goods     |                |
  |                  |                    |   + Credit Note    |                |
  |                  |                    |                    |                |
  |                  | 12. Supplier Bill  |                    |                |
  |                  |<-------------------| (based on rates)   |                |
  |                  |                    |                    |                |
  |                  | 13. Reconciliation |                    |                |
  |                  |     Bill vs GRN    |                    |                |
  |                  |     vs PO          |                    |                |
  |                  |                    |                    |                |
  |                  | 14. Buyer Invoice  |                    |                |
  | 15. Receive      |     (Sale Bill)    |                    |                |
  |     Invoice      |<- - - - - - - - - |                    |                |
  |<-----------------|                    |                    |                |
  |                  |                    |                    |                |
  | 16. Pay Invoice  |                    |                    |                |
  |----------------->|                    |                    |                |
  |                  | 17. Pay Supplier   |                    |                |
  |                  |------------------->|                    |                |
  |                  |                    |                    |                |
  | 18. Submit       |                    |                    |                |
  |     Feedback     |                    |                    |                |
  |----------------->|                    |                    |                |
  |                  |                    |                    |                |
  |                  | 19. END            |                    |                |
```

**STATUS LIFECYCLE (from `request_status` enum):**
```
pending → accepted → indent_generated → indent_forwarded
    ↓                                        ↓
  rejected                           indent_accepted / indent_rejected
                                            ↓
                                        po_issued → po_received → po_dispatched
                                                                      ↓
                                           material_received → material_acknowledged
                                                                      ↓
                                                              bill_generated → paid
                                                                                ↓
                                                                    feedback_pending → completed
```

**EVIDENCE REQUIRED:**
- Quality Check: ✅ Mandatory photo of damaged/expired item
- Quantity Check: ✅ Auto-generated Shortage Note
- Delivery: ✅ Delivery Note with staff credentials
- Acknowledgment: ✅ Verification against PO

**WHAT BREAKS IF SKIPPED:**
- No Buyer initiation → Admin creates phantom orders
- No Supplier Accept/Reject → Admin doesn't know if indent is feasible
- No three-way match (GRN vs PO vs Indent) → Company pays for unreceived goods
- No Feedback → No performance metrics for future procurement decisions

**CURRENT STATE:** ❌ Buyer cannot submit orders (no buyer portal). ❌ Supplier cannot accept/reject indents (no supplier portal). ❌ Dispatch tracking has no supplier-facing UI. ❌ Three-way match is theoretically in reconciliation hook but not wired to GRN/PO chain. ❌ Feedback loop endpoint not implemented.

---

## FLOW 4: Smart Attendance & Geo-Fencing

**PRD Ref:** Lines 301-306

```
EMPLOYEE/GUARD                    SYSTEM                      SUPERVISOR
     |                              |                              |
     | 1. Opens app, taps "Check In"|                              |
     |                              |                              |
     |                              | 2. Request GPS location      |
     |                              | 3. Request Camera (selfie)   |
     |                              |                              |
     | 4. Provides selfie + GPS     |                              |
     |----------------------------->|                              |
     |                              |                              |
     |                              | 5. Validate GPS:             |
     |                              |    Is employee within 50m    |
     |                              |    of Company Location?      |
     |                              |                              |
     |                              | 5a. YES:                     |
     |                              |     Record check_in_time     |
     |                              |     Store selfie             |
     |                              |     Store GPS coords         |
     |                              |     Status → "present"       |
     |                              |                              |
     |                              | 5b. NO:                      |
     |                              |     REJECT check-in          |
     |                              |     "You are not at your     |
     |                              |      assigned location"      |
     |                              |                              |
     |         ... work day ...     |                              |
     |                              |                              |
     |                              | 6. CONTINUOUS MONITORING     |
     |                              |    If guard leaves 50m       |
     |                              |    for > threshold:          |
     |                              |    → Auto-Punch Out flag     |
     |                              |    → Alert to Supervisor     |
     |                              |---------------------------->|
     |                              |                              |
     | 7. Taps "Check Out"          |                              |
     |----------------------------->|                              |
     |                              | 8. Record check_out_time     |
     |                              |    Calculate total_hours     |
     |                              |    → Feed into Payroll       |
```

**EVIDENCE REQUIRED:**
- ✅ Selfie photo at check-in (stored in Supabase Storage)
- ✅ GPS coordinates within 50m of `company_locations.geo_fence_radius`
- ✅ System timestamp (not user-provided)

**CURRENT STATE:** ❌ No selfie capture. ❌ No geo-fence validation. ❌ No auto-punch-out. ✅ Attendance log table has all necessary fields. ✅ `company_locations` has `geo_fence_radius` column ready.

---

## FLOW 5: Ticket Generation (Material Quality/Quantity/Return)

**PRD Ref:** Lines 514-553

```
MATERIAL ARRIVES AT GATE
         |
         v
  ┌─────────────────┐
  │ Security logs    │
  │ delivery vehicle │
  └────────┬────────┘
           |
           v
  ┌─────────────────┐
  │ Manager receives │
  │ inspection alert │
  └────────┬────────┘
           |
           v
  ┌──────────────────────────────────────────┐
  │         MATERIAL TICKET FORM             │
  │                                          │
  │  ┌─────────────────────────────────┐     │
  │  │ CHECK QUANTITY                  │     │
  │  │ ├─ Ordered Qty (from PO)       │     │
  │  │ ├─ Received Qty (counted)      │     │
  │  │ ├─ Shortage = Ordered-Received │     │
  │  │ └─ If shortage > 0:           │     │
  │  │     AUTO: Shortage Note →      │     │
  │  │     Supplier notification      │     │
  │  └─────────────────────────────────┘     │
  │                                          │
  │  ┌─────────────────────────────────┐     │
  │  │ CHECK QUALITY                   │     │
  │  │ ├─ Condition: Good/Damaged/     │     │
  │  │ │  Expired/Leaking              │     │
  │  │ ├─ MANDATORY Photo Evidence*    │     │
  │  │ ├─ Batch Number (track lots)    │     │
  │  │ └─ If "Bad":                   │     │
  │  │     → Flag item non-usable     │     │
  │  │     → Block from inventory     │     │
  │  └─────────────────────────────────┘     │
  │                                          │
  └──────────────┬───────────────────────────┘
                 |
        ┌────────┴────────┐
        |                 |
   APPROVED           REJECTED
        |                 |
        v                 v
  ┌──────────┐    ┌──────────────────┐
  │ Add to   │    │ RETURN TICKET    │
  │ Inventory│    │ (RTV)            │
  │ (AC/Pest/│    │ ├─ Reason        │
  │ Plant    │    │ ├─ Items list    │
  │ Master)  │    │ └─ Track until:  │
  └──────────┘    │   Vendor replaces│
                  │   OR Credit Note │
                  └──────────────────┘
```

**EVIDENCE REQUIRED:**
- Quality Check: ✅ MANDATORY photo of damaged/expired item
- Quantity Check: ✅ Auto-calculated shortage note
- Return Ticket: ✅ Reason documentation

**CURRENT STATE:** ❌ Photo evidence not in quality ticket form. ❌ Batch number field not in form. ❌ Auto-shortage-note not implemented. ❌ RTV workflow exists as page but not as automated flow (no vendor notification, no credit note tracking).

---

## FLOW 6: Behavior Ticket (Employee Discipline)

**PRD Ref:** Lines 163-187

```
SOCIETY MANAGER / SUPERVISOR          SYSTEM              COMPANY ADMIN
          |                              |                      |
          | 1. Create Ticket             |                      |
          |   ├─ Employee (dropdown)     |                      |
          |   ├─ Category:               |                      |
          |   │  - Sleeping on Duty      |                      |
          |   │  - Rudeness              |                      |
          |   │  - Absence from Post     |                      |
          |   │  - Grooming/Uniform      |                      |
          |   │  - Unauthorized Entry    |                      |
          |   ├─ Description             |                      |
          |   ├─ Photo Evidence*         |                      |
          |   ├─ Severity:               |                      |
          |   │  - Low (Warning)         |                      |
          |   │  - Medium (Serious)      |                      |
          |   │  - High (Critical)       |                      |
          |   └─ DateTime (auto)         |                      |
          |----------------------------->|                      |
          |                              | 2. Log ticket        |
          |                              | 3. Notify Admin      |
          |                              |--------------------->|
          |                              |                      |
          |                              |  4. Admin reviews    |
          |                              |     Decides action:  |
          |                              |     - Verbal Warning |
          |                              |     - Written Warning|
          |                              |     - Suspension     |
          |                              |     - Termination    |
          |                              |<---------------------|
```

**CURRENT STATE:** ✅ Behavior tickets implemented with `useBehaviorTickets` hook and UI. 🟡 Photo evidence field exists in schema but upload flow not in UI. 🟡 Severity levels exist but administrative actions (warning → suspension → termination) are not tracked as outcomes.

---

## FLOW 7: Service Request Lifecycle (AC / Pest / Plantation)

**PRD Ref:** Lines 211-271

```
RESIDENT/MANAGER        SERVICE BOY           SYSTEM             ADMIN
      |                      |                   |                  |
      | 1. Log complaint     |                   |                  |
      |   (e.g. "AC not      |                   |                  |
      |    cooling")          |                   |                  |
      |--------------------->|                   |                  |
      |                      |                   | 2. Service       |
      |                      |                   |    Request       |
      |                      |                   |    created       |
      |                      |                   |                  |
      |                      |                   | 3. Assign        |
      |                      |                   |    technician    |
      |                      |                   |    (by skill)    |
      |                      |                   |                  |
      |                      | 4. PPE Checklist  |                  |
      |                      |    (Pest Control) |                  |
      |                      |    Masks, Gloves, |                  |
      |                      |    Eye Protection  |                  |
      |                      |                   |                  |
      |                      | 5. "Start Work"   |                  |
      |                      |    GPS captured    |                  |
      |                      |                   |                  |
      |                      | 6. Upload "Before" |                  |
      |                      |    photo           |                  |
      |                      |                   |                  |
      |                      | 7. Work performed  |                  |
      |                      |    Parts used      |                  |
      |                      |    (linked to      |                  |
      |                      |     inventory)     |                  |
      |                      |                   |                  |
      |                      | 8. Upload "After"  |                  |
      |                      |    photo           |                  |
      |                      | 9. "Complete"      |                  |
      |                      |                   |                  |
      |                      |                   | 10. Inventory    |
      |                      |                   |     auto-deducted|
      |                      |                   |                  |
      | 11. Notification:    |                   |                  |
      |    "Your service is  |                   |                  |
      |     complete"        |                   |                  |
      |<---------------------|                   |                  |
```

**For Pest Control specifically:**
```
ADDITIONAL: Resident Instruction SMS
"Pest control scheduled for today at 4 PM. 
 Please keep kids/pets away and cover all food items."
```

**EVIDENCE REQUIRED:**
- ✅ PPE Checklist (Pest Control mandatory before work)
- ✅ "Before" photo
- ✅ "After" photo
- ✅ GPS at work start
- ✅ Parts used linked to inventory

**CURRENT STATE:** 🟡 Service requests exist and work. ❌ Before/After photo flow not in service boy UI. ❌ PPE checklist exists as data display but not as mandatory gate before work start. ❌ Pest control resident instruction SMS not triggered. ❌ Inventory auto-deduction on parts used not connected.

---

_End of Workflow Diagrams — v1.0_

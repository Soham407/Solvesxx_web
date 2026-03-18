# FacilityPro — Bonus Features Register

> Features built **beyond the client PRD scope**.
> All are hidden from navigation and blocked via route guards by default.
> Enable individually via `NEXT_PUBLIC_FF_<FLAG>=true` in `.env.local`.

---

## How to Enable

Each bonus feature is controlled by a feature flag. To enable one:

```env
# In .env.local
NEXT_PUBLIC_FF_ASSET_MODULE=true
```

To enable **all** bonus features at once:

```env
NEXT_PUBLIC_FEATURE_FUTURE_PHASE=true
```

---

## Bonus Feature List

### 1. Asset Management Module
**Flag:** `NEXT_PUBLIC_FF_ASSET_MODULE=true`
**Routes hidden:**
- `/assets` — Asset registry with full CRUD, status tracking, linked service requests
- `/assets/qr-codes` — QR code generation and batch printing for physical assets

**Also hidden under separate flags (related):**
- `/assets/maintenance` — Maintenance scheduling (`FF_MAINTENANCE_SCHEDULING`)
- `/assets/categories` — Asset category hierarchy (`FF_ASSET_CATEGORY_HIERARCHY`)

**Why built:** Needed for linking service requests to physical equipment (AC units, generators). The full asset registry went beyond what the client asked for.

---

### 2. Extended Finance Module
**Flag:** `NEXT_PUBLIC_FF_FINANCE_EXTENDED=true`
**Routes hidden:**
- `/finance/budgeting` — Budget planning with category-wise allocation and variance tracking
- `/finance/closure` — Monthly financial close workflow with period locking
- `/finance/performance-audit` — KPI-based financial performance audit reports
- `/finance/ledger` — Universal double-entry ledger view
- `/finance/buyer-invoices` — Alternate buyer invoices view (overlaps with `/finance/buyer-billing`)

**Why built:** Extended the finance module beyond the PRD's billing/reconciliation/compliance scope.

---

### 3. Settings Module
**Flag:** `NEXT_PUBLIC_FF_SETTINGS_MODULE=true`
**Routes hidden:**
- `/settings` — Settings root
- `/settings/company` — Company identity (logo, name, address)
- `/settings/permissions` — Fine-grained permission overrides
- `/settings/notifications` — Notification channel preferences
- `/settings/branding` — Visual branding (colours, theme)

**Why built:** Added as a quality-of-life admin panel. Not part of the client's requested scope.

---

### 4–10. Previously Registered Bonus Flags
These were already hidden before this audit:

| Flag | Route | Description |
|---|---|---|
| `FF_KANBAN_BOARD` | `/service-requests/board` | Kanban view for service requests |
| `FF_REPORTS_MODULE` | `/reports/*` | Attendance, financial, service & inventory analytics |
| `FF_MAINTENANCE_SCHEDULING` | `/assets/maintenance` | Scheduled maintenance for assets |
| `FF_MULTI_WAREHOUSE` | `/inventory/warehouses` | Multi-location warehouse management |
| `FF_INDENT_VERIFICATION` | `/inventory/indents/verification` | Secondary indent approval gate |
| `FF_ASSET_CATEGORY_HIERARCHY` | `/assets/categories` | Nested asset category tree |
| `FF_LEAVE_CONFIG_ADMIN` | `/hrms/leave/config` | Leave policy configuration panel |
| `FF_SPECIALIZED_PROFILES` | `/hrms/specialized-profiles` | Role-specific employee profile templates |

---

## What Is NOT a Bonus Feature

Everything else in the application was explicitly requested in the client PRD/SCOPE:

- All 19 master data screens (company, supply, services, HRMS)
- Full procurement workflow (Buyer Request → Indent → PO → GRN → Bill → Payment)
- Full service deployment workflow (SPO → Dispatch → Delivery Note → Acknowledgment → Bill)
- Visitor Management (guest entry, daily helpers, family directory, notifications)
- Security Guard system (panic alerts, checklists, GPS, emergency contacts)
- HRMS (recruitment, attendance, leave, payroll, BGV documents)
- Financial core (reconciliation, supplier bills, buyer billing, compliance)
- Ticket system (behavior tickets, quality tickets, RTV)
- All 14 role dashboards
- Notification infrastructure (FCM + SMS)
- Buyer Portal, Supplier Portal, Guard Portal, Resident Portal, Delivery Portal

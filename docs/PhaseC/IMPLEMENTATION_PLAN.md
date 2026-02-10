# IMPLEMENTATION PLAN — Phase C

> Enhanced with insights from reference repository analysis.

## Overview

This plan incorporates patterns from:
- **InvoiceShelf** (Laravel) - Billing, payments, partial payment tracking
- **Horilla HRMS** (Frappe) - Payroll calculation, recruitment pipeline
- **bs_reconcile** (ERPNext) - Three-way reconciliation with partial matching

## Execution Order

### Stage 1: Database Schema

**Duration:** Day 1

**File:** `supabase/PhaseC/schema_phaseC.sql`

| Task | Description | Reference Pattern |
|------|-------------|-------------------|
| 1.1 | Create ENUM types: `candidate_status`, `document_type`, `document_status`, `reconciliation_status` | - |
| 1.2 | Create `candidates` table with all columns and constraints | Horilla: job_applicant |
| 1.3 | Create `payroll_cycles` table | Horilla: payroll_entry |
| 1.4 | Create `payslips` table with foreign key to `payroll_cycles` | Horilla: salary_slip |
| 1.5 | Create `employee_documents` table | - |
| 1.6 | Create `reconciliations` table | bs_reconcile |
| 1.7 | **NEW:** Create `reconciliation_lines` junction table | bs_reconcile: partial_reconcile_entry |
| 1.8 | **NEW:** Add residual columns to PO/GRN/Bill items | bs_reconcile pattern |
| 1.9 | Create indexes for all new tables | - |
| 1.10 | Enable RLS on all new tables | - |
| 1.11 | Create RLS policies per contract | - |
| 1.12 | Create sequences for auto-numbering | - |
| 1.13 | Create trigger functions for code generation | - |
| 1.14 | Create `updated_at` triggers | - |
| 1.15 | Create audit triggers for `payslips` and `reconciliations` | - |

**Verification:** Run migration against Supabase, confirm tables exist.

---

### Stage 1.5: Enhanced Schema (NEW - From Code Audit)

**Duration:** Day 1-2

**File:** `supabase/PhaseC/schema_phaseC_enhanced.sql`

| Task | Description | Reference Pattern |
|------|-------------|-------------------|
| 1.5.1 | Create `salary_components` table | Horilla: salary_component |
| 1.5.2 | Create `employee_salary_structure` table | Horilla: salary_structure |
| 1.5.3 | Create `candidate_interviews` table for multi-round tracking | Horilla: interview |
| 1.5.4 | Add `payment_status` column to bills/invoices (dual status) | InvoiceShelf pattern |
| 1.5.5 | Add `due_amount` tracking to bills/invoices | InvoiceShelf pattern |
| 1.5.6 | Create attendance integration function | Horilla pattern |

**SQL Templates:**

```sql
-- Salary Components (from Horilla pattern)
CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbr TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earning', 'deduction')),
  formula TEXT,  -- e.g., 'base * 0.12'
  default_amount BIGINT,
  depends_on_payment_days BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Reconciliation Lines (from bs_reconcile pattern)
CREATE TABLE reconciliation_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reconciliation_id UUID REFERENCES reconciliations(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES purchase_order_items(id),
  grn_item_id UUID REFERENCES material_receipt_items(id),
  bill_item_id UUID REFERENCES purchase_bill_items(id),
  product_id UUID REFERENCES products(id),
  matched_qty DECIMAL(10, 2),
  matched_amount BIGINT,
  match_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Stage 2: Storage Configuration

**Duration:** Day 1

**File:** `supabase/PhaseC/storage_setup.sql`

| Task | Description |
|------|-------------|
| 2.1 | Create `employee-documents` storage bucket |
| 2.2 | Configure file size limit (10MB) |
| 2.3 | Configure allowed MIME types (PDF, JPEG, PNG) |
| 2.4 | Create storage RLS policy for employee self-access |
| 2.5 | Create storage RLS policy for admin full access |

**Verification:** Upload test file via Supabase dashboard, confirm storage works.

---

### Stage 3: Recruitment Module

**Duration:** Day 2

| Task | File | Description |
|------|------|-------------|
| 3.1 | `hooks/useCandidates.ts` | Create hook with CRUD operations |
| 3.2 | `hooks/useCandidates.ts` | Add `convertToEmployee` function |
| 3.3 | `hooks/useCandidates.ts` | Add status transition validation |
| 3.4 | `app/(dashboard)/hrms/recruitment/page.tsx` | Remove hardcoded `data` array |
| 3.5 | `app/(dashboard)/hrms/recruitment/page.tsx` | Import and use `useCandidates` hook |
| 3.6 | `app/(dashboard)/hrms/recruitment/page.tsx` | Add loading and error states |
| 3.7 | `components/phaseC/AddCandidateDialog.tsx` | Create dialog for new candidate entry |
| 3.8 | `app/(dashboard)/hrms/recruitment/page.tsx` | Wire "Add Candidate" button to dialog |

**Verification:** Create candidate, update status, verify in database.

---

### Stage 4: Employee Documents Module

**Duration:** Day 2-3

| Task | File | Description |
|------|------|-------------|
| 4.1 | `hooks/useEmployeeDocuments.ts` | Create hook with CRUD operations |
| 4.2 | `hooks/useEmployeeDocuments.ts` | Add `uploadDocument` function with storage integration |
| 4.3 | `hooks/useEmployeeDocuments.ts` | Add `verifyDocument` function |
| 4.4 | `hooks/useEmployeeDocuments.ts` | Add `getExpiringDocuments` function |
| 4.5 | `app/(dashboard)/hrms/documents/page.tsx` | Remove hardcoded `data` array |
| 4.6 | `app/(dashboard)/hrms/documents/page.tsx` | Import and use `useEmployeeDocuments` hook |
| 4.7 | `components/phaseC/UploadDocumentDialog.tsx` | Create dialog with file upload |
| 4.8 | `components/phaseC/VerifyDocumentDialog.tsx` | Create verification action dialog |
| 4.9 | `app/(dashboard)/hrms/documents/page.tsx` | Wire "Upload Document" button |

**Verification:** Upload PDF, verify in storage bucket, mark as verified.

---

### Stage 5: Payroll Module

**Duration:** Day 3-4

| Task | File | Description |
|------|------|-------------|
| 5.1 | `hooks/usePayroll.ts` | Create hook for payroll cycles |
| 5.2 | `hooks/usePayroll.ts` | Add `createPayrollCycle` function |
| 5.3 | `hooks/usePayroll.ts` | Add `generatePayslips` function |
| 5.4 | `hooks/usePayroll.ts` | Add `calculateSalary` helper function |
| 5.5 | `hooks/usePayroll.ts` | Add `getPayslipsByEmployee` function |
| 5.6 | `hooks/usePayroll.ts` | Add `updatePayslipStatus` function |
| 5.7 | `app/(dashboard)/hrms/payroll/page.tsx` | Remove hardcoded `data` array |
| 5.8 | `app/(dashboard)/hrms/payroll/page.tsx` | Import and use `usePayroll` hook |
| 5.9 | `components/phaseC/RunPayrollDialog.tsx` | Create dialog for payroll cycle creation |
| 5.10 | `components/phaseC/PayslipDetailDialog.tsx` | Create payslip detail view |
| 5.11 | `app/(dashboard)/hrms/payroll/page.tsx` | Wire "Run Payroll Cycle" button |

**Verification:** Create payroll cycle, generate payslips, verify calculations.

---

### Stage 6: Indents Module

**Duration:** Day 4-5

| Task | File | Description |
|------|------|-------------|
| 6.1 | `hooks/useIndents.ts` | Create hook connecting to existing `indents` table |
| 6.2 | `hooks/useIndents.ts` | Add `createIndent` with items |
| 6.3 | `hooks/useIndents.ts` | Add `submitForApproval` function |
| 6.4 | `hooks/useIndents.ts` | Add `approveIndent` function |
| 6.5 | `hooks/useIndents.ts` | Add `rejectIndent` function |
| 6.6 | `app/(dashboard)/inventory/indents/create/page.tsx` | Remove hardcoded `data` array |
| 6.7 | `app/(dashboard)/inventory/indents/create/page.tsx` | Import and use `useIndents` hook |
| 6.8 | `components/phaseC/CreateIndentForm.tsx` | Create multi-item indent form |
| 6.9 | `components/phaseC/ApproveIndentDialog.tsx` | Create approval action dialog |
| 6.10 | `app/(dashboard)/inventory/indents/page.tsx` | Create indent list page if missing |

**Verification:** Create indent, submit for approval, approve, verify status change.

---

### Stage 7: Purchase Orders Module

**Duration:** Day 5-6

| Task | File | Description |
|------|------|-------------|
| 7.1 | `hooks/usePurchaseOrders.ts` | Create hook connecting to existing `purchase_orders` table |
| 7.2 | `hooks/usePurchaseOrders.ts` | Add `createPOFromIndent` function |
| 7.3 | `hooks/usePurchaseOrders.ts` | Add `updatePOStatus` function |
| 7.4 | `hooks/usePurchaseOrders.ts` | Add `getPOWithItems` function |
| 7.5 | `app/(dashboard)/inventory/purchase-orders/page.tsx` | Remove hardcoded `data` array |
| 7.6 | `app/(dashboard)/inventory/purchase-orders/page.tsx` | Import and use `usePurchaseOrders` hook |
| 7.7 | `components/phaseC/CreatePODialog.tsx` | Create PO from approved indent |
| 7.8 | `components/phaseC/POStatusUpdateDialog.tsx` | Create status update dialog |

**Verification:** Create PO from indent, update status through workflow.

---

### Stage 8: GRN Module

**Duration:** Day 6

| Task | File | Description |
|------|------|-------------|
| 8.1 | `hooks/useGRN.ts` | Create hook connecting to `material_receipts` table |
| 8.2 | `hooks/useGRN.ts` | Add `createGRN` function |
| 8.3 | `hooks/useGRN.ts` | Add `recordItemReceipt` function |
| 8.4 | `hooks/useGRN.ts` | Add quantity validation against PO |
| 8.5 | `components/phaseC/CreateGRNDialog.tsx` | Create GRN entry form |
| 8.6 | `components/phaseC/GRNItemsTable.tsx` | Create items receipt table |

**Verification:** Create GRN against PO, verify quantities recorded.

---

### Stage 9: Supplier Bills Module

**Duration:** Day 6-7

| Task | File | Description |
|------|------|-------------|
| 9.1 | `hooks/useSupplierBills.ts` | Create hook connecting to `purchase_bills` table |
| 9.2 | `hooks/useSupplierBills.ts` | Add CRUD operations |
| 9.3 | `hooks/useSupplierBills.ts` | Add `recordPayment` function |
| 9.4 | `app/(dashboard)/finance/supplier-bills/page.tsx` | Add real data connection |
| 9.5 | `components/phaseC/RecordBillDialog.tsx` | Create bill entry dialog |
| 9.6 | `components/phaseC/RecordPaymentDialog.tsx` | Create payment dialog |

**Verification:** Record bill, link to PO/GRN, record payment.

---

### Stage 10: Buyer Invoices Module

**Duration:** Day 7

| Task | File | Description |
|------|------|-------------|
| 10.1 | `hooks/useBuyerInvoices.ts` | Create hook connecting to `sale_bills` table |
| 10.2 | `hooks/useBuyerInvoices.ts` | Add CRUD operations |
| 10.3 | `hooks/useBuyerInvoices.ts` | Add `generateInvoice` function |
| 10.4 | `app/(dashboard)/finance/buyer-invoices/page.tsx` | Add real data connection |
| 10.5 | `components/phaseC/CreateInvoiceDialog.tsx` | Create invoice entry dialog |

**Verification:** Create invoice, verify in database.

---

### Stage 11: Reconciliation Module

**Duration:** Day 7-8

| Task | File | Description |
|------|------|-------------|
| 11.1 | `hooks/useReconciliation.ts` | Create hook for `reconciliations` table |
| 11.2 | `hooks/useReconciliation.ts` | Add `createReconciliation` function |
| 11.3 | `hooks/useReconciliation.ts` | Add `calculateVariance` helper |
| 11.4 | `hooks/useReconciliation.ts` | Add `resolveDiscrepancy` function |
| 11.5 | `app/(dashboard)/finance/reconciliation/page.tsx` | Remove hardcoded `data` array |
| 11.6 | `app/(dashboard)/finance/reconciliation/page.tsx` | Import and use `useReconciliation` hook |
| 11.7 | `components/phaseC/ReconcileDialog.tsx` | Create three-way match dialog |
| 11.8 | `components/phaseC/ResolveDiscrepancyDialog.tsx` | Create resolution dialog |

**Verification:** Match bill/PO/GRN, verify variance calculation, resolve discrepancy.

---

### Stage 12: Products Hook Update

**Duration:** Day 8

| Task | File | Description |
|------|------|-------------|
| 12.1 | `hooks/useProducts.ts` | Remove `MOCK_PRODUCTS` array |
| 12.2 | `hooks/useProducts.ts` | Remove mock fallback logic |
| 12.3 | `hooks/useProducts.ts` | Ensure connection to `products` table |
| 12.4 | `hooks/useProducts.ts` | Remove `isUsingMockData` flag |

**Verification:** Products page displays data from database only.

---

### Stage 13: Integration Testing

**Duration:** Day 8

| Task | Description |
|------|-------------|
| 13.1 | Test recruitment workflow: Create → Interview → BGV → Offer → Hire |
| 13.2 | Test document workflow: Upload → Review → Verify |
| 13.3 | Test payroll workflow: Create Cycle → Generate Payslips → Approve |
| 13.4 | Test procurement workflow: Indent → Approve → PO → GRN → Bill |
| 13.5 | Test reconciliation workflow: Match → Identify Variance → Resolve |
| 13.6 | Verify all Phase A/B features still work |
| 13.7 | Verify RLS policies restrict access correctly |

---

## File Creation Summary

### New Files

| Type | Count | Files |
|------|-------|-------|
| SQL | 2 | `schema_phaseC.sql`, `storage_setup.sql` |
| Hooks | 10 | `useCandidates.ts`, `usePayroll.ts`, `useEmployeeDocuments.ts`, `useIndents.ts`, `usePurchaseOrders.ts`, `useGRN.ts`, `useSupplierBills.ts`, `useBuyerInvoices.ts`, `useReconciliation.ts`, (update `useProducts.ts`) |
| Components | 15 | Various dialogs and forms in `components/phaseC/` |

### Modified Files

| File | Change |
|------|--------|
| `hrms/recruitment/page.tsx` | Remove mock, add hook |
| `hrms/payroll/page.tsx` | Remove mock, add hook |
| `hrms/documents/page.tsx` | Remove mock, add hook |
| `inventory/indents/create/page.tsx` | Remove mock, add hook |
| `inventory/purchase-orders/page.tsx` | Remove mock, add hook |
| `finance/reconciliation/page.tsx` | Remove mock, add hook |
| `finance/supplier-bills/page.tsx` | Add hook connection |
| `finance/buyer-invoices/page.tsx` | Add hook connection |
| `hooks/useProducts.ts` | Remove mock fallback |

## Dependencies

### Build Order Constraints

```
schema_phaseC.sql
    └── storage_setup.sql
        └── All hooks (parallel)
            └── All page updates (parallel)
                └── Integration testing
```

### Cross-Hook Dependencies

| Hook | Depends On |
|------|------------|
| `usePayroll.ts` | `useAttendance.ts` (existing) |
| `usePurchaseOrders.ts` | `useIndents.ts` |
| `useGRN.ts` | `usePurchaseOrders.ts` |
| `useSupplierBills.ts` | `usePurchaseOrders.ts`, `useGRN.ts` |
| `useReconciliation.ts` | `useSupplierBills.ts`, `usePurchaseOrders.ts`, `useGRN.ts` |

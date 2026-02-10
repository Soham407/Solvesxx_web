# PHASE C CONTRACT — Stabilization & De-Mocking

## Scope Definition

Phase C replaces all mock/hardcoded data in the application with real database connections and functional CRUD operations.

## In Scope

### 1. Schema Additions (5 Tables)

| Table | Purpose |
|-------|---------|
| `candidates` | Recruitment applicant tracking |
| `payroll_cycles` | Monthly payroll run management |
| `payslips` | Individual employee salary records |
| `employee_documents` | Compliance document storage |
| `reconciliations` | Three-way Bill/PO/GRN matching |

### 2. New Hooks (10 Hooks)

| Hook | Connects To |
|------|-------------|
| `useCandidates.ts` | `candidates` |
| `usePayroll.ts` | `payroll_cycles`, `payslips` |
| `useEmployeeDocuments.ts` | `employee_documents` |
| `useIndents.ts` | `indents`, `indent_items` |
| `usePurchaseOrders.ts` | `purchase_orders`, `purchase_order_items` |
| `useGRN.ts` | `material_receipts`, `material_receipt_items` |
| `useSupplierBills.ts` | `purchase_bills` |
| `useBuyerInvoices.ts` | `sale_bills`, `sale_bill_items` |
| `useReconciliation.ts` | `reconciliations` |
| `useProductsReal.ts` | `products`, `product_categories` (replace mock) |

### 3. Page Updates (8 Pages)

| Page | Change |
|------|--------|
| `hrms/recruitment/page.tsx` | Replace hardcoded `data` array with `useCandidates()` |
| `hrms/payroll/page.tsx` | Replace hardcoded `data` array with `usePayroll()` |
| `hrms/documents/page.tsx` | Replace hardcoded `data` array with `useEmployeeDocuments()` |
| `inventory/indents/create/page.tsx` | Replace hardcoded `data` array with `useIndents()` |
| `inventory/purchase-orders/page.tsx` | Replace hardcoded `data` array with `usePurchaseOrders()` |
| `finance/reconciliation/page.tsx` | Replace hardcoded `data` array with `useReconciliation()` |
| `finance/supplier-bills/page.tsx` | Add CRUD with `useSupplierBills()` |
| `finance/buyer-invoices/page.tsx` | Add CRUD with `useBuyerInvoices()` |

### 4. Storage Configuration

| Bucket | Purpose |
|--------|---------|
| `employee-documents` | Store uploaded compliance documents |

## Out of Scope

- Automated alerts (Edge Functions for inactivity, expiry)
- Supplier self-service portal
- Payment gateway integration
- PDF payslip generation
- Email/SMS notifications
- Multi-level approval workflows beyond HOD
- External BGV integration
- Automated reconciliation suggestions

## Business Rules

### Recruitment

- Admin-only candidate entry (no public portal)
- Status flow: `screening` → `interviewing` → `background_check` → `offered` → `hired`
- BGV status tracked but verification is manual
- Convert to employee creates `employees` record and links `converted_employee_id`

### Payroll

- Calculation: `(basic_salary × present_days / total_working_days) + overtime + allowances - deductions`
- Deductions: PF (12%), PT (state-wise), ESIC (0.75%)
- Payroll cycle must be in `draft` status to edit payslips
- Once `completed`, cycle is immutable

### Employee Documents

- Document types: Aadhar, PAN, Voter ID, PSARA License, Police Verification, Medical Fitness
- Verification is internal only (Admin marks as Verified/Rejected)
- Expiry date tracking for alerts (display only, no automation)
- File size limit: 10MB
- Allowed formats: PDF, JPEG, PNG

### Indents

- HOD approval required before PO generation
- Status flow: `draft` → `pending_approval` → `approved` → `po_created`
- Rejected indents require `rejection_reason`
- Indent number auto-generated: `IND-YYYY-NNNN`

### Purchase Orders

- Created from approved indent via `indent_forward_id`
- Status flow: `draft` → `sent_to_vendor` → `po_received` → `po_dispatched` → `material_received`
- Admin updates supplier responses (no supplier portal)
- PO number auto-generated: `PO-YYYY-NNNN`

### Goods Received Notes (Material Receipts)

- Created when goods arrive against a PO
- Track `received_quantity` vs `ordered_quantity`
- Quality status: `good`, `damaged`, `partial`
- Shortage auto-calculated
- GRN number auto-generated: `GRN-YYYY-NNNN`

### Supplier Bills

- Linked to PO and GRN
- Payment status: `unpaid` → `partial` → `paid`
- `paid_amount` tracks partial payments

### Buyer Invoices

- Generated for completed orders
- Invoice number auto-generated: `INV-YYYY-NNNN`
- Payment tracking same as supplier bills

### Reconciliation

- Manual three-way matching: Bill vs PO vs GRN
- User selects documents to reconcile
- Variance calculated automatically
- Status: `pending` → `matched` (if variance = 0) or `discrepancy`
- Discrepancies require manual resolution with notes

## Data Ownership

| Entity | Owner Role |
|--------|------------|
| Candidates | `admin`, `company_hod` |
| Payroll | `admin`, `company_hod`, `account` |
| Employee Documents | `admin`, `company_hod` (view own for employees) |
| Indents | `admin`, `company_hod`, `account` |
| Purchase Orders | `admin`, `company_hod`, `account` |
| Material Receipts | `admin`, `company_hod`, `account` |
| Bills & Invoices | `admin`, `company_hod`, `account` |
| Reconciliations | `admin`, `company_hod`, `account` |

## Success Criteria

1. All 8 pages display data from database (no hardcoded arrays)
2. CRUD operations work for all new tables
3. Status transitions enforce business rules
4. Document upload stores files in Supabase storage
5. Payroll calculation produces correct net payable
6. Reconciliation shows variance between matched documents
7. All existing Phase A/B functionality remains working

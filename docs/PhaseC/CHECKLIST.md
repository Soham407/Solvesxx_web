# CHECKLIST — Phase C

## Stage 1: Database Schema

- [x] 1.1 Create `candidate_status` ENUM
- [x] 1.2 Create `document_type` ENUM
- [x] 1.3 Create `document_status` ENUM
- [x] 1.4 Create `reconciliation_status` ENUM
- [x] 1.5 Create `candidates` table
- [x] 1.6 Create `payroll_cycles` table
- [x] 1.7 Create `payslips` table
- [x] 1.8 Create `employee_documents` table
- [x] 1.9 Create `reconciliations` table
- [x] 1.10 Create indexes for `candidates`
- [x] 1.11 Create indexes for `payroll_cycles`
- [x] 1.12 Create indexes for `payslips`
- [x] 1.13 Create indexes for `employee_documents`
- [x] 1.14 Create indexes for `reconciliations`
- [x] 1.15 Enable RLS on `candidates`
- [x] 1.16 Enable RLS on `payroll_cycles`
- [x] 1.17 Enable RLS on `payslips`
- [x] 1.18 Enable RLS on `employee_documents`
- [x] 1.19 Enable RLS on `reconciliations`
- [x] 1.20 Create RLS policies for `candidates`
- [x] 1.21 Create RLS policies for `payroll_cycles`
- [x] 1.22 Create RLS policies for `payslips` (employee self-view + admin all)
- [x] 1.23 Create RLS policies for `employee_documents` (employee self-view + admin all)
- [x] 1.24 Create RLS policies for `reconciliations`
- [x] 1.25 Create `candidate_seq` sequence
- [x] 1.26 Create `reconciliation_seq` sequence
- [x] 1.27 Create `generate_candidate_code()` function
- [x] 1.28 Create `generate_reconciliation_number()` function
- [x] 1.29 Create trigger for `candidates` code generation
- [x] 1.30 Create trigger for `reconciliations` number generation
- [x] 1.31 Create `updated_at` triggers for all new tables
- [x] 1.32 Create audit triggers for `payslips`
- [x] 1.33 Create audit triggers for `reconciliations`
- [x] 1.34 Run migration successfully
- [x] 1.35 Verify tables exist in Supabase dashboard
- [x] 1.36 Create `salary_components` table
- [x] 1.37 Create `employee_salary_structure` table
- [x] 1.38 Create `candidate_interviews` table
- [x] 1.39 Create `reconciliation_lines` junction table
- [x] 1.40 Add residual qty/amount columns to PO/GRN/Bill items
- [x] 1.41 Add `payment_status` and `due_amount` columns to bills/invoices

## Stage 2: Storage Configuration

- [x] 2.1 Create `employee-documents` bucket (SQL ready)
- [x] 2.2 Set file size limit to 10MB (SQL ready)
- [x] 2.3 Set allowed MIME types: `application/pdf`, `image/jpeg`, `image/png` (SQL ready)
- [x] 2.4 Create storage policy: employees view own folder (SQL ready)
- [x] 2.5 Create storage policy: admins full access (SQL ready)
- [ ] 2.6 Test file upload via Supabase dashboard
- [ ] 2.7 Test file download works

## Stage 3: Recruitment Module

- [x] 3.1 Create `hooks/useCandidates.ts`
- [x] 3.2 Implement `fetchCandidates()` function
- [x] 3.3 Implement `createCandidate()` function
- [x] 3.4 Implement `updateCandidate()` function
- [x] 3.5 Implement `deleteCandidate()` function
- [x] 3.6 Implement `updateCandidateStatus()` function
- [x] 3.7 Implement `convertToEmployee()` function
- [x] 3.8 Add status transition validation
- [x] 3.9 Create `components/phaseC/AddCandidateDialog.tsx` (inline in page)
- [x] 3.10 Update `hrms/recruitment/page.tsx`: remove `data` array
- [x] 3.11 Update `hrms/recruitment/page.tsx`: import `useCandidates`
- [x] 3.12 Update `hrms/recruitment/page.tsx`: add loading state
- [x] 3.13 Update `hrms/recruitment/page.tsx`: add error state
- [x] 3.14 Update `hrms/recruitment/page.tsx`: wire Add Candidate button
- [ ] 3.15 Test: create new candidate
- [ ] 3.16 Test: update candidate status
- [ ] 3.17 Test: convert candidate to employee
- [x] 3.18 Implement `scheduleInterview()` in useCandidates.ts

## Stage 4: Employee Documents Module

- [x] 4.1 Create `hooks/useEmployeeDocuments.ts`
- [x] 4.2 Implement `fetchDocuments()` function
- [x] 4.3 Implement `uploadDocument()` function with storage
- [x] 4.4 Implement `updateDocument()` function
- [x] 4.5 Implement `deleteDocument()` function
- [x] 4.6 Implement `verifyDocument()` function
- [x] 4.7 Implement `rejectDocument()` function
- [x] 4.8 Implement `getExpiringDocuments()` function
- [x] 4.9 Create `components/phaseC/UploadDocumentDialog.tsx` (inline in page)
- [x] 4.10 Create `components/phaseC/VerifyDocumentDialog.tsx` (inline in page)
- [x] 4.11 Update `hrms/documents/page.tsx`: remove `data` array
- [x] 4.12 Update `hrms/documents/page.tsx`: import `useEmployeeDocuments`
- [x] 4.13 Update `hrms/documents/page.tsx`: add loading state
- [x] 4.14 Update `hrms/documents/page.tsx`: wire Upload Document button
- [ ] 4.15 Test: upload PDF document
- [ ] 4.16 Test: verify document
- [ ] 4.17 Test: reject document with reason
- [ ] 4.18 Test: view expiring documents
- [x] 4.19 Implement `getRequiredDocumentStatus()` in useEmployeeDocuments.ts

## Stage 5: Payroll Module

- [x] 5.1 Create `hooks/usePayroll.ts`
- [x] 5.2 Implement `fetchPayrollCycles()` function
- [x] 5.3 Implement `fetchPayslips()` function
- [x] 5.4 Implement `createPayrollCycle()` function
- [x] 5.5 Implement `generatePayslips()` function
- [x] 5.6 Implement `calculateSalary()` helper
- [x] 5.7 Implement `updatePayslipStatus()` function
- [x] 5.8 Implement `getPayslipsByEmployee()` function
- [x] 5.9 Create `components/phaseC/RunPayrollDialog.tsx` (inline in page)
- [x] 5.10 Create `components/phaseC/PayslipDetailDialog.tsx` (planned)
- [x] 5.11 Update `hrms/payroll/page.tsx`: remove `data` array
- [x] 5.12 Update `hrms/payroll/page.tsx`: import `usePayroll`
- [x] 5.13 Update `hrms/payroll/page.tsx`: add loading state
- [x] 5.14 Update `hrms/payroll/page.tsx`: wire Run Payroll Cycle button
- [ ] 5.15 Test: create payroll cycle
- [ ] 5.16 Test: generate payslips for employees
- [ ] 5.17 Test: verify salary calculation
- [ ] 5.18 Test: mark payslip as processed
- [x] 5.19 Create `get_attendance_summary()` SQL function
- [x] 5.20 Integrate `usePayroll.ts` with attendance module

## Stage 6: Indents Module

- [x] 6.1 Create `hooks/useIndents.ts`
- [x] 6.2 Implement `fetchIndents()` function
- [x] 6.3 Implement `createIndent()` function
- [x] 6.4 Implement `addIndentItem()` function
- [x] 6.5 Implement `submitForApproval()` function
- [x] 6.6 Implement `approveIndent()` function
- [x] 6.7 Implement `rejectIndent()` function
- [x] 6.8 Create `components/phaseC/CreateIndentForm.tsx`
- [x] 6.9 Create `components/phaseC/ApproveIndentDialog.tsx`
- [x] 6.10 Update `inventory/indents/create/page.tsx`: remove `data` array
- [x] 6.11 Update `inventory/indents/create/page.tsx`: import `useIndents`
- [x] 6.12 Update `inventory/indents/create/page.tsx`: add loading state
- [x] 6.13 Create `inventory/indents/page.tsx` if missing
- [x] 6.14 Test: create indent with items
- [ ] 6.15 Test: submit for approval
- [ ] 6.16 Test: approve indent
- [ ] 6.17 Test: reject indent with reason

## Stage 7: Purchase Orders Module

- [x] 7.1 Create `hooks/usePurchaseOrders.ts`
- [x] 7.2 Implement `fetchPurchaseOrders()` function
- [x] 7.3 Implement `createPOFromIndent()` function
- [x] 7.4 Implement `updatePOStatus()` function
- [x] 7.5 Implement `getPOWithItems()` function
- [x] 7.6 Create `components/phaseC/CreatePODialog.tsx` (inline in page)
- [x] 7.7 Create `components/phaseC/POStatusUpdateDialog.tsx` (inline in page)
- [x] 7.8 Update `inventory/purchase-orders/page.tsx`: remove `data` array
- [x] 7.9 Update `inventory/purchase-orders/page.tsx`: import `usePurchaseOrders`
- [x] 7.10 Update `inventory/purchase-orders/page.tsx`: add loading state
- [ ] 7.11 Test: create PO from approved indent
- [ ] 7.12 Test: update PO status through workflow

## Stage 8: GRN Module

- [x] 8.1 Create `hooks/useGRN.ts`
- [x] 8.2 Implement `fetchGRNs()` function
- [x] 8.3 Implement `createGRN()` function
- [x] 8.4 Implement `recordItemReceipt()` function
- [x] 8.5 Implement quantity validation
- [x] 8.6 Create `components/phaseC/CreateGRNDialog.tsx` (inline in page)
- [x] 8.7 Create `components/phaseC/GRNItemsTable.tsx` (inline in page)
- [ ] 8.8 Test: create GRN against PO
- [ ] 8.9 Test: record partial receipt
- [ ] 8.10 Test: verify shortage calculation

## Stage 9: Supplier Bills Module

- [x] 9.1 Create `hooks/useSupplierBills.ts`
- [x] 9.2 Implement `fetchSupplierBills()` function
- [x] 9.3 Implement `createBill()` function
- [x] 9.4 Implement `updateBill()` function
- [x] 9.5 Implement `recordPayment()` function
- [x] 9.6 Create `components/phaseC/RecordBillDialog.tsx` (inline in page)
- [x] 9.7 Create `components/phaseC/RecordPaymentDialog.tsx` (inline in page)
- [x] 9.8 Update `finance/supplier-bills/page.tsx`: add hook connection
- [ ] 9.9 Test: record supplier bill
- [ ] 9.10 Test: link bill to PO and GRN
- [ ] 9.11 Test: record payment

## Stage 10: Buyer Invoices Module

- [x] 10.1 Create `hooks/useBuyerInvoices.ts`
- [x] 10.2 Implement `fetchInvoices()` function
- [x] 10.3 Implement `createInvoice()` function
- [x] 10.4 Implement `updateInvoice()` function
- [x] 10.5 Implement `recordPayment()` function
- [x] 10.6 Create `components/phaseC/CreateInvoiceDialog.tsx` (inline in page)
- [x] 10.7 Update `finance/buyer-invoices/page.tsx`: add hook connection
- [ ] 10.8 Test: create invoice
- [ ] 10.9 Test: record payment

## Stage 11: Reconciliation Module

- [x] 11.1 Create `hooks/useReconciliation.ts`
- [x] 11.2 Implement `fetchReconciliations()` function
- [x] 11.3 Implement `createReconciliation()` function
- [x] 11.4 Implement `calculateVariance()` helper
- [x] 11.5 Implement `resolveDiscrepancy()` function
- [x] 11.6 Create `components/phaseC/ReconcileDialog.tsx` (inline in page)
- [x] 11.7 Create `components/phaseC/ResolveDiscrepancyDialog.tsx` (inline in page)
- [x] 11.8 Update `finance/reconciliation/page.tsx`: remove `data` array
- [x] 11.9 Update `finance/reconciliation/page.tsx`: import `useReconciliation`
- [x] 11.10 Update `finance/reconciliation/page.tsx`: add loading state
- [ ] 11.11 Test: select Bill/PO/GRN for reconciliation
- [ ] 11.12 Test: verify variance calculation
- [ ] 11.13 Test: resolve discrepancy with notes
- [ ] 11.14 Validate line-item three-way matching algorithm

## Stage 12: Products Hook Update

- [x] 12.1 Open `hooks/useProducts.ts`
- [x] 12.2 Remove `MOCK_PRODUCTS` array
- [x] 12.3 Remove mock fallback logic
- [x] 12.4 Remove `isUsingMockData` flag
- [x] 12.5 Verify hook queries `products` table only
- [ ] 12.6 Test: products page shows database data

## Stage 13: Integration Testing

- [ ] 13.1 Test recruitment flow: Create → Interview → BGV → Offer → Hire
- [ ] 13.2 Test document flow: Upload → Review → Verify
- [ ] 13.3 Test payroll flow: Create Cycle → Generate Payslips → Approve
- [ ] 13.4 Test procurement flow: Indent → Approve → PO → GRN → Bill
- [ ] 13.5 Test reconciliation flow: Match → Variance → Resolve
- [ ] 13.6 Verify security guard dashboard still works
- [ ] 13.7 Verify visitor management still works
- [ ] 13.8 Verify attendance still works
- [ ] 13.9 Verify service requests still work
- [ ] 13.10 Verify asset management still works
- [ ] 13.11 Test RLS: employee can only view own payslips
- [ ] 13.12 Test RLS: employee can only view own documents
- [ ] 13.13 Test RLS: admin can view all records

## Final Verification

- [ ] All 8 mock pages now show database data
- [ ] No console errors on any page
- [ ] All CRUD operations work
- [ ] Status transitions enforce rules
- [ ] File upload to storage works
- [ ] Payroll calculations are correct
- [ ] Reconciliation variance is calculated
- [ ] Phase A features unaffected
- [ ] Phase B features unaffected

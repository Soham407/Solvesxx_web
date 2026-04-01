import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("finance module contracts", () => {
  it("keeps the bill approval, GRN-link, sequence, and payment-status guards intact", async () => {
    const supplierBillsSource = await readRepoFile("hooks/useSupplierBills.ts");
    const supplierPortalSource = await readRepoFile("hooks/useSupplierPortal.ts");
    const financeSource = await readRepoFile("hooks/useFinance.ts");

    expect(
      sourceContainsAll(supplierBillsSource, [
        "Bill must be linked to an accepted GRN before approval.",
        "Bill must complete 3-way match before approval.",
        "Cannot generate a bill without an accepted GRN linked to the PO.",
        "return createBillFromGRN(resolvedGRN.id, options);",
        "Failed to generate bill number from the database sequence.",
        "refresh: fetchSupplierBills",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierPortalSource, [
        "const { bill_number: _discardedBillNumber, ...billPayload } = billData;",
        "Bill submission requires an accepted GRN linked to the PO.",
        "material_receipt_id: acceptedGRNs[0].id",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(financeSource, [
        'const isGatewayPayment = selectedMethod.gateway !== "manual";',
        "status: paymentStatus",
        "const newStatus = newDueAmount === 0 ? 'paid' : 'partial';",
        "result?.can_pay ?? result?.is_valid ?? false",
      ])
    ).toBe(true);
  });

  it("keeps finance UI on live data and removes fake gateway success messaging", async () => {
    const supplierBillsPageSource = await readRepoFile(
      "app/(dashboard)/finance/supplier-bills/page.tsx"
    );
    const buyerInvoicesPageSource = await readRepoFile(
      "app/(dashboard)/finance/buyer-invoices/page.tsx"
    );
    const reconciliationPageSource = await readRepoFile(
      "app/(dashboard)/finance/reconciliation/page.tsx"
    );

    expect(
      sourceContainsAll(supplierBillsPageSource, [
        "const displayBills = bills || [];",
        "Mock rows are disabled to avoid invalid payouts.",
        'method.gateway === "manual"',
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(supplierBillsPageSource, ["const mockBills", "? mockBills : bills"])
    ).toBe(true);

    expect(
      sourceContainsAll(buyerInvoicesPageSource, [
        "Online checkout is not configured in this environment.",
        "No payment was initiated for Invoice",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(buyerInvoicesPageSource, [
        "window.confirm(`Initiating Razorpay checkout",
        'alert("Gateway initialization successful.',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(reconciliationPageSource, [
        "const handleAutoSync = async () => {",
        "const result = await autoSyncReconciliations();",
        "Trigger Auto-Sync",
      ])
    ).toBe(true);
  });

  it("keeps the SQL truth patch for payout validation, reconciliation lock sync, and closure triggers", async () => {
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260330000005_fin_001_finance_module_hardening.sql"
    );

    expect(
      sourceContainsAll(migrationSource, [
        "validate_bill_for_payout",
        "purchase_order_id",
        "material_receipt_id",
        "material_receipts",
        "sync_purchase_bill_match_status_from_reconciliation",
        "trigger_sync_purchase_bill_match_status",
        "trigger_check_purchase_bills_closure",
        "trigger_check_sale_bills_closure",
        "trigger_check_payments_closure",
        "trigger_check_ledger_entries_closure",
      ])
    ).toBe(true);
  });
});

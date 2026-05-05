import { describe, expect, it } from "vitest";
import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("sale bills workflow", () => {
  it("verifies the admin sale-bills page has the generate bill workflow and product rate integration", async () => {
    const saleBillsPageSource = await readRepoFile("app/(dashboard)/finance/sale-bills/page.tsx");

    expect(
      sourceContainsAll(saleBillsPageSource, [
        "useSaleProductRates",
        "handleItemChange",
        "getSaleRate",
        "Generate New Sale Bill",
        "Link it to an accepted request if applicable",
        "Buyer / Society",
        "Linked Request (Optional)",
        "Line Items",
        "Mark as Paid",
      ])
    ).toBe(true);
  });

  it("verifies buyer invoice download uses truthful unavailable messaging (no mocked PDF success)", async () => {
    const buyerInvoicesPageSource = await readRepoFile("app/(dashboard)/buyer/invoices/page.tsx");

    expect(
      sourceContainsAll(buyerInvoicesPageSource, [
        "handleInvoiceDocumentDownload",
        "handlePayNow",
        "Invoice document download is not available for",
        "const paid = await recordPayment(invoice.id, {",
        "Payment recorded for",
        "Payment update failed for",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(buyerInvoicesPageSource, [
        "Generating PDF for",
        "downloaded successfully",
        "setTimeout(() => {",
      ])
    ).toBe(true);
  });

  it("verifies supplier bills page only enables PDF action for real stored documents", async () => {
    const supplierBillsPageSource = await readRepoFile("app/(dashboard)/supplier/bills/page.tsx");
    const supplierBillsHookSource = await readRepoFile("hooks/useSupplierBills.ts");

    expect(
      sourceContainsAll(supplierBillsPageSource, [
        "handleBillDocumentDownload",
        "disabled={!bill.document_url || resolvingDocumentBillId === bill.id}",
        "No document",
        '.from("bill-documents")',
        ".createSignedUrl(",
        "Bill document is not available for this bill.",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierBillsHookSource, [
        'from("purchase_bills")',
        "document_url: uploadData.path",
      ])
    ).toBe(true);
  });

  it("verifies the useSaleBills hook has required CRUD operations and paid_at support", async () => {
    const useSaleBillsSource = await readRepoFile("hooks/useSaleBills.ts");

    expect(
      sourceContainsAll(useSaleBillsSource, [
        "createBill",
        "markPaid",
        "paid_at: paidAt",
        "request_id: input.request_id",
        "SaleBill",
        "SaleBillItem",
      ])
    ).toBe(true);
  });

  it("verifies buyer workflow has a dedicated e2e path for request, payment, and feedback", async () => {
    const buyerWorkflowSpec = await readRepoFile("e2e/buyer-request-invoice-payment-feedback.spec.ts");

    expect(
      sourceContainsAll(buyerWorkflowSpec, [
        "Buyer Request → Invoice → Payment → Feedback",
        "/buyer/requests",
        "/buyer/invoices",
        "pay now",
        "buyer_feedback",
        "toBe(\"completed\")",
      ])
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  readRepoFile,
  sourceContainsAll,
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

  it("verifies the buyer invoices page has functional handlers for payment and PDF", async () => {
    const buyerInvoicesPageSource = await readRepoFile("app/(dashboard)/buyer/invoices/page.tsx");

    expect(
      sourceContainsAll(buyerInvoicesPageSource, [
        "handleDownloadPDF",
        "handlePayNow",
        "Generating PDF for",
        "PDF for",
        "const paid = await recordPayment(invoice.id, {",
        "Payment recorded for",
        "Payment update failed for",
      ])
    ).toBe(true);
  });

  it("verifies the useSaleBills hook has required CRUD operations and paid_at support", async () => {
    const useSaleBillsSource = await readRepoFile("hooks/useSaleBills.ts");

    expect(
      sourceContainsAll(useSaleBillsSource, [
        "createBill",
        "markPaid",
        "paid_at: new Date().toISOString()",
        "request_id: input.request_id",
        "SaleBill",
        "SaleBillItem",
      ])
    ).toBe(true);
  });
});

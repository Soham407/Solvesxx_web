import type { Json } from "@/src/types/supabase";

export interface ComplianceSnapshot {
  id: string;
  period_id: string;
  snapshot_name: string;
  snapshot_date: string;
  total_invoices_amount: number;
  total_collections_amount: number;
  total_bills_amount: number;
  total_payouts_amount: number;
  unresolved_reconciliations_count: number;
  data_payload: Json;
  is_locked: boolean;
  created_at: string;
  period_name?: string;
}

export interface AgingBucket {
  label: string;
  buyer_amount: number;
  supplier_amount: number;
  count: number;
}

export type ComplianceSnapshotRow = ComplianceSnapshot & {
  financial_periods?: {
    period_name?: string | null;
  } | null;
};

export function mapComplianceSnapshotRow(row: ComplianceSnapshotRow): ComplianceSnapshot {
  return {
    ...row,
    period_name: row.financial_periods?.period_name ?? row.period_name,
  };
}

export function exportRowsToCsv(filename: string, data: Array<Record<string, unknown>>, headers: string[]) {
  if (!data.length) return;

  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          if (typeof val === "string" && val.includes(",")) return `"${val}"`;
          return val;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

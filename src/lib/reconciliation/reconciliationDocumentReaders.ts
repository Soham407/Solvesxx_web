import { supabase } from "@/src/lib/supabaseClient";
import type { DocumentItemRow } from "@/src/lib/reconciliation/reconciliationTransforms";

type DocumentType = "po" | "grn" | "bill";

export async function fetchDocumentItems(documentType: DocumentType, parentId: string): Promise<DocumentItemRow[]> {
  if (documentType === "po") {
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        products!product_id (
          product_name,
          product_code
        )
      `)
      .eq("purchase_order_id", parentId);

    if (error) throw error;
    return (data || []) as DocumentItemRow[];
  }

  if (documentType === "grn") {
    const { data, error } = await supabase
      .from("material_receipt_items")
      .select(`
        *,
        products!product_id (
          product_name,
          product_code
        )
      `)
      .eq("material_receipt_id", parentId);

    if (error) throw error;
    return (data || []) as DocumentItemRow[];
  }

  const { data, error } = await supabase
    .from("purchase_bill_items")
    .select(`
      *,
      products!product_id (
        product_name,
        product_code
      )
    `)
    .eq("purchase_bill_id", parentId);

  if (error) throw error;
  return (data || []) as DocumentItemRow[];
}

export async function fetchUnmatchedItems(documentType: DocumentType): Promise<DocumentItemRow[]> {
  if (documentType === "po") {
    const { data, error } = await supabase.from("purchase_order_items").select("*").gt("unmatched_qty", 0);
    if (error) throw error;
    return (data || []) as DocumentItemRow[];
  }

  if (documentType === "grn") {
    const { data, error } = await supabase.from("material_receipt_items").select("*").gt("unmatched_qty", 0);
    if (error) throw error;
    return (data || []) as DocumentItemRow[];
  }

  const { data, error } = await supabase.from("purchase_bill_items").select("*").gt("unmatched_qty", 0);
  if (error) throw error;
  return (data || []) as DocumentItemRow[];
}
